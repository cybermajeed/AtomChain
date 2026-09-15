from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db, Scan
from scanner.git_manager import GitManager

app = FastAPI(title="Sustainverse API", version="1.0.0")

# Allow Electron frontend to access API
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

class ScanResponse(BaseModel):
    scan_id: int
    status: str
    message: str

@app.get("/")
def read_root():
    return {"status": "Sustainverse Backend is running"}

@app.post("/api/scan/github", response_model=ScanResponse)
def scan_github(req: GitHubScanRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Create scan record
    new_scan = Scan(repository_url=req.repo_url, status="PENDING")
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)
    
    # Run scan in background
    background_tasks.add_task(process_github_scan, new_scan.id, req.repo_url, req.branch)
    
    return {"scan_id": new_scan.id, "status": "PENDING", "message": "Scan initiated"}

def process_github_scan(scan_id: int, repo_url: str, branch: Optional[str]):
    # Note: A real implementation would manage db session internally for async task
    # For now this is a placeholder
    db = next(get_db())
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        return
        
    scan.status = "IN_PROGRESS"
    db.commit()
    
    git_mgr = GitManager()
    temp_dir = None
    try:
        temp_dir = git_mgr.clone_repo(repo_url, branch)
        # TODO: Run manifest parsing, OSV intelligence, tree-sitter, etc.
        
        scan.status = "COMPLETED"
    except Exception as e:
        scan.status = "FAILED"
        print(f"Scan failed: {e}")
    finally:
        if temp_dir:
            git_mgr.cleanup(temp_dir)
        db.commit()

if __name__ == "__main__":
    import uvicorn
    import sys
    
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
