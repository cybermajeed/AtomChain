The **Contextual Risk Score** in AtomChain is designed to move beyond generic, isolated vulnerability ratings (like CVSS) by evaluating *how* a vulnerability specifically impacts your codebase. 

It is calculated dynamically out of 100 points using three primary vectors (as implemented in [`backend/risk/engine.py`](file:///x:/hackathon/AtomChain/backend/risk/engine.py)):

### 1. Base Severity (Up to 50 Points)
We first check the qualitative severity reported directly by the OSV.dev database:
- **CRITICAL**: +50 points
- **HIGH**: +40 points
- **MODERATE/MEDIUM**: +25 points
- **UNKNOWN** *(but confirmed vulnerable)*: Defaults heavily to +30 points.

### 2. Topology Context (Up to 30 Points)
Not all vulnerabilities are equally accessible to attackers. We traverse the dependency graph to determine the "blast radius" distance:
- **Direct Dependencies**: If the vulnerability exists in a package you import directly, it represents maximum surface area exposure and receives the full **+30 point penalty**.
- **Transitive Dependencies**: If the vulnerability is buried deep in the dependency tree, the penalty decays algorithmically based on its depth (distance from your root project).

### 3. Exploit Probability (Up to 20 Points)
We analyze the metadata aliases associated with the finding to gauge real-world exploitability:
- **CVE Confirmed**: If OSV includes a registered CVE alias (Common Vulnerabilities and Exposures), we assume high public visibility and active exploitability, applying a **+20 point boost**.
- **Non-CVE OSV Finding**: Receives a baseline +10 points.

### Final Classification
The engine aggregates these points to generate a final `0-100` score for each finding. The **Overall Contextual Risk Score** of your project is determined by the highest scoring vulnerability:
- **≥ 90**: CRITICAL
- **≥ 70**: HIGH
- **≥ 40**: MEDIUM
- **< 40**: LOW

By combining severity, topological blast radius, and exploit probability, AtomChain provides a much more realistic threat model than a static scanner!