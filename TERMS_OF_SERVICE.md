# Terms of Service

**Last Updated:** September 15, 2026

Welcome to Sustainverse ("the Application"). These Terms of Service ("Terms") govern your use of the Sustainverse local desktop application and associated local backend services.

## 1. Acceptance of Terms
By downloading, installing, or using the Application, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Application.

## 2. Description of Service
Sustainverse is a locally executed software supply chain risk and integrity platform. It operates by analyzing local or remote Git repositories (`backend/scanner/git_manager.py`), extracting dependencies (`backend/parsers/npm_parser.py`), querying third-party vulnerability databases (`backend/intelligence/osv_client.py`), and utilizing AI models for investigation (`backend/ai/investigator.py`).

## 3. Account and Authentication
The Application operates entirely locally and does not require a central user account, subscription, or billing mechanism. However, use of the AI Investigator feature requires a valid API key for Google Gemini (`backend/ai/investigator.py`). You are solely responsible for obtaining this key and for any costs incurred from its use with your AI provider.

## 4. User Responsibilities & Acceptable Use
You agree to use the Application only to scan repositories for which you have the legal right or authorization to access and analyze. You agree not to use the Application to:
- Interfere with or disrupt third-party services (e.g., GitHub, OSV API).
- Attempt to circumvent the read-only nature of the repository scanner.

## 5. Third-Party Services
The Application integrates with external APIs, including:
- **OSV API (osv.dev):** Used to fetch vulnerability data.
- **Google Gemini API:** Used for AI-assisted investigation.
- **GitHub:** Used for cloning public repositories.

Your use of the Application is subject to the terms of service and rate limits of these respective third-party providers.

## 6. Disclaimers of Warranty and AI Output
**THE APPLICATION IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.** 
The Application provides risk assessments and security intelligence as decision support only. It is not a definitive security guarantee.
**AI-Generated Content:** The AI Investigator interprets evidence and generates explanations. AI outputs may be inaccurate, incomplete, or misleading. You must independently verify all AI-generated findings before making security decisions.

## 7. Limitation of Liability
To the maximum extent permitted by law, the developers of Sustainverse shall not be liable for any indirect, incidental, special, or consequential damages, including loss of data, arising from your use of the Application or reliance on its security assessments.

## 8. Changes to Terms
We reserve the right to modify these Terms at any time. Continued use of the Application following any changes constitutes your acceptance of the revised Terms.

---
*[Reviewer Note: This draft is based strictly on the current read-only, local-first architecture. It assumes no legal entity name or governing jurisdiction has been established. Please consult a qualified attorney to finalize governing law and venue clauses.]*
