Build a REAL, FUNCTIONAL Electron.js desktop application for the following hackathon problem.

==================================================
PROJECT
==================================================

Name:
AI-Assisted Software Supply Chain Risk & Integrity Platform

Problem:
PS-01 — Software Supply Chain Vulnerability Detection & Risk Assessment

REFERENCE:
There is an existing UI design file named `stitch_file.html`.
Use it as the visual design reference and preserve its visual language, layout, typography, colors, spacing, cards, navigation, and component style.

There is also a project presentation describing the intended solution:
- GitHub + local repository scanning
- npm + Python support
- OSV / advisory correlation
- dependency graph
- contextual risk
- AI evidence/remediation
- permissioned blockchain trust ledger

The implementation must turn those ideas into a REAL working prototype.

==================================================
CORE PRODUCT GOAL
==================================================

The application must take a REAL:

1. Local repository
OR
2. Remote GitHub repository

and actually perform:

Repository
→ Dependency extraction
→ Dependency graph
→ Vulnerability detection
→ Suspicious/risky dependency analysis
→ Contextual risk assessment
→ Risk score + priority
→ Evidence + explanation
→ Remediation recommendation
→ Human review
→ Blockchain-backed scan record

NO SIMULATED RESULTS.

NO FAKE CVEs.

NO HARDCODED FINDINGS.

NO FAKE DEPENDENCY GRAPH.

NO MOCK "SCAN COMPLETE" RESULTS.

Every displayed result must originate from actual analysis.

==================================================
PS-01 REQUIREMENTS TO COVER
==================================================

The prototype must address:

- Analyze manifests, dependency trees, package metadata and repositories.
- Identify known vulnerabilities.
- Identify suspicious/risky components where evidence exists.
- Detect risky or unexpected dependency relationships.
- Support direct and transitive dependency analysis.
- Map vulnerable components to dependent projects/services.
- Prioritize risk using severity, exposure, exploitability, criticality and context.
- Explain findings using evidence.
- Recommend practical remediation.
- Support repeat scans.
- Provide a security dashboard/report.
- Distinguish confirmed vulnerabilities from unverified suspicion.
- Remain useful when dependency metadata is incomplete.
- Never automatically modify production software.
- Keep sensitive source code protected.
- Recommendations are decision support and require human review.

==================================================
IMPORTANT PRODUCT BOUNDARY
==================================================

DO NOT turn this into:
- a generic chatbot
- a fake vulnerability dashboard
- a simulation-only app
- a source-code AI reviewer with no real dependency analysis
- a simple wrapper around OSV
- an automatic remediation system

The main purpose is:

REAL REPOSITORY
→ REAL DEPENDENCY ANALYSIS
→ REAL SECURITY INTELLIGENCE
→ REAL RISK PRIORITIZATION
→ REAL ACTIONABLE RESULT

==================================================
TECH STACK
==================================================

Desktop:
- Electron.js

Frontend:
- React
- Vite
- Tailwind CSS
- Cytoscape.js

Backend:
- Python 3.x
- FastAPI

Dependency / graph:
- NetworkX

Repository/source analysis:
- Tree-sitter or language-specific parsers

Vulnerability intelligence:
- OSV API
- GitHub Advisory Database where practical
- CVSS / EPSS / KEV data where available

Database:
- PostgreSQL
- SQLAlchemy or SQLModel

AI:
- LLM API with tool/function calling
- structured JSON outputs

Blockchain:
- Hyperledger Fabric or another permissioned blockchain
- store hashes and assessment metadata only

Deployment:
- Docker / Docker Compose

==================================================
APPLICATION ARCHITECTURE
==================================================

Electron
│
├── React Renderer
│
├── Electron Main Process
│
└── Local FastAPI backend
      │
      ├── Repository scanner
      ├── Manifest parser
      ├── Dependency resolver
      ├── Dependency graph
      ├── Vulnerability intelligence
      ├── Source analysis
      ├── Risk engine
      ├── AI investigator
      ├── Database
      └── Trust ledger

Electron must communicate with the backend safely.

Use:
- preload scripts
- contextIsolation
- secure IPC
- no direct Node.js APIs in renderer

==================================================
UI STRUCTURE
==================================================

Use `stitch_file.html` as the visual source of truth.

Main navigation:

1. Dashboard
2. Local Repository
3. GitHub Repository
4. Findings
5. Dependency Graph
6. AI Investigation
7. Scan History
8. Trust Ledger
9. Settings

==================================================
LOCAL REPOSITORY PAGE
==================================================

User can:

- select a repository folder
- select a ZIP file

Required context inputs:

Environment:
- Development
- Staging
- Production

Exposure:
- Internal
- Internet-facing

Business Criticality:
- Low
- Medium
- High
- Critical

Button:

