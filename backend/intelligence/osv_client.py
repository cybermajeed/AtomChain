import httpx
from typing import Dict, Any, List

class OSVClient:
    def __init__(self):
        self.base_url = "https://api.osv.dev/v1/query"

    def query_package(self, name: str, version: str, ecosystem: str = "npm") -> List[Dict[str, Any]]:
        """
        Queries the OSV API for a specific package and version.
        Returns a list of vulnerabilities.
        """
        payload = {
            "version": version,
            "package": {
                "name": name,
                "ecosystem": ecosystem
            }
        }
        
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(self.base_url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                return data.get("vulns", [])
        except Exception as e:
            print(f"Error querying OSV for {name}@{version}: {e}")
            return []

    def query_batch(self, packages: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Queries the OSV API for multiple packages in a single HTTP request.
        Returns a list of vulnerability lists, corresponding to each package queried.
        """
        if not packages:
            return []
            
        payload = {
            "queries": [
                {
                    "version": pkg["version"],
                    "package": {
                        "name": pkg["name"],
                        "ecosystem": pkg.get("ecosystem", "npm")
                    }
                } for pkg in packages
            ]
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post("https://api.osv.dev/v1/querybatch", json=payload)
                response.raise_for_status()
                data = response.json()
                
                return [result.get("vulns", []) for result in data.get("results", [])]
        except Exception as e:
            print(f"Error executing OSV batch query: {e}")
            # Fallback to empty results
            return [[] for _ in packages]

    def format_vulnerability(self, vuln_data: dict) -> dict:
        """
        Formats raw OSV vulnerability data into our internal standard.
        """
        vuln_id = vuln_data.get("id", "UNKNOWN")
        
        # Extract severity if available
        severity = "UNKNOWN"
        database_specific = vuln_data.get("database_specific", {})
        if "severity" in database_specific:
            severity = database_specific["severity"]
        
        # Try finding CVSS
        for rating in vuln_data.get("severity", []):
            if rating.get("type") == "CVSS_V3":
                score = rating.get("score")
                # Basic CVSS to qualitative mapping if OSV doesn't provide it
                if score:
                    try:
                        # Extract base score from vector, highly simplified
                        severity = "HIGH" # Placeholder logic
                    except:
                        pass
        
        # Look for aliases (CVEs)
        aliases = vuln_data.get("aliases", [])
        cve_id = next((a for a in aliases if a.startswith("CVE-")), None)
        
        return {
            "vulnerability_id": vuln_id,
            "cve": cve_id,
            "severity": severity,
            "summary": vuln_data.get("summary", "No summary provided"),
            "details": vuln_data.get("details", "")
        }
