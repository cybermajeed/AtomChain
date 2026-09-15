from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.responses import RedirectResponse, HTMLResponse
import httpx
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json

from database import get_db, Scan, Finding, TrustRecord
from scanner.github_client import GitHubAPIClient
from parsers.npm_parser import NpmParser
from parsers.python_parser import PythonParser
from intelligence.osv_client import OSVClient
from dependency.graph_builder import DependencyGraph
from risk.engine import RiskEngine
from trust.ledger import TrustLedger

app = FastAPI(title="Sustainverse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GitHubScanRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = None
    github_token: Optional[str] = None # Added for private repo access

class LocalScanRequest(BaseModel):
    directory_path: str

class ScanResponse(BaseModel):
    scan_id: int
    status: str
    message: str

@app.get("/")
def read_root():
    return {"status": "Sustainverse Backend is running"}

CLIENT_ID = "Ov23liyzvdyEoe4sTHP9"
CLIENT_SECRET = "b8e1f6f10285d8c53374bda313570a9a01254b5f"

@app.get("/api/auth/github/login")
def github_login():
    url = f"https://github.com/login/oauth/authorize?client_id={CLIENT_ID}&scope=repo"
    return RedirectResponse(url)

@app.get("/api/auth/callback")
def github_callback(code: str):
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code
    }
    
    with httpx.Client() as client:
        response = client.post(token_url, data=data, headers=headers)
        response_data = response.json()
        
    access_token = response_data.get("access_token", "")
    
    html_content = f"""
    <html>
        <head><title>Authenticating...</title></head>
        <body style="background-color: #0b0e11; color: #FCD535; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh;">
            <h2>Authentication successful! Closing...</h2>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{ type: 'oauth-token', token: '{access_token}' }}, '*');
                }}
                window.close();
            </script>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/api/scan/github", response_model=ScanResponse)
def scan_github(req: GitHubScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    new_scan = Scan(repository_url=req.repo_url, status="PENDING")
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)
    
    background_tasks.add_task(process_github_scan, new_scan.id, req.repo_url, req.branch, req.github_token)
    
    return {"scan_id": new_scan.id, "status": "PENDING", "message": "Scan initiated"}

@app.post("/api/scan/local", response_model=ScanResponse)
def scan_local(req: LocalScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    new_scan = Scan(repository_url=req.directory_path, status="PENDING")
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)
    
    background_tasks.add_task(process_local_scan, new_scan.id, req.directory_path)
    
    return {"scan_id": new_scan.id, "status": "PENDING", "message": "Local scan initiated"}

@app.get("/api/scan/{scan_id}")
def get_scan_result(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
    
    # Calculate overall score based on worst finding
    overall_score = 0
    level = "LOW"
    
    if findings:
        worst = max(findings, key=lambda f: f.risk_score or 0)
        overall_score = worst.risk_score
        
        if overall_score >= 90: level = "CRITICAL"
        elif overall_score >= 70: level = "HIGH"
        elif overall_score >= 40: level = "MEDIUM"
        
    return {
        "status": scan.status,
        "score": overall_score,
        "level": level,
        "dependencies": [
            {
                "finding_id": f.id,
                "id": f"{f.package_name}@{f.version}",
                "vulnerability_id": f.vulnerability_id,
                "risk": f.severity,
                "score": f.risk_score,
                "type": f.finding_type,
                "direct": True, # Simplified for now
                "insight": f.insight or "No insight available",
                "is_reviewed": bool(f.is_reviewed)
            } for f in findings
        ]
    }

@app.get("/api/ledger")
def get_ledger(db: Session = Depends(get_db)):
    records = db.query(TrustRecord).order_by(TrustRecord.id.desc()).all()
    result = []
    for r in records:
        scan = db.query(Scan).filter(Scan.id == r.scan_id).first()
        repo = scan.repository_url if scan else "Unknown"
        result.append({
            "id": r.id,
            "scan_id": r.scan_id,
            "repository": repo,
            "previous_hash": r.previous_hash,
            "record_hash": r.record_hash,
            "timestamp": r.timestamp.isoformat()
        })
    return result

@app.post("/api/ledger/verify")
def verify_ledger(db: Session = Depends(get_db)):
    ledger = TrustLedger(db)
    is_valid = ledger.verify_chain()
    return {"valid": is_valid}

@app.post("/api/findings/{finding_id}/review")
def review_finding(finding_id: int, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.is_reviewed = 1 if finding.is_reviewed == 0 else 0
    db.commit()
    return {"status": "success", "is_reviewed": bool(finding.is_reviewed)}

def process_github_scan(scan_id: int, repo_url: str, branch: Optional[str], github_token: Optional[str]):
    db = next(get_db())
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        return
        
    scan.status = "IN_PROGRESS"
    db.commit()
    
    gh_client = GitHubAPIClient(github_token)
    osv = OSVClient()
    risk_engine = RiskEngine()
    ledger = TrustLedger(db)
    
    try:
        # Parse owner and repo from URL
        parts = repo_url.rstrip('/').split('/')
        owner, repo_name = parts[-2], parts[-1]
        if repo_name.endswith('.git'): 
            repo_name = repo_name[:-4]
                
        # 1. Fetch metadata directly via API (bypassing git clone completely)
        package_lock = gh_client.get_file_content(owner, repo_name, "package-lock.json", branch)
        package_json = gh_client.get_file_content(owner, repo_name, "package.json", branch)
        
        deps = []
        if package_json or package_lock:
            # NPM Ecosystem
            npm_parser = NpmParser(package_json, package_lock)
            deps = npm_parser.parse()
        else:
            # Fallback to Python Ecosystem
            requirements_txt = gh_client.get_file_content(owner, repo_name, "requirements.txt", branch)
            if requirements_txt:
                python_parser = PythonParser(requirements_txt)
                deps = python_parser.parse()
            else:
                raise Exception("No package.json or requirements.txt found via API. Is this an NPM or Python project?")
        
        # 2. Query OSV and calculate risk (Batch Mode for massive speedup)
        high_risk_findings_count = 0
        
        # Batch fetch all vulnerabilities for all dependencies in one HTTP request
        batch_results = osv.query_batch(deps)
        
        for i, dep in enumerate(deps):
            vulns = batch_results[i]
            for vuln in vulns:
                formatted = osv.format_vulnerability(vuln)
                
                # Contextual risk score
                risk_result = risk_engine.calculate_risk(
                    formatted, 
                    graph_depth=1 if dep["is_direct"] else 2, 
                    is_direct=dep["is_direct"]
                )
                
                finding = Finding(
                    scan_id=scan.id,
                    package_name=dep["name"],
                    version=dep["version"],
                    vulnerability_id=formatted["vulnerability_id"],
                    severity=risk_result["level"],
                    risk_score=risk_result["score"],
                    confidence=risk_result["confidence"],
                    finding_type="CONFIRMED_VULNERABILITY",
                    insight=formatted["summary"]
                )
                db.add(finding)
                if risk_result["level"] in ["HIGH", "CRITICAL"]:
                    high_risk_findings_count += 1
                    
        # 3. Create Trust Ledger entry
        ledger.record_scan(scan.id, f"Found {len(deps)} deps, {high_risk_findings_count} severe risks")
        
        scan.status = "COMPLETED"
    except Exception as e:
        scan.status = "FAILED"
        import traceback
        with open("scan_error.log", "w") as f:
            f.write(traceback.format_exc())
        print(f"Scan failed: {e}")
    finally:
        db.commit()

def process_local_scan(scan_id: int, directory_path: str):
    db = next(get_db())
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan: return
        
    scan.status = "IN_PROGRESS"
    db.commit()
    
    osv = OSVClient()
    risk_engine = RiskEngine()
    ledger = TrustLedger(db)
    
    try:
        deps = []
        seen_deps = set()
        
        base_depth = directory_path.count(os.sep)
        for root, dirs, files in os.walk(directory_path):
            # Limit depth to 3 levels
            current_depth = root.count(os.sep)
            if current_depth - base_depth > 3:
                del dirs[:]
                continue
                
            # Exclude common large directories
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'venv', '.venv', 'dist', 'build']]
            
            if "package.json" in files:
                package_json = None
                package_lock = None
                try:
                    with open(os.path.join(root, "package.json"), 'r', encoding='utf-8') as f:
                        package_json = json.load(f)
                    if "package-lock.json" in files:
                        with open(os.path.join(root, "package-lock.json"), 'r', encoding='utf-8') as f:
                            package_lock = json.load(f)
                    
                    npm_parser = NpmParser(package_json, package_lock)
                    parsed_deps = npm_parser.parse()
                    
                    for dep in parsed_deps:
                        sig = f"{dep['name']}@{dep['version']}"
                        if sig not in seen_deps:
                            seen_deps.add(sig)
                            deps.append(dep)
                except Exception as e:
                    print(f"Error parsing {root}/package.json: {e}")
                    
            if "requirements.txt" in files:
                try:
                    with open(os.path.join(root, "requirements.txt"), 'r', encoding='utf-8') as f:
                        requirements_txt = f.read()
                    python_parser = PythonParser(requirements_txt)
                    parsed_deps = python_parser.parse()
                    
                    for dep in parsed_deps:
                        sig = f"{dep['name']}@{dep['version']}"
                        if sig not in seen_deps:
                            seen_deps.add(sig)
                            deps.append(dep)
                except Exception as e:
                    print(f"Error parsing {root}/requirements.txt: {e}")
                    
        if not deps:
            raise Exception("No package.json or requirements.txt found in the selected directory (up to 3 levels deep).")
            
        high_risk_findings_count = 0
        batch_results = osv.query_batch(deps)
        
        for i, dep in enumerate(deps):
            vulns = batch_results[i]
            for vuln in vulns:
                formatted = osv.format_vulnerability(vuln)
                
                risk_result = risk_engine.calculate_risk(formatted, graph_depth=1 if dep["is_direct"] else 2, is_direct=dep["is_direct"])
                
                finding = Finding(
                    scan_id=scan.id, package_name=dep["name"], version=dep["version"],
                    vulnerability_id=formatted["vulnerability_id"], severity=risk_result["level"],
                    risk_score=risk_result["score"], confidence=risk_result["confidence"], finding_type="CONFIRMED_VULNERABILITY",
                    insight=formatted["summary"]
                )
                db.add(finding)
                if risk_result["level"] in ["HIGH", "CRITICAL"]: high_risk_findings_count += 1
                    
        ledger.record_scan(scan.id, f"Local Scan: Found {len(deps)} deps, {high_risk_findings_count} severe risks")
        scan.status = "COMPLETED"
    except Exception as e:
        scan.status = "FAILED"
        print(f"Local scan failed: {e}")
    finally:
        db.commit()

if __name__ == "__main__":
    import uvicorn
    import sys
    
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
