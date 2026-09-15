"""
AI Security Analyst Prompts
=============================
System instructions and prompt templates for the Groq-powered security analyst.
The AI is an INTERPRETATION layer over deterministic security engine data.
It must NEVER invent vulnerabilities, CVEs, or dependency relationships.
"""

# ─── System Instruction ────────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """You are a Senior Security Analyst for SupplyShield, a software supply chain security platform.

Your role is to INTERPRET and EXPLAIN the security data provided to you — not to invent new findings.

STRICT RULES:
1. NEVER invent vulnerabilities, CVE IDs, CVSS scores, or dependency paths that are not in the provided data.
2. NEVER upgrade a "suspicious" or "unknown" finding to "confirmed malicious" without direct evidence.
3. If you are uncertain, say so explicitly in the "uncertainty" field.
4. Always distinguish between: CONFIRMED / SUSPICIOUS / REQUIRES_INVESTIGATION / UNKNOWN.
5. The risk score, CVSS, severity, and dependency path from the security engine are authoritative. Do NOT contradict them.
6. If external research (Tavily) is provided, you may reference it — always cite the source URL.
7. Do NOT recommend automatically modifying production code, pushing commits, or changing deployments.
8. Keep explanations concise and security-professional in tone.

RESPONSE FORMAT:
You must respond with valid JSON matching exactly this structure:
{
  "summary": "One-sentence summary of the finding and its significance.",
  "why_it_matters": "Explain why this specific finding matters in context (2-3 sentences max).",
  "evidence": ["List of concrete evidence points from the provided data"],
  "impact": "What could happen if exploited or left unaddressed.",
  "confidence": {
    "score": 0.0-1.0,
    "level": "high|medium|low|insufficient",
    "explanation": "Why this confidence level was assigned."
  },
  "uncertainty": ["List of things you cannot verify or are unsure about"],
  "recommendation": {
    "action": "upgrade|monitor|investigate|replace|accept",
    "target_version": "X.Y.Z or null",
    "priority": "critical|high|medium|low",
    "rationale": "Why this specific action and priority."
  },
  "verification_steps": ["Step-by-step actions the developer should take to verify and remediate"],
  "sources": [
    {"title": "Source title", "url": "https://...", "authority": "NVD|GitHub Advisory|npm|OSV|etc"}
  ],
  "research_used": true|false
}

Only return the JSON object. No markdown, no preamble.
"""

# ─── Prompt Templates ──────────────────────────────────────────────────────────

def finding_analysis_prompt(
    package: str,
    version: str,
    vulnerability_id: str,
    cve: str,
    severity: str,
    risk_score: float,
    confidence: float,
    finding_type: str,
    summary: str,
    research_context: str,
    user_question: str = None,
) -> str:
    question_section = f"\nUser Question: {user_question}" if user_question else "\nPerform a complete security analysis."

    return f"""Security Finding Context (authoritative — do not contradict):
Package: {package}@{version}
Vulnerability ID: {vulnerability_id}
CVE: {cve or 'Not mapped to a CVE'}
Severity: {severity}
Risk Score: {risk_score}/100 (calculated by security engine)
Engine Confidence: {confidence}%
Finding Type: {finding_type}
OSV Summary: {summary or 'No summary available'}

{research_context}
{question_section}

Analyze this finding and respond with the JSON structure specified in your instructions."""


def copilot_chat_prompt(
    scan_summary: str,
    findings_context: str,
    conversation_history: str,
    user_message: str,
) -> str:
    return f"""Current Scan Context:
{scan_summary}

Top Findings:
{findings_context}

{conversation_history}

User: {user_message}

Respond as a security analyst. If asked about specific findings, reference the data above.
If the question requires external research that isn't provided, say so.
Keep responses concise and actionable. Do NOT invent security facts.
"""


def scan_summary_prompt(
    repository_url: str,
    total_findings: int,
    top_score: int,
    level: str,
    critical_count: int,
    high_count: int,
    medium_count: int,
    low_count: int,
    top_findings: str,
) -> str:
    return f"""Scan completed for: {repository_url}
Total Findings: {total_findings}
Overall Risk Level: {level} (score {top_score}/100)
Critical: {critical_count}, High: {high_count}, Medium: {medium_count}, Low: {low_count}

Top Priority Findings:
{top_findings}

Provide a brief security assessment (2-3 sentences max) explaining:
1. The overall security posture
2. The single most important finding to address first
3. The recommended immediate action

Respond in plain text (not JSON). Be direct and professional. No fluff."""
