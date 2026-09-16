import os
import sys
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional, Dict

# ─── Load environment (includes GROQ_API_KEY, TAVILY_API_KEY, GitHub OAuth) ────
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# ─── Add intelligence root to path so we can import from /intelligence ─────────
_INTELLIGENCE_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "intelligence")
)
if _INTELLIGENCE_ROOT not in sys.path:
    sys.path.insert(0, _INTELLIGENCE_ROOT)

from database import get_db, Scan, Finding, TrustRecord, SessionLocal
from scanner.git_manager import GitManager
from scanner.github_client import GitHubAPIClient
from parsers.npm_parser import NpmParser
from parsers.manifest_parser import ManifestParser
from scanner.zip_manager import ZipManager
from intelligence.osv_client import OSVClient
from dependency.graph_builder import DependencyGraph

# Startup cleanup of old cloned repos
try:
    GitManager.clear_all_temp_repos()
except Exception as e:
    print(f"Warning: Failed to clear old temp repos: {e}")

from risk.engine import RiskEngine
from auth import router as auth_router
from trust.ledger import TrustLedger

# ─── Intelligence layer imports ────────────────────────────────────────────────
from ai.analyst import GroqAnalyst
from ai.schemas import (
    AnalyzeFindingRequest, ChatRequest, ResearchRequest,
    AIAnalysis, ChatMessage,
)
from research.tavily_client import TavilyClient
from research.query_builder import QueryBuilder, FindingContext
from research.source_filter import rank_and_filter, format_for_ai
from cache import cache

# ─── Singletons (initialised once at startup) ──────────────────────────────────
analyst = GroqAnalyst()
tavily = TavilyClient()

app = FastAPI(title="AtomChain API", version="1.0.0")
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
class LocalScanRequest(BaseModel):
    local_path: str

class ManifestScanRequest(BaseModel):
    package_json: Optional[dict] = None
    package_lock_json: Optional[dict] = None
    files: Optional[Dict[str, str]] = None   # relpath -> raw manifest content
    project_name: Optional[str] = "Uploaded Project"

class ScanResponse(BaseModel):
    scan_id: int
    status: str
    message: str

class DependencyResult(BaseModel):
    id: str
    finding_id: int
    risk: str
    direct: bool
    ecosystem: str = "npm"

class ScanDetail(BaseModel):
    scan_id: int
    status: str
    message: Optional[str] = None
    error_message: Optional[str] = None   # Human-readable failure reason
    score: Optional[int] = None
    level: Optional[str] = None
    repository_url: Optional[str] = None
    dependencies: Optional[List[DependencyResult]] = None

# ─── Existing Routes ────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "AtomChain Backend is running"}

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