START SCAN

The scanner MUST:
- operate read-only
- never modify the repository
- never execute arbitrary repository code
- use a temporary isolated workspace when needed
- clean up temporary files after scan

==================================================
GITHUB REPOSITORY PAGE
==================================================

Inputs:

GitHub URL
Branch (optional)
Commit/tag (optional)

Example:

https://github.com/user/repository

Download/clone into an isolated temporary directory.

Support public repositories first.

Design the architecture so authenticated private repositories can be added later.

Do NOT require node_modules.

==================================================
DEPENDENCY DISCOVERY
==================================================

For npm:

Read:
- package.json
- package-lock.json
- npm-shrinkwrap.json when available

For Python:

Read:
- requirements.txt
- pyproject.toml
- poetry.lock
- Pipfile
- Pipfile.lock

The scanner must work WITHOUT node_modules.

For npm:

package.json
→ direct declared dependencies

package-lock.json
→ exact resolved versions
→ transitive dependencies
→ dependency relationships

If lockfile is missing:
- still analyze direct dependencies
- mark exact transitive dependency data as incomplete
- reduce confidence
- clearly explain the limitation

Example UI:

Dependency metadata:
PARTIAL

Direct dependencies:
AVAILABLE

Exact transitive versions:
UNAVAILABLE

Confidence:
REDUCED

This is REQUIRED.

==================================================
IGNORE RULES
==================================================

Do not scan by default:

node_modules/
.git/
dist/
build/
coverage/
.cache/
temporary build outputs

Avoid secrets:

.env
private keys
credentials
tokens
API keys

Allow configurable exclusions.

==================================================
DEPENDENCY GRAPH
==================================================

Create a real dependency graph using NetworkX.

Example:

Application
├── Package A
│   └── Package B
│       └── Package C
└── Package D

Each package node must contain:

- name
- version
- ecosystem
- direct/transitive
- depth
- parents
- dependency path
- vulnerability count
- suspicion score
- risk score
- confidence

Edges represent:

depends_on

Frontend visualization:
Cytoscape.js

The graph must be generated from the scanned repository.

NO fake graph data.

Clicking a node opens its details.

==================================================
VULNERABILITY ANALYSIS
==================================================

Use OSV as the primary vulnerability intelligence source.

For each package/version:

Query OSV.

Where practical, enrich findings with:
- GitHub Advisory Database
- CVSS
- EPSS
- KEV

Normalize all results into a common internal format.

Finding fields:

- ID
- package
- version
- ecosystem
- vulnerability ID
- CVE/GHSA
- severity
- affected range
- fixed version
- source
- published date
- modified date
- exploitability data
- confidence

Use batched OSV queries where possible.

CACHE results during each scan.

IMPORTANT:

The AI must NOT decide whether a CVE exists.

External security intelligence + deterministic matching are the source of truth.

==================================================
SOURCE CODE ANALYSIS
==================================================

The prototype must also analyze source code because source usage is relevant to risk.

Support:
- JavaScript
- TypeScript
- Python

Use Tree-sitter or appropriate parsers.

Determine:
- whether a dependency is imported
- where it is used
- relevant files
- relevant functions/modules
- whether security-sensitive use can be identified
- usage evidence

Example:

Package:
axios@1.5.0

Source evidence:
src/services/payment.js
line 42

The UI should show a small relevant code excerpt.

Do not dump entire files.

Do not claim exploitability unless evidence supports it.

==================================================
FINDING CLASSIFICATION
==================================================

Every finding MUST be classified as one of:

CONFIRMED_VULNERABILITY
SUSPICIOUS_SIGNAL
ANOMALY
UNKNOWN

Definitions:

CONFIRMED_VULNERABILITY:
Supported by authoritative vulnerability intelligence.

SUSPICIOUS_SIGNAL:
Evidence suggests risk but does not prove malicious behavior.

ANOMALY:
Unexpected/unusual dependency or component characteristic.

UNKNOWN:
Insufficient evidence.

NEVER claim:
"This package is malicious"

unless authoritative evidence actually supports that conclusion.

==================================================
SUSPICION ANALYSIS
==================================================

Where sufficient package/repository metadata exists, identify signals such as:

- unexpected dependency
- newly introduced dependency
- unusual dependency relationship
- suspicious install scripts
- anomalous package metadata
- suspicious package behavior signals
- abandoned/outdated package indicators
- malicious-package advisory if available
- typosquatting-like naming similarity

Aggregate evidence instead of treating one weak signal as proof.

Return:

suspicion_score
confidence
evidence[]

==================================================
CONTEXTUAL RISK ENGINE
==================================================

DO NOT equate:

risk = CVSS

Risk must consider context.

Inputs:

