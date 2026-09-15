import os
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "sustainverse.db")

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Scan(Base):
    __tablename__ = "scans"
    id = Column(Integer, primary_key=True, index=True)
    repository_url = Column(String, index=True)
    commit_hash = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="PENDING")
    error_message = Column(String, nullable=True)  # Populated on FAILED scans
    
    findings = relationship("Finding", back_populates="scan")
    trust_record = relationship("TrustRecord", back_populates="scan", uselist=False)

class Finding(Base):
    __tablename__ = "findings"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"))
    package_name = Column(String, index=True)
    version = Column(String)
    vulnerability_id = Column(String, index=True)
    cve = Column(String, nullable=True)          # CVE alias from OSV (e.g. CVE-2021-23337)
    severity = Column(String)
    risk_score = Column(Float)
    confidence = Column(Float)
    finding_type = Column(String) # CONFIRMED_VULNERABILITY, SUSPICIOUS_SIGNAL, ANOMALY
    insight = Column(String)
    summary = Column(String, nullable=True)       # Human-readable OSV summary for AI context
    is_reviewed = Column(Integer, default=0)
    decision = Column(String, default="PENDING") # Accept, Reject, Investigate, Override
    
    scan = relationship("Scan", back_populates="findings")

class TrustRecord(Base):
    __tablename__ = "trust_records"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"))
    previous_hash = Column(String)
    record_hash = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    scan = relationship("Scan", back_populates="trust_record")

# Initialize database
Base.metadata.create_all(bind=engine)

def _auto_migrate():
    """Ensure all required columns exist in SQLite tables even if created by earlier schema."""
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            # findings table migrations
            existing_findings_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(findings)"))]
            for col_name, col_type in {
                "cve": "VARCHAR",
                "insight": "VARCHAR",
                "summary": "VARCHAR",
                "is_reviewed": "INTEGER DEFAULT 0",
                "decision": "VARCHAR DEFAULT 'PENDING'"
            }.items():
                if col_name not in existing_findings_cols:
                    conn.execute(text(f"ALTER TABLE findings ADD COLUMN {col_name} {col_type}"))

            # scans table migrations
            existing_scan_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(scans)"))]
            if "error_message" not in existing_scan_cols:
                conn.execute(text("ALTER TABLE scans ADD COLUMN error_message VARCHAR"))

            conn.commit()
        except Exception as e:
            print(f"Auto-migration note: {e}")

try:
    _auto_migrate()
except Exception:
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