@app.post("/api/scan/local", response_model=ScanResponse)
def scan_local(req: LocalScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not os.path.exists(req.local_path) or not os.path.isdir(req.local_path):
        raise HTTPException(status_code=400, detail="Invalid local directory path")
    
    new_scan = Scan(repository_url=f"local://{req.local_path}", status="PENDING")
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    background_tasks.add_task(
        process_local_scan, new_scan.id, req.local_path
    )
    return {"scan_id": new_scan.id, "status": "PENDING", "message": "Local scan initiated"}

@app.post("/api/scan/manifests", response_model=ScanResponse)
def scan_manifests(req: ManifestScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    has_content = bool(
        req.files or req.package_json or req.package_lock_json
    )
    if not has_content:
        raise HTTPException(
            status_code=400,
            detail="No supported dependency manifests provided. Include files such as package.json, package-lock.json, yarn.lock, pnpm-lock.yaml, requirements.txt, Pipfile, Pipfile.lock, pyproject.toml, poetry.lock, go.mod, Cargo.toml, Cargo.lock, Gemfile, Gemfile.lock, composer.json, composer.lock, pom.xml, packages.config, *.csproj or environment.yml.",
        )
    
    new_scan = Scan(repository_url=f"folder://{req.project_name}", status="PENDING")
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    background_tasks.add_task(
        process_manifest_scan, new_scan.id, req.package_json, req.package_lock_json, req.files
    )
    return {"scan_id": new_scan.id, "status": "PENDING", "message": "Manifest scan initiated"}


@app.post("/api/scan/zip", response_model=ScanResponse)
async def scan_zip(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Must be a .zip file")
    
    zip_bytes = await file.read()
    new_scan = Scan(repository_url=f"zip://{file.filename}", status="PENDING")
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    background_tasks.add_task(
        process_zip_scan, new_scan.id, zip_bytes
    )
    return {"scan_id": new_scan.id, "status": "PENDING", "message": "ZIP scan initiated"}

@app.get("/api/scan/{scan_id}", response_model=ScanDetail)
def get_scan_status(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        db.close()
        return ScanDetail(scan_id=scan_id, status="UNKNOWN", message="Scan not found")

    if scan.status == "COMPLETED":
        findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
        if not findings:
            return ScanDetail(scan_id=scan_id, status="COMPLETED", score=0, level="LOW",
                              repository_url=scan.repository_url, dependencies=[])

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
                finding_id=f.id,
                risk=f.severity,
                direct=f.finding_type == "DIRECT_VULNERABILITY",
                ecosystem=f.ecosystem or "npm",
            )
            for f in findings
        ]
        return ScanDetail(
            scan_id=scan_id, status="COMPLETED", score=int(top_score),
            level=level, repository_url=scan.repository_url, dependencies=deps
        )

    msg = "Scan in progress..." if scan.status == "IN_PROGRESS" else (
        "Scan queued" if scan.status == "PENDING" else "Scan failed"
    )
    # Surface the stored error message for FAILED scans
    err_msg = getattr(scan, 'error_message', None) if scan.status == "FAILED" else None
    return ScanDetail(scan_id=scan_id, status=scan.status, message=msg, error_message=err_msg)


@app.get("/api/findings/{finding_id}")
def get_finding_detail(finding_id: int, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    scan = db.query(Scan).filter(Scan.id == finding.scan_id).first()
    scan_deps = []
    if scan:
        all_findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
        scan_deps = [
            {
                "id": f"{f.package_name}@{f.version}",
                "finding_id": f.id,
                "risk": f.severity,
                "direct": f.finding_type == "DIRECT_VULNERABILITY",
                "ecosystem": f.ecosystem or "npm",
            }
            for f in all_findings
        ]

    return {
        "finding_id": finding.id,
        "id": f"{finding.package_name}@{finding.version}",
        "scan_id": finding.scan_id,
        "package_name": finding.package_name,
        "version": finding.version,
        "ecosystem": finding.ecosystem or "npm",
        "vulnerability_id": finding.vulnerability_id,
        "cve": finding.cve,
        "risk": finding.severity,
        "severity": finding.severity,
        "risk_score": finding.risk_score,
        "confidence": finding.confidence,
        "finding_type": finding.finding_type,
        "direct": finding.finding_type == "DIRECT_VULNERABILITY",
        "summary": finding.summary,
        "insight": finding.insight,
        "is_reviewed": bool(finding.is_reviewed),
        "decision": finding.decision,
        "dependencies": scan_deps
    }


@app.get("/api/scans")
def get_scans(db: Session = Depends(get_db)):
    scans = db.query(Scan).order_by(Scan.id.desc()).all()
    result = []
    for s in scans:
        score = None
        if s.status == "COMPLETED":
            findings = db.query(Finding).filter(Finding.scan_id == s.id).all()
            if findings:
                score = int(max(f.risk_score for f in findings))
            else:
                score = 0
                
        result.append({
            "id": s.id,
            "repository_url": s.repository_url,
            "status": s.status,
            "timestamp": s.timestamp.isoformat(),
            "error_message": s.error_message,
            "score": score
        })
    return result

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


class DecisionRequest(BaseModel):
    decision: str

@app.post("/api/findings/{finding_id}/decision")
def update_decision(finding_id: int, req: DecisionRequest, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.decision = req.decision
    db.commit()
    return {"status": "success", "decision": finding.decision}

# ─── Background scan pipeline ──────────────────────────────────────────────────


NO_MANIFEST_MSG = (
    "No supported dependency manifests found. Supported files include: "
    "package.json, package-lock.json, npm-shrinkwrap.json, yarn.lock, "
    "pnpm-lock.yaml, requirements*.txt, Pipfile, Pipfile.lock, pyproject.toml, "
    "poetry.lock, setup.py, setup.cfg, go.mod, Cargo.toml, Cargo.lock, Gemfile, "
    "Gemfile.lock, composer.json, composer.lock, pom.xml, packages.config, "
    "*.csproj, environment.yml (conda), and more."
)

def _extract_all_dependencies(directory_path: str) -> list:
    return ManifestParser().collect(directory_path)


def _analyze_dependencies(scan_id: int, deps: list, db: Session):
    """Shared pipeline: build graph -> OSV batch query -> risk score -> findings."""
    query_deps = [d for d in deps if d.get("version")]

    graph = DependencyGraph()
    graph.build(deps)

    osv = OSVClient()
    risk_engine = RiskEngine()

    # OSV supports up to 1000 packages per query — chunk at 500 for safety.
    BATCH_SIZE = 500
    all_vuln_lists: list = []
    for chunk_start in range(0, len(query_deps), BATCH_SIZE):
        chunk = query_deps[chunk_start: chunk_start + BATCH_SIZE]
        all_vuln_lists.extend(osv.query_batch(chunk))

    for dep, vulns in zip(query_deps, all_vuln_lists):
        for vuln in vulns:
            vuln_info = osv.format_vulnerability(vuln)
            is_direct = dep.get("is_direct", False)
            ecosystem = dep.get("ecosystem", "npm")
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
                cve=vuln_info.get("cve"),
                severity=vuln_info["severity"],
                risk_score=risk["score"],
                confidence=risk["confidence"],
                finding_type="DIRECT_VULNERABILITY" if is_direct else "TRANSITIVE_VULNERABILITY",
                summary=vuln_info.get("summary"),
                ecosystem=ecosystem,
            )
            db.add(finding)

def process_github_scan(scan_id: int, repo_url: str, github_token: Optional[str], branch: Optional[str]):
    db = SessionLocal()
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        db.close()
        return

    scan.status = "IN_PROGRESS"
    db.commit()

    git_mgr = GitManager()
    temp_dir = None
    try:
        temp_dir = git_mgr.fetch_repo_tarball(repo_url, branch=branch, github_token=github_token)

        deps = _extract_all_dependencies(temp_dir)
        if not deps:
            raise Exception(NO_MANIFEST_MSG)

        _analyze_dependencies(scan_id, deps, db)
        scan.status = "COMPLETED"
        findings_count = db.query(Finding).filter(Finding.scan_id == scan_id).count()
        TrustLedger(db).record_scan(scan_id, f"Found {findings_count} vulnerabilities")
    except Exception as e:
        import traceback
        scan.status = "FAILED"
        scan.error_message = str(e) if len(str(e)) < 500 else str(e)[:500]
        print(f"Scan {scan_id} failed: {e}")
        traceback.print_exc()
    finally:
        if temp_dir:
            git_mgr.cleanup(temp_dir)
        db.commit()
        db.close()


def process_zip_scan(scan_id: int, zip_bytes: bytes):
    db = SessionLocal()
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        db.close()
        return

    scan.status = "IN_PROGRESS"
    db.commit()

    temp_dir = None
    try:
        temp_dir = ZipManager.extract_zip_archive(zip_bytes)

        deps = _extract_all_dependencies(temp_dir)
        if not deps:
            raise Exception(NO_MANIFEST_MSG)

        _analyze_dependencies(scan_id, deps, db)
        scan.status = "COMPLETED"
        findings_count = db.query(Finding).filter(Finding.scan_id == scan_id).count()
        TrustLedger(db).record_scan(scan_id, f"Found {findings_count} vulnerabilities")
    except Exception as e:
        import traceback
        scan.status = "FAILED"
        scan.error_message = str(e) if len(str(e)) < 500 else str(e)[:500]
        print(f"ZIP Scan {scan_id} failed: {e}")
        traceback.print_exc()
    finally:
        if temp_dir and os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        db.commit()
        db.close()


def process_local_scan(scan_id: int, local_path: str):
    db = SessionLocal()
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        db.close()
        return

    scan.status = "IN_PROGRESS"
    db.commit()

    try:
        deps = _extract_all_dependencies(local_path)
        if not deps:
            raise Exception(NO_MANIFEST_MSG)

        _analyze_dependencies(scan_id, deps, db)
        scan.status = "COMPLETED"
    except Exception as e:
        import traceback
        scan.status = "FAILED"
        scan.error_message = str(e) if len(str(e)) < 500 else str(e)[:500]
        print(f"Local Scan {scan_id} failed: {e}")
        traceback.print_exc()
    finally:
        db.commit()
        db.close()


def process_manifest_scan(scan_id: int, package_json: Optional[dict], package_lock_json: Optional[dict], files: Optional[Dict[str, str]] = None):
    db = SessionLocal()
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        db.close()
        return

    scan.status = "IN_PROGRESS"
    db.commit()

    try:
        if files:
            deps = ManifestParser().parse_files(files)
        else:
            parser = NpmParser(package_json=package_json, package_lock_json=package_lock_json)
            deps = parser.parse()

        if not deps:
            raise Exception(NO_MANIFEST_MSG)

        _analyze_dependencies(scan_id, deps, db)
        scan.status = "COMPLETED"
    except Exception as e:
        import traceback
        scan.status = "FAILED"
        scan.error_message = str(e) if len(str(e)) < 500 else str(e)[:500]
        print(f"Manifest Scan {scan_id} failed: {e}")
        traceback.print_exc()
    finally:
        db.commit()
        db.close()

# ─── Intelligence Routes ────────────────────────────────────────────────────────

def _build_finding_context(finding: Finding) -> FindingContext:
    """Converts a DB Finding into a FindingContext for the intelligence layer."""
    return FindingContext(
        package_name=finding.package_name,
        version=finding.version,
        vulnerability_id=finding.vulnerability_id or "UNKNOWN",
        cve=finding.cve,
        severity=finding.severity,
        risk_score=finding.risk_score,
        confidence=finding.confidence,
        finding_type=finding.finding_type,
        summary=finding.summary,
        finding_id=finding.id,
        scan_id=finding.scan_id,
    )


@app.post("/api/intelligence/analyze-finding")
def analyze_finding(req: AnalyzeFindingRequest, db: Session = Depends(get_db)):
    """
    Analyze a specific finding with AI + optional Tavily research.
    The security engine's data remains authoritative — AI only interprets it.
    """
    finding = db.query(Finding).filter(Finding.id == req.finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    ctx = _build_finding_context(finding)
    question_type = req.question_type or "vulnerability"

    # Check cache first
    cache_key = cache.make_analysis_key(req.finding_id, req.question)
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Step 1: Build Tavily research query from real finding data
    research_context = "No external research performed."
    sources_used = []

    if question_type in ("vulnerability", "remediation", "suspicious"):
        query = QueryBuilder.build_for_question(ctx, question_type)
        research = tavily.search(query, max_results=5)

        if research.available and research.has_results:
            filtered = rank_and_filter(research.results, max_results=4)
            research_context = format_for_ai(filtered)
            sources_used = [{"title": r.title, "url": r.url} for r in filtered]
        elif research.error:
            research_context = f"External research unavailable: {research.error}"

    # Step 2: Run AI analysis with existing security facts + research
    analysis = analyst.analyze_finding(
        package=ctx.package_name,
        version=ctx.version,
        vulnerability_id=ctx.vulnerability_id,
        cve=ctx.cve,
        severity=ctx.severity or "UNKNOWN",
        risk_score=ctx.risk_score or 0.0,
        confidence=ctx.confidence or 60.0,
        finding_type=ctx.finding_type or "UNKNOWN",
        summary=ctx.summary,
        research_context=research_context,
        user_question=req.question,
    )

    # Merge Tavily sources into AI response if not already present
    if sources_used and not analysis.sources:
        from ai.schemas import Source
        analysis.sources = [Source(title=s["title"], url=s["url"]) for s in sources_used]
    if sources_used:
        analysis.research_used = True

    result = analysis.model_dump()

    # Cache for 1 hour
    cache.set(cache_key, result, ttl_seconds=3600)
    return result


@app.post("/api/intelligence/chat")
def intelligence_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Copilot-style chat with full scan context.
    The AI understands the current scan and its findings.
    """
    scan = db.query(Scan).filter(Scan.id == req.scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    findings = db.query(Finding).filter(Finding.scan_id == req.scan_id).all()

    # Build scan summary for AI context
    if findings:
        top_score = max(f.risk_score for f in findings)
        severity_counts = {}
        for f in findings:
            severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1
    else:
        top_score = 0
        severity_counts = {}

    scan_summary = (
        f"Repository: {scan.repository_url}\n"
        f"Scan Status: {scan.status}\n"
        f"Total Findings: {len(findings)}\n"
        f"Top Risk Score: {top_score}/100\n"
        f"Severity Breakdown: {severity_counts}"
    )

    # Build top-5 findings context
    top_findings = sorted(findings, key=lambda f: f.risk_score or 0, reverse=True)[:5]
    findings_lines = []
    for f in top_findings:
        findings_lines.append(
            f"- {f.package_name}@{f.version} | {f.severity} | Risk: {f.risk_score} | "
            f"Vuln: {f.vulnerability_id} | {f.finding_type}"
        )
    findings_context = "\n".join(findings_lines) if findings_lines else "No findings."

    response_text = analyst.chat(
        scan_summary=scan_summary,
        findings_context=findings_context,
        messages=req.messages,
    )

    return {"role": "assistant", "content": response_text}


@app.post("/api/intelligence/scan-summary")
def get_scan_ai_summary(scan_id: int, db: Session = Depends(get_db)):
    """
    Generate a brief AI-powered summary of a completed scan.
    Used by the frontend scan results card.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    if scan.status != "COMPLETED":
        return {"summary": "Scan is not yet complete."}

    # Check cache
    cache_key = f"scan_summary_{scan_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
    if not findings:
        return {"summary": "No vulnerabilities found in this scan."}

    top_score = int(max(f.risk_score for f in findings))
    severity_counts = {}
    for f in findings:
        severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1

    level = (
        "CRITICAL" if top_score >= 90 else
        "HIGH" if top_score >= 70 else
        "MEDIUM" if top_score >= 40 else "LOW"
    )

    top_findings = sorted(findings, key=lambda f: f.risk_score or 0, reverse=True)[:3]
    top_findings_text = "\n".join(
        f"- {f.package_name}@{f.version} ({f.severity}) — {f.vulnerability_id}"
        for f in top_findings
    )

    summary = analyst.generate_scan_summary(
        repository_url=scan.repository_url,
        total_findings=len(findings),
        top_score=top_score,
        level=level,
        severity_counts=severity_counts,
        top_findings_text=top_findings_text,
    )

    result = {"summary": summary, "scan_id": scan_id}
    cache.set(cache_key, result, ttl_seconds=1800)
    return result


@app.post("/api/intelligence/research")
def research_finding(req: ResearchRequest, db: Session = Depends(get_db)):
    """
    Direct Tavily research for a finding without AI analysis.
    Returns raw (filtered, ranked) research results.
    """
    finding = db.query(Finding).filter(Finding.id == req.finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    ctx = _build_finding_context(finding)

    # Check cache
    cache_key = cache.make_key(
        ctx.package_name, ctx.version,
        ctx.vulnerability_id, req.query_type
    )
    cached = cache.get(cache_key)
    if cached:
        return cached

    query = QueryBuilder.build_for_question(ctx, req.query_type)
    research = tavily.search(query, max_results=6)

    if not research.available:
        result = {"available": False, "error": research.error, "results": []}
        return result

    if research.error:
        result = {"available": True, "error": research.error, "results": []}
        return result

    filtered = rank_and_filter(research.results, max_results=5)
    result = {
        "available": True,
        "query": query,
        "results": [
            {
                "title": r.title,
                "url": r.url,
                "content": r.content[:600],
                "score": r.score,
            }
            for r in filtered
        ],
    }
    cache.set(cache_key, result, ttl_seconds=3600)
    return result


if __name__ == "__main__":
    import uvicorn

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
