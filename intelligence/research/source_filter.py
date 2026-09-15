"""
Source Filter & Ranker
========================
Ranks and filters Tavily results by source authority.
Authoritative security sources are weighted higher than generic blogs.
"""
from typing import List
from .tavily_client import TavilyResult


# Priority domains — higher index = higher authority weight
AUTHORITY_DOMAINS = [
    # Tier 1 — Primary security databases
    "nvd.nist.gov",
    "osv.dev",
    "github.com/advisories",
    "cisa.gov",
    "vuldb.com",
    # Tier 2 — Package registries and official repos
    "npmjs.com",
    "github.com",
    "snyk.io",
    "security.snyk.io",
    # Tier 3 — High-quality security research
    "portswigger.net",
    "exploit-db.com",
    "huntr.dev",
    "hackerone.com",
    "bugcrowd.com",
]

# Domains to deprioritize (not outright exclude, just lower weight)
LOW_AUTHORITY_DOMAINS = [
    "medium.com",
    "dev.to",
    "reddit.com",
    "stackoverflow.com",
]


def _authority_score(url: str) -> float:
    """Assigns an authority boost (0.0–1.0) based on source domain."""
    url_lower = url.lower()
    for i, domain in enumerate(AUTHORITY_DOMAINS):
        if domain in url_lower:
            # Higher index = lower priority in the list = lower score
            # Invert: index 0 (nvd.nist.gov) gets highest boost
            return 1.0 - (i / len(AUTHORITY_DOMAINS))
    for domain in LOW_AUTHORITY_DOMAINS:
        if domain in url_lower:
            return -0.1  # slight penalty
    return 0.0  # neutral for unknown sources


def rank_and_filter(
    results: List[TavilyResult],
    max_results: int = 4,
    min_content_length: int = 50,
) -> List[TavilyResult]:
    """
    Filters out low-quality results and ranks by combined Tavily relevance + authority.

    Args:
        results: Raw Tavily results
        max_results: Maximum results to return to the AI
        min_content_length: Minimum character length to keep a result

    Returns:
        Ranked, filtered list of TavilyResult objects
    """
    # Filter: must have meaningful content
    filtered = [
        r for r in results
        if len(r.content.strip()) >= min_content_length
    ]

    # Score: Tavily relevance score (0–1) + authority boost
    def combined_score(r: TavilyResult) -> float:
        return r.score + _authority_score(r.url)

    ranked = sorted(filtered, key=combined_score, reverse=True)
    return ranked[:max_results]


def format_for_ai(results: List[TavilyResult]) -> str:
    """
    Formats filtered results into a compact context string for the AI prompt.
    Keeps token usage minimal while preserving key information.
    """
    if not results:
        return "No external research results available."

    lines = ["=== External Security Research ==="]
    for i, r in enumerate(results, 1):
        lines.append(f"\n[Source {i}] {r.title}")
        lines.append(f"URL: {r.url}")
        # Truncate content to avoid excessive tokens (keep first 400 chars)
        snippet = r.content.strip()[:400]
        if len(r.content.strip()) > 400:
            snippet += "..."
        lines.append(f"Content: {snippet}")
    lines.append("\n=== End of Research ===")
    return "\n".join(lines)
