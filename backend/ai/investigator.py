import os
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from database import Finding, Scan

class AIInvestigator:
    def __init__(self, api_key: str):
        # Allow passing user-provided key, default to env if missing
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key:
            raise ValueError("Gemini API Key is required")
            
        self.client = genai.Client(api_key=key)

    def investigate(self, finding_id: int, user_query: str, db: Session) -> str:
        """
        Investigates a specific finding using Gemini 1.5 Pro.
        """
        finding = db.query(Finding).filter(Finding.id == finding_id).first()
        if not finding:
            return "Finding not found."

        # Provide context
        system_instruction = (
            "You are a Senior Security Engineer investigating a software supply chain vulnerability. "
            "Your job is to analyze the evidence and answer the user's questions truthfully. "
            "Do not invent evidence. If confidence is low, say so. "
            "You are an evidence interpretation layer, not the vulnerability database."
        )

        context = f"""
        Context:
        Package: {finding.package_name}@{finding.version}
        Type: {finding.finding_type}
        Severity: {finding.severity}
        Risk Score: {finding.risk_score}
        Confidence: {finding.confidence}
        Vulnerability ID: {finding.vulnerability_id}
        """

        prompt = f"{context}\n\nUser Question: {user_query}"

        # Using gemini-1.5-pro as specified in the plan for advanced reasoning
        response = self.client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            )
        )
        
        return response.text