1. Severity
2. Exploitability
3. Exposure
4. Environment
5. Business criticality
6. Direct/transitive position
7. Dependency depth
8. Number of dependent components
9. Source usage evidence
10. Reachability confidence
11. Metadata completeness
12. Suspicion signals
13. Intelligence confidence

Output:

risk_score: 0–100

risk_level:
- Critical
- High
- Medium
- Low
- Informational

confidence: 0–100

metadata_completeness: 0–100

IMPORTANT:

Risk and confidence are separate.

Example:

Risk = 92
Confidence = 68

Meaning:
Potentially severe, but evidence is incomplete.

The risk calculation should be transparent and explainable.

Store the individual factors contributing to the score.

==================================================
EXAMPLE RISK ASSESSMENT
==================================================

Package:
axios@1.5.0

Severity:
High

Exploitability:
High

Environment:
Production

Exposure:
Internet-facing

Business Criticality:
High

Dependency:
Transitive

Source Usage:
Confirmed

Metadata Completeness:
High

Risk:
91/100

Priority:
CRITICAL

==================================================
FINDINGS PAGE
==================================================

Display:

Total packages
Direct dependencies
Transitive dependencies
Confirmed vulnerabilities
Suspicious components
Anomalies

Then findings table:

Type
Package
Version
Severity
Risk
Confidence
Direct/Transitive
Priority
Status

Sorting:
- priority
- risk
- severity
- confidence

Filtering:
- Critical
- High
- Medium
- Low
- Confirmed
- Suspicious
- Anomaly

==================================================
FINDING DETAIL
==================================================

Show:

Package
Version
Ecosystem

Classification

Vulnerability ID

Severity

Risk score

Confidence

Environment

Exposure

Business criticality

Direct/transitive

Dependency depth

Dependency path

Source-code evidence

Security intelligence

Risk factors

Why prioritized

AI explanation

Recommendation

Human review status

==================================================
AI INVESTIGATION
==================================================

Build an actual AI investigation chat.

The AI must be able to inspect the repository and scan results through TOOLS.

Tools:

list_repository_files()
read_file(path, start_line, end_line)
get_manifest()
get_dependency(package)
get_dependency_path(package)
get_dependency_graph()
get_finding(finding_id)
get_vulnerability(package, version)
get_source_usage(package)
get_project_context()
get_risk_assessment(finding_id)
get_scan_summary()
get_previous_scan(scan_id)
get_trust_record(scan_id)

Example user questions:

"Why is this vulnerability critical?"

"Show me the dependency path."

"Where is this package used?"

"Why is this finding ranked above another one?"

"Is this a confirmed vulnerability or suspicion?"

"Show me the evidence."

"What should we do?"

"Which application component is affected?"

"Why is the confidence low?"

The AI MUST investigate using tools before answering.

It must return:

Assessment
Evidence
Reasoning
Risk factors
Confidence
Recommendation

The AI must never invent evidence.

==================================================
AI SAFETY RULES
==================================================

The model must:

- distinguish confirmed vulnerability from suspicion
- mention uncertainty
- mention missing metadata
- mention conflicting or incomplete intelligence
- never say "safe" merely because no advisory was found
- never modify files
- never run remediation commands automatically
- never update dependencies automatically
- never deploy anything
- never execute arbitrary repository code
- keep recommendations as decision support
- require human approval

The AI is an evidence interpretation layer.

It is NOT the vulnerability database.

==================================================
HUMAN REVIEW
==================================================

Every recommendation must support:

ACCEPT
REJECT
INVESTIGATE
OVERRIDE

Store:
- reviewer
- action
- timestamp
- comment

Example:

AI:
Upgrade package X.

Reviewer:
INVESTIGATE

Comment:
"Check compatibility before upgrade."

This review becomes part of scan history.

==================================================
SCAN HISTORY
==================================================

Store every scan.

Show:

Repository
Commit
Timestamp
Dependency count
Finding count
Risk summary
Changes since previous scan

Support comparison:

Previous scan
VS
Current scan

Show:

- new dependency
- removed dependency
- version changed
- new vulnerability
- resolved vulnerability
- risk changed
- confidence changed

This supports repeat assessment.

==================================================
TRUST LEDGER / BLOCKCHAIN
==================================================

Implement blockchain ONLY for integrity and traceability.

Do not store source code on-chain.

Do not store complete repositories on-chain.

Do not store full SBOM on-chain.

Store:

scan ID
repository hash
SBOM/dependency-state hash
findings hash
risk assessment hash
review decision hash
timestamp
signature/assessment metadata

Use Hyperledger Fabric or another permissioned ledger.

Functions:

record_scan()
record_review()
verify_scan()
get_history()

The application must allow:

"Verify this scan"

and return:

VERIFIED
or
INTEGRITY MISMATCH

Purpose:

