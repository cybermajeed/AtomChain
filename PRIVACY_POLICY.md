# Privacy Policy

**Last Updated:** September 15, 2026

This Privacy Policy explains how AtomChain ("we", "our", or "us") handles information when you use our local desktop application.

## 1. Local-First Architecture
AtomChain is designed as a local-first application. All core processing, including repository cloning (`backend/scanner/git_manager.py`), dependency parsing, and risk assessment (`backend/risk/engine.py`), occurs on your local machine.

## 2. Data We Do Not Collect
We **do not** collect, store, or transmit to our servers:
- Your source code or repository contents.
- Your scan results, dependency graphs, or risk assessments.
- Your personal information, IP address, or usage telemetry.
- Your API keys.

All scan history and trust ledger records are stored locally in a SQLite database on your device (`backend/database.py`).

## 3. Third-Party Services and Data Transmission
While the Application does not send data to us, it does communicate with third-party services to function:
- **OSV API (osv.dev):** The Application transmits package names and versions to fetch vulnerability data (`backend/intelligence/osv_client.py`).
- **Google Gemini API:** When using the AI Investigator, the Application transmits specific finding metadata (package name, version, severity, and vulnerability ID) and your explicit queries to Google's API (`backend/ai/investigator.py`). Source code is not transmitted automatically.
- **GitHub:** The Application fetches repository data directly from GitHub using standard Git protocols.

Please refer to the respective privacy policies of OSV, Google, and GitHub for information on how they handle data transmitted to their APIs.

## 4. User Controls and Data Deletion
Because all data is stored locally, you have complete control over it. You can delete all scan history, findings, and trust ledger records by deleting the `atomchain.db` file from the application's backend directory.

## 5. Security
Your API keys (e.g., Gemini API Key) are utilized locally and sent directly to the respective provider. They are not transmitted to or stored by any centralized AtomChain server.

## 6. Changes to This Policy
We may update this Privacy Policy from time to time to reflect changes in our practices or the Application's features. We will notify you of any changes by updating the "Last Updated" date at the top of this policy.

---
*[Reviewer Note: This policy reflects the fact that the app is entirely local and does not include any telemetry or central DB. The legal entity name and contact details are omitted and should be added before publication.]*
