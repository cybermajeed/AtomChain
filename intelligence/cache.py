"""
Intelligence Cache
===================
Lightweight in-memory cache for Tavily research results and AI analyses.
Prevents duplicate API calls for the same finding + question combination.
Cache is keyed by: package + version + vuln_id + query_type
"""
import hashlib
import time
from typing import Optional, Any
from dataclasses import dataclass, field


@dataclass
class CacheEntry:
    value: Any
    created_at: float = field(default_factory=time.time)
    ttl_seconds: float = 3600  # 1 hour default

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.created_at) > self.ttl_seconds


class IntelligenceCache:
    """
    Simple thread-safe in-memory cache for intelligence results.
    Suitable for a local single-process backend.
    """

    def __init__(self):
        self._store: dict[str, CacheEntry] = {}

    @staticmethod
    def make_key(package: str, version: str, vuln_id: str, query_type: str) -> str:
        """Creates a stable cache key from finding identifiers."""
        raw = f"{package}|{version}|{vuln_id}|{query_type}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    @staticmethod
    def make_analysis_key(finding_id: int, question: Optional[str]) -> str:
        """Cache key for AI analysis results."""
        raw = f"analysis|{finding_id}|{question or 'default'}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        if entry.is_expired:
            del self._store[key]
            return None
        return entry.value

    def set(self, key: str, value: Any, ttl_seconds: float = 3600) -> None:
        self._store[key] = CacheEntry(value=value, ttl_seconds=ttl_seconds)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()

    def stats(self) -> dict:
        total = len(self._store)
        expired = sum(1 for e in self._store.values() if e.is_expired)
        return {"total_entries": total, "expired": expired, "active": total - expired}


# Module-level singleton — shared across the backend process lifetime
cache = IntelligenceCache()
