"""
AI Security Analyst — Groq Provider
======================================
Uses Groq's free llama-3.3-70b-versatile model for security reasoning.
The analyst interprets existing security engine data — it does NOT replace it.

Architecture:
  Security Engine facts
      + Tavily research (optional)
      → AI reasoning (Groq)
      → Structured AIAnalysis response
"""
import os
import json
from typing import Optional
from .schemas import (
    AIAnalysis, ConfidenceScore, ConfidenceLevel, Recommendation, Source,
    ChatMessage
)
from .prompts import (
    SYSTEM_INSTRUCTION, finding_analysis_prompt, copilot_chat_prompt, scan_summary_prompt
)


# Default fallback when AI is unavailable
_UNAVAILABLE_ANALYSIS = AIAnalysis(
    summary="AI analysis is currently unavailable.",
    why_it_matters="The AI analyst requires a GROQ_API_KEY to operate. The security data above is still valid.",
    evidence=[],
    impact="Unable to provide AI-assisted impact analysis.",
    confidence=ConfidenceScore(score=0.0, level=ConfidenceLevel.INSUFFICIENT,
                               explanation="AI service not configured."),
    uncertainty=["AI analyst is not configured. Add GROQ_API_KEY to backend/.env"],
    recommendation=Recommendation(
        action="investigate",
        priority="high",
        rationale="Review the security engine findings manually. AI analysis is unavailable."
    ),
    verification_steps=["Configure GROQ_API_KEY in backend/.env to enable AI analysis."],
    sources=[],
    research_used=False,
)


