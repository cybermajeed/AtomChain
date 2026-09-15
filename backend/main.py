import os
import httpx
from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db, Scan, Finding
from scanner.git_manager import GitManager
from parsers.npm_parser import NpmParser
from intelligence.osv_client import OSVClient
from dependency.graph_builder import DependencyGraph
from risk.engine import RiskEngine
from auth import router as auth_router

app = FastAPI(title="Sustainverse API", version="1.0.0")
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic models ──────────────────────────────────────────────────────────

class GitHubScanRequest(BaseModel):
    repo_url: str
    github_token: Optional[str] = None
    branch: Optional[str] = None

class ScanResponse(BaseModel):
    scan_id: int
    status: str
    message: str

class DependencyResult(BaseModel):
    id: str
    risk: str
    direct: bool

class ScanDetail(BaseModel):
    scan_id: int
    status: str
    message: Optional[str] = None
    score: Optional[int] = None
    level: Optional[str] = None
    dependencies: Optional[List[DependencyResult]] = None

# ─── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "Sustainverse Backend is running"}

@app.post("/api/scan/github", response_model=ScanResponse)
def scan_github(req: GitHubScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    new_scan = Scan(repository_url=req.repo_url, status="PENDING")
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    background_tasks.add_task(
        process_github_scan, new_scan.id, req.repo_url, req.github_token, req.branch
    )
    return {"scan_id": new_scan.id, "status": "PENDING", "message": "Scan initiated"}

@app.get("/api/scan/{scan_id}", response_model=ScanDetail)
def get_scan_status(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        return ScanDetail(scan_id=scan_id, status="UNKNOWN", message="Scan not found")

    if scan.status == "COMPLETED":
        # Compute aggregate score from stored findings
        findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
        if not findings:
            return ScanDetail(scan_id=scan_id, status="COMPLETED", score=0, level="LOW", dependencies=[])

        top_score = max(f.risk_score for f in findings)
        if top_score >= 90:
            level = "CRITICAL"
        elif top_score >= 70:
            level = "HIGH"
        elif top_score >= 40:
            level = "MEDIUM"
        else:
            level = "LOW"

        deps = [
            DependencyResult(
                id=f"{f.package_name}@{f.version}",
                risk=f.severity,
                direct=f.finding_type == "DIRECT_VULNERABILITY",
            )
            for f in findings
        ]
        return ScanDetail(scan_id=scan_id, status="COMPLETED", score=int(top_score), level=level, dependencies=deps)

    msg = "Scan in progress..." if scan.status == "IN_PROGRESS" else ("Scan queued" if scan.status == "PENDING" else "Scan failed")
    return ScanDetail(scan_id=scan_id, status=scan.status, message=msg)

# ─── Background scan pipeline ──────────────────────────────────────────────────

def process_github_scan(scan_id: int, repo_url: str, github_token: Optional[str], branch: Optional[str]):
    db = next(get_db())
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        return

    scan.status = "IN_PROGRESS"
    db.commit()

    git_mgr = GitManager()
    temp_dir = None
    try:
        temp_dir = git_mgr.clone_repo(repo_url, branch=branch, github_token=github_token)

        # 1. Parse dependencies
        parser = NpmParser(temp_dir)
        deps = parser.parse()

        # 2. Build dependency graph
        graph = DependencyGraph()
        graph.build_from_npm(deps)

        # 3. Query OSV for vulnerabilities
        osv = OSVClient()
        risk_engine = RiskEngine()

        for dep in deps:
            vulns = osv.query_package(dep["name"], dep["version"], dep.get("ecosystem", "npm"))
            for vuln in vulns:
                vuln_info = osv.format_vulnerability(vuln)
                is_direct = dep.get("is_direct", False)
                depth = graph.get_node_depth(f"{dep['name']}@{dep['version']}")
                if depth < 0:
                    depth = 1 if is_direct else 2

                risk = risk_engine.calculate_risk(
                    {**vuln_info, "source_usage_confirmed": is_direct},
                    depth,
                    is_direct,
                )

                finding = Finding(
                    scan_id=scan_id,
                    package_name=dep["name"],
                    version=dep["version"],
                    vulnerability_id=vuln_info["vulnerability_id"],
                    severity=vuln_info["severity"],
                    risk_score=risk["score"],
                    confidence=risk["confidence"],
                    finding_type="DIRECT_VULNERABILITY" if is_direct else "TRANSITIVE_VULNERABILITY",
                )
                db.add(finding)

        scan.status = "COMPLETED"
    except Exception as e:
        scan.status = "FAILED"
        print(f"Scan {scan_id} failed: {e}")
    finally:
        if temp_dir:
            git_mgr.cleanup(temp_dir)
        db.commit()

if __name__ == "__main__":
    import uvicorn
    import sys

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