A tamper-evident history of:
- scan state
- security findings
- risk assessment
- human review decisions

==================================================
DATABASE
==================================================

PostgreSQL tables:

repositories
scans
packages
dependencies
vulnerabilities
findings
risk_assessments
recommendations
review_decisions
scan_artifacts
trust_records

Use SQLAlchemy or SQLModel.

==================================================
API
==================================================

Create APIs similar to:

POST /api/scan/local
POST /api/scan/github

GET /api/scan/{scan_id}
GET /api/scan/{scan_id}/summary
GET /api/scan/{scan_id}/packages
GET /api/scan/{scan_id}/findings
GET /api/scan/{scan_id}/graph
GET /api/scan/{scan_id}/history

GET /api/finding/{finding_id}

POST /api/review/{finding_id}

POST /api/ai/investigate

POST /api/trust/record
GET /api/trust/{scan_id}
GET /api/trust/{scan_id}/verify

Provide real-time scan progress using WebSocket or SSE.

==================================================
SCAN PROGRESS
==================================================

Show actual progress:

1. Loading repository
2. Detecting manifests
3. Parsing dependencies
4. Building dependency graph
5. Querying vulnerability intelligence
6. Analyzing source usage
7. Assessing contextual risk
8. Generating findings
9. Saving scan
10. Recording trust hash

Do not fake progress values.

==================================================
PRIVACY AND SECURITY
==================================================

Repository source code may contain sensitive intellectual property.

Therefore:

- prefer local analysis
- do not send entire repository to an LLM
- send only necessary structured metadata and small relevant excerpts
- exclude secrets
- never expose secrets in logs
- never persist API keys in repository scans
- local analysis must be read-only
- temporary files must be removed after scanning

==================================================
ERROR HANDLING
==================================================

Gracefully handle:

- invalid GitHub URL
- inaccessible repository
- missing manifest
- malformed manifest
- missing lockfile
- OSV unavailable
- GitHub Advisory unavailable
- AI API unavailable
- PostgreSQL unavailable
- blockchain unavailable

The scan should degrade gracefully.

Example:

"OSV is temporarily unavailable. Dependency analysis completed, but vulnerability correlation could not be completed. Risk confidence is reduced."

==================================================
DEMO REPOSITORY
==================================================

Create a separate test repository containing:
- vulnerable npm dependency
- transitive vulnerable dependency
- source-code usage
- normal dependency

Optionally include a suspicious dependency signal.

The actual application must discover these naturally.

Do not hardcode the demo results into the application.

==================================================
PROJECT STRUCTURE
==================================================

/project
  /electron
  /frontend
  /backend
    /api
    /scanner
    /parsers
    /dependency
    /graph
    /intelligence
    /source_analysis
    /risk
    /ai
    /trust
    /models
    /services
  /database
  /blockchain
  /shared
  stitch_file.html
  docker-compose.yml

==================================================
IMPLEMENTATION ORDER
==================================================

Implement in this order.

PHASE 1
Electron + React + Vite

PHASE 2
Load the Stitch UI faithfully.

PHASE 3
Local repository selection and scanning.

PHASE 4
GitHub repository scanning.

PHASE 5
Manifest and lockfile parsing.

PHASE 6
Real dependency graph.

PHASE 7
OSV vulnerability detection.

PHASE 8
Contextual risk engine.

PHASE 9
Source-code usage analysis.

PHASE 10
AI investigation tools.

PHASE 11
Findings + recommendations.

PHASE 12
Human review.

PHASE 13
Scan history / repeat assessment.

PHASE 14
Blockchain trust ledger.

PHASE 15
Security hardening and polish.

IMPORTANT:
Do NOT build the entire UI first and fill it with fake data.
Build one complete REAL vertical slice first:

GitHub/local repository
→ package.json/package-lock.json
→ dependency extraction
→ OSV
→ dependency graph
→ risk score
→ finding
→ AI explanation
→ human review
→ hash record

Once this works, expand the application.

==================================================
DEFINITION OF DONE
==================================================

The prototype is successful when I can give it a REAL repository and it can:

1. Find its dependencies.
2. Identify direct and transitive relationships.
3. Query real vulnerability data.
4. Identify real vulnerable versions.
5. Analyze relevant source-code usage.
6. Calculate contextual risk.
7. Rank findings by priority.
8. Explain why a finding is important.
9. Distinguish confirmed vulnerabilities from suspicious signals.
10. Explain missing/incomplete metadata.
11. Recommend practical remediation.
12. Allow human review.
13. Repeat the scan after repository changes.
14. Record the scan and review hashes.
15. Verify the stored integrity record.

The final product should feel like a REAL security-analysis desktop application, not a presentation prototype.

Build cleanly, modularly, with strong error handling, logging, typing, testable services, and no fabricated functionality.