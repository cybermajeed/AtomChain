**TERMS OF SERVICES PROMPT**

Act as a product and commercial-terms counsel. I need you to draft an accurate, production-ready Terms of Service for this project — but before writing a single line, I want you to thoroughly analyze the codebase so the terms reflect what the application actually offers and how it actually behaves, not generic boilerplate.

Work in three stages:

1. **Investigate.** Audit the repository end to end and build an evidence-backed inventory of every term-relevant detail: what the service actually does and who can use it; how accounts and authentication work; any paid plans, billing, subscriptions, or in-app purchases; user-generated content and who owns or licenses it; AI or automated features and the nature/limits of their output; third-party services whose own terms flow through to users; usage limits, rate limits, or acceptable-use boundaries enforced in code; and any mechanisms for suspension, termination, or data deletion. Cite the specific files and lines that support each finding so the terms are defensible.  
2. **Confirm the gaps.** List anything that materially affects the terms but isn't determinable from code alone — legal entity name, governing law and venue, age/eligibility requirements, pricing and refund policy, warranty and liability posture, dispute-resolution preferences, and contact details. Ask me about these, or state a clearly-labeled assumption I can correct.  
3. **Draft.** Write a complete, well-structured Terms of Service that includes only the sections that genuinely apply to this project — typically: acceptance of terms, eligibility, account responsibilities, acceptable use, user content and licensing, paid terms (if any), intellectual property, third-party services, AI/automated-output disclaimers (if applicable), disclaimers of warranty, limitation of liability, indemnification, suspension and termination, changes to the terms, governing law, and contact information. Never assert a right, restriction, fee, or obligation the product doesn't actually support, and never omit one it does. Use bracketed placeholders for anything still unconfirmed, and close with reviewer notes flagging assumptions and a reminder that the draft should be reviewed by a qualified attorney before publication.

Prioritize accuracy and verifiability over completeness — a shorter set of terms that's true to the product is better than a thorough one that isn't.

**PRIVACY POLICY PROMPT**

Act as a privacy and compliance engineer. I need you to draft an accurate, production-ready privacy policy for this project — but before writing a single line, I want you to thoroughly analyze the codebase so the policy reflects what the application actually does, not generic boilerplate.

Work in three stages:

1. **Investigate.** Audit the repository end to end and build an evidence-backed inventory of every privacy-relevant detail: what personal data is collected, where it's stored, how it's secured, which third-party services and SDKs receive it, what tracking or telemetry exists, and which user-facing controls (deletion, export, consent) are actually implemented. Cite the specific files and lines that support each finding so the policy is defensible.  
2. **Confirm the gaps.** List anything that materially affects the policy but isn't determinable from code alone — legal entity name, governing jurisdiction, contact details, retention periods, target audience. Ask me about these, or state a clearly-labeled assumption I can correct.  
3. **Draft.** Write a complete, well-structured privacy policy that includes only the sections that genuinely apply to this project. Never claim a data practice, safeguard, or user right that the code doesn't support, and never omit one that it does. Use bracketed placeholders for anything still unconfirmed, and close with reviewer notes flagging assumptions and a reminder that the draft should be reviewed by a qualified attorney before publication.

Prioritize accuracy and verifiability over completeness — a shorter policy that's true to the code is better than a thorough one that isn't.