class GroqAnalyst:
    """
    Groq-powered AI security analyst.
    Uses llama-3.3-70b-versatile (free tier on Groq).
    Gracefully returns a fallback response if the key is missing or Groq is unreachable.
    """
    MODEL = "llama-3.3-70b-versatile"

    def __init__(self):
        self.api_key = os.environ.get("GROQ_API_KEY", "").strip()
        self._client = None
        self._available = bool(self.api_key)

    def _get_client(self):
        if self._client is None and self._available:
            try:
                from groq import Groq  # type: ignore
                self._client = Groq(api_key=self.api_key)
            except ImportError:
                self._available = False
                print("[GroqAnalyst] groq package not installed. Run: pip install groq")
            except Exception as e:
                self._available = False
                print(f"[GroqAnalyst] Failed to initialise Groq client: {e}")
        return self._client

    def _call(self, system: str, user: str, max_tokens: int = 1024) -> Optional[str]:
        """Make a Groq API call. Returns raw text or None on failure."""
        client = self._get_client()
        if not client:
            return None
        try:
            completion = client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.15,  # Low temperature for consistent security analysis
                max_tokens=max_tokens,
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"[GroqAnalyst] API call failed: {e}")
            return None

    def analyze_finding(
        self,
        package: str,
        version: str,
        vulnerability_id: str,
        cve: Optional[str],
        severity: str,
        risk_score: float,
        confidence: float,
        finding_type: str,
        summary: Optional[str],
        research_context: str = "No external research performed.",
        user_question: Optional[str] = None,
    ) -> AIAnalysis:
        """
        Generate a structured security analysis for a specific finding.
        Returns a valid AIAnalysis even if the AI is unavailable.
        """
        if not self._available:
            return _UNAVAILABLE_ANALYSIS

        prompt = finding_analysis_prompt(
            package=package,
            version=version,
            vulnerability_id=vulnerability_id,
            cve=cve,
            severity=severity,
            risk_score=risk_score,
            confidence=confidence,
            finding_type=finding_type,
            summary=summary,
            research_context=research_context,
            user_question=user_question,
        )

        raw = self._call(SYSTEM_INSTRUCTION, prompt, max_tokens=1200)
        if not raw:
            return _UNAVAILABLE_ANALYSIS

        return self._parse_analysis(raw)

    def _parse_analysis(self, raw: str) -> AIAnalysis:
        """Parse the JSON response from the model into an AIAnalysis object."""
        try:
            # Strip markdown code fences if the model wrapped the JSON
            text = raw.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                # Remove first and last fence lines
                text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

            data = json.loads(text)

            confidence_data = data.get("confidence", {})
            level_str = confidence_data.get("level", "low")
            try:
                level = ConfidenceLevel(level_str)
            except ValueError:
                level = ConfidenceLevel.LOW

            recommendation_data = data.get("recommendation", {})
            recommendation = Recommendation(
                action=recommendation_data.get("action", "investigate"),
                target_version=recommendation_data.get("target_version"),
                priority=recommendation_data.get("priority", "medium"),
                rationale=recommendation_data.get("rationale", ""),
            )

            sources = [
                Source(
                    title=s.get("title", ""),
                    url=s.get("url", ""),
                    authority=s.get("authority"),
                )
                for s in data.get("sources", [])
            ]

            return AIAnalysis(
                summary=data.get("summary", "Analysis completed."),
                why_it_matters=data.get("why_it_matters", ""),
                evidence=data.get("evidence", []),
                impact=data.get("impact", ""),
                confidence=ConfidenceScore(
                    score=float(confidence_data.get("score", 0.5)),
                    level=level,
                    explanation=confidence_data.get("explanation"),
                ),
                uncertainty=data.get("uncertainty", []),
                recommendation=recommendation,
                verification_steps=data.get("verification_steps", []),
                sources=sources,
                research_used=data.get("research_used", False),
            )

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"[GroqAnalyst] Failed to parse AI response: {e}\nRaw: {raw[:300]}")
            # Return a partial analysis with the raw text as summary
            return AIAnalysis(
                summary="AI analysis completed but response format was unexpected.",
                why_it_matters=raw[:500] if raw else "No response received.",
                evidence=[],
                impact="Unable to parse structured response.",
                confidence=ConfidenceScore(score=0.3, level=ConfidenceLevel.LOW,
                                           explanation="Response parsing failed."),
                uncertainty=["AI response format was not parseable as structured JSON."],
                recommendation=Recommendation(
                    action="investigate",
                    priority="medium",
                    rationale="Review the finding manually."
                ),
                verification_steps=[],
                sources=[],
                research_used=False,
            )

    def chat(
        self,
        scan_summary: str,
        findings_context: str,
        messages: list[ChatMessage],
    ) -> str:
        """
        Copilot-style chat with scan context awareness.
        Returns a plain text response (not structured JSON).
        """
        if not self._available:
            return ("AI Copilot is unavailable. Add GROQ_API_KEY to backend/.env "
                    "to enable AI-assisted security analysis.")

        # Build conversation history string
        history_lines = []
        for msg in messages[:-1]:  # All but last message
            prefix = "User" if msg.role == "user" else "Assistant"
            history_lines.append(f"{prefix}: {msg.content}")
        conversation_history = "\n".join(history_lines) if history_lines else ""

        # Last message is the current user question
        current_question = messages[-1].content if messages else ""

        prompt = copilot_chat_prompt(
            scan_summary=scan_summary,
            findings_context=findings_context,
            conversation_history=conversation_history,
            user_message=current_question,
        )

        # Chat uses a more conversational system prompt
        chat_system = (
            "You are a security analyst for SupplyShield. Answer questions about the scan results provided. "
            "Be concise, accurate, and professional. Never invent security facts. "
            "If you don't have enough context, say so clearly."
        )

        raw = self._call(chat_system, prompt, max_tokens=800)
        return raw or "AI analysis is temporarily unavailable. Please try again."

    def generate_scan_summary(
        self,
        repository_url: str,
        total_findings: int,
        top_score: int,
        level: str,
        severity_counts: dict,
        top_findings_text: str,
    ) -> str:
        """
        Generates a brief plain-text AI summary for the full scan.
        Returns a 2-3 sentence overview.
        """
        if not self._available:
            return "Configure GROQ_API_KEY in backend/.env to enable AI scan summaries."

        prompt = scan_summary_prompt(
            repository_url=repository_url,
            total_findings=total_findings,
            top_score=top_score,
            level=level,
            critical_count=severity_counts.get("CRITICAL", 0),
            high_count=severity_counts.get("HIGH", 0),
            medium_count=severity_counts.get("MEDIUM", 0),
            low_count=severity_counts.get("LOW", 0),
            top_findings=top_findings_text,
        )

        system = (
            "You are a security analyst. Summarize the scan in 2-3 concise sentences. "
            "Focus on the most critical issue and recommended first action. Plain text only."
        )

        raw = self._call(system, prompt, max_tokens=200)
        return raw or "Scan complete. Review the findings below for details."
