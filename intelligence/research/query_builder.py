"""
Security Research Query Builder
=================================
Builds targeted, focused Tavily search queries from real finding context.
Queries are constructed from actual security data — never generic.
"""
from typing import Optional
from dataclasses import dataclass


@dataclass
class FindingContext:
    """Represents the security context for a single finding."""
    package_name: str
    version: str
    vulnerability_id: Optional[str] = None
    cve: Optional[str] = None
    severity: Optional[str] = None
    risk_score: Optional[float] = None
    confidence: Optional[float] = None
    finding_type: Optional[str] = None
    summary: Optional[str] = None
    ecosystem: str = "npm"
    scan_id: Optional[int] = None
    finding_id: Optional[int] = None


class QueryBuilder:
    """
    Constructs focused security research queries from finding context.
    Uses specific identifiers (CVE, package, version) to get authoritative results.
    """

    @staticmethod
    def vulnerability_query(ctx: FindingContext) -> str:
        """
        Query for CVE/vulnerability details and advisory information.
        Example: "lodash 4.17.15 CVE-2021-23337 security advisory affected versions fixed"
        """
        parts = [ctx.package_name, ctx.version]
        if ctx.cve:
            parts.append(ctx.cve)
        elif ctx.vulnerability_id and ctx.vulnerability_id != "UNKNOWN":
            parts.append(ctx.vulnerability_id)
        parts += ["security advisory", "affected versions", "fixed version"]
        return " ".join(parts)

    @staticmethod
    def remediation_query(ctx: FindingContext) -> str:
        """
        Query for upgrade guidance and breaking changes.
        Example: "lodash upgrade from 4.17.15 breaking changes migration"
        """
        parts = [ctx.package_name, "upgrade from", ctx.version]
        if ctx.cve:
            parts.append(ctx.cve)
        parts += ["breaking changes", "migration", "npm"]
        return " ".join(parts)

    @staticmethod
    def suspicious_package_query(ctx: FindingContext) -> str:
        """
        Query for package reputation and suspicious signals.
        Example: '"expresss-helper" npm suspicious malicious typosquatting security'
        """
        return f'"{ctx.package_name}" npm suspicious malicious typosquatting security incident'

    @staticmethod
    def package_reputation_query(ctx: FindingContext) -> str:
        """
        Query for general package security posture.
        Example: "lodash npm package security maintenance advisories 2024"
        """
        return f"{ctx.package_name} {ctx.version} npm package security advisories maintenance"

    @staticmethod
    def cve_detail_query(cve_id: str, package_name: str) -> str:
        """Direct CVE lookup query."""
        return f"{cve_id} {package_name} NVD CVSS score advisory details"

    @staticmethod
    def build_for_question(ctx: FindingContext, question_type: str) -> str:
        """
        Route to the right query based on what the user is asking.
        question_type: 'vulnerability' | 'remediation' | 'suspicious' | 'reputation'
        """
        dispatch = {
            "vulnerability": QueryBuilder.vulnerability_query,
            "remediation": QueryBuilder.remediation_query,
            "suspicious": QueryBuilder.suspicious_package_query,
            "reputation": QueryBuilder.package_reputation_query,
        }
        builder = dispatch.get(question_type, QueryBuilder.vulnerability_query)
        return builder(ctx)
