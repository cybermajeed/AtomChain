"""
Tavily Security Research Client
================================
Wraps the Tavily search API for targeted security intelligence retrieval.
API key is read server-side only — never exposed to the frontend.
"""
import os
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class TavilyResult:
    title: str
    url: str
    content: str
    score: float = 0.0
    published_date: Optional[str] = None


@dataclass
class TavilyResearch:
    query: str
    results: list[TavilyResult] = field(default_factory=list)
    available: bool = True
    error: Optional[str] = None

    @property
    def has_results(self) -> bool:
        return bool(self.results)


class TavilyClient:
    """
    Server-side Tavily search client for security intelligence.
    Gracefully degrades when unavailable (key missing or network error).
    """

    def __init__(self):
        self.api_key = os.environ.get("TAVILY_API_KEY", "").strip()
        self._client = None
        self._available = bool(self.api_key)

    def _get_client(self):
        """Lazy-initialise the Tavily client to avoid import errors when key is absent."""
        if self._client is None and self._available:
            try:
                from tavily import TavilyClient as _TavilySDK  # type: ignore
                self._client = _TavilySDK(api_key=self.api_key)
            except ImportError:
                self._available = False
                print("[TavilyClient] tavily-python package not installed. Run: pip install tavily-python")
            except Exception as e:
                self._available = False
                print(f"[TavilyClient] Failed to initialise Tavily client: {e}")
        return self._client

    def search(self, query: str, max_results: int = 5) -> TavilyResearch:
        """
        Perform a targeted security search.
        Returns a TavilyResearch object — always safe to use even on failure.
        """
        if not self._available or not self.api_key:
            return TavilyResearch(
                query=query,
                available=False,
                error="Tavily API key not configured. Add TAVILY_API_KEY to backend/.env"
            )

        client = self._get_client()
        if not client:
            return TavilyResearch(query=query, available=False, error="Tavily client unavailable")

        try:
            response = client.search(
                query=query,
                search_depth="advanced",
                max_results=max_results,
                include_answer=False,
            )
            raw_results = response.get("results", [])
            results = [
                TavilyResult(
                    title=r.get("title", ""),
                    url=r.get("url", ""),
                    content=r.get("content", ""),
                    score=r.get("score", 0.0),
                    published_date=r.get("published_date"),
                )
                for r in raw_results
            ]
            return TavilyResearch(query=query, results=results, available=True)

        except Exception as e:
            print(f"[TavilyClient] Search error for query '{query}': {e}")
            return TavilyResearch(
                query=query,
                available=True,
                error=f"Search failed: {str(e)}"
            )
