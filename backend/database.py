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
    
    findings = relationship("Finding", back_populates="scan")
    trust_record = relationship("TrustRecord", back_populates="scan", uselist=False)

class Finding(Base):
    __tablename__ = "findings"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"))
    package_name = Column(String, index=True)
    version = Column(String)
    vulnerability_id = Column(String, index=True)
    severity = Column(String)
    risk_score = Column(Float)
    confidence = Column(Float)
    finding_type = Column(String) # CONFIRMED_VULNERABILITY, SUSPICIOUS_SIGNAL, ANOMALY
    
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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
