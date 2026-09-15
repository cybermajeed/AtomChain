"""
AI Analysis Response Schemas
==============================
Pydantic models for structured AI responses.
These sit on top of the existing Finding/Scan models — they do NOT replace them.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INSUFFICIENT = "insufficient"


class ConfidenceScore(BaseModel):
    score: float = Field(ge=0.0, le=1.0, description="Confidence 0.0–1.0")
    level: ConfidenceLevel
    explanation: Optional[str] = None


class Recommendation(BaseModel):
    action: str  # e.g. "upgrade", "monitor", "investigate", "replace"
    target_version: Optional[str] = None
    priority: str  # "critical" | "high" | "medium" | "low"
    rationale: str


class Source(BaseModel):
    title: str
    url: str
    authority: Optional[str] = None  # e.g. "NVD", "GitHub Security Advisory"


class AIAnalysis(BaseModel):
    """
    Structured AI security analysis response.
    AI fills these fields based on real finding data + Tavily research.
    It must NOT invent CVEs, scores, or dependency paths.
    """
    summary: str
    why_it_matters: str
    evidence: List[str] = Field(default_factory=list)
    impact: str
    confidence: ConfidenceScore
    uncertainty: List[str] = Field(
        default_factory=list,
        description="What the AI is unsure about or cannot verify"
    )
    recommendation: Recommendation
    verification_steps: List[str] = Field(default_factory=list)
    sources: List[Source] = Field(default_factory=list)
    research_used: bool = False  # Whether Tavily research was used


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AnalyzeFindingRequest(BaseModel):
    finding_id: int
    question: Optional[str] = None  # If None, perform default analysis
    question_type: Optional[str] = "vulnerability"  # vulnerability|remediation|suspicious|reputation


class ChatRequest(BaseModel):
    scan_id: int
    messages: List[ChatMessage]
    finding_id: Optional[int] = None  # Optional: focus on a specific finding


class ResearchRequest(BaseModel):
    finding_id: int
    query_type: str = "vulnerability"  # vulnerability|remediation|suspicious|reputation
