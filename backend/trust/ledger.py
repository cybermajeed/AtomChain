import os
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from database import TrustRecord

class TrustLedger:
    def __init__(self, db: Session):
        self.db = db

    def _get_last_hash(self) -> str:
        last_record = self.db.query(TrustRecord).order_by(TrustRecord.id.desc()).first()
        return last_record.record_hash if last_record else "0" * 64

    def record_scan(self, scan_id: int, findings_summary: str) -> TrustRecord:
        """
        Creates a tamper-evident record of a scan result.
        Hashes the previous block's hash with the current scan data.
        """
        previous_hash = self._get_last_hash()
        
        # Payload to hash
        timestamp = datetime.utcnow().isoformat()
        payload = f"{previous_hash}:{scan_id}:{findings_summary}:{timestamp}"
        
        record_hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()
        
        new_record = TrustRecord(
            scan_id=scan_id,
            previous_hash=previous_hash,
            record_hash=record_hash,
            timestamp=datetime.utcnow()
        )
        
        self.db.add(new_record)
        self.db.commit()
        self.db.refresh(new_record)
        
        return new_record

    def verify_chain(self) -> bool:
        """
        Verifies the integrity of the entire local ledger.
        """
        records = self.db.query(TrustRecord).order_by(TrustRecord.id.asc()).all()
        expected_prev = "0" * 64
        
        for record in records:
            if record.previous_hash != expected_prev:
                return False
            expected_prev = record.record_hash
            
        return True
