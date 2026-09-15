import httpx
import concurrent.futures
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
            with httpx.Client(timeout=60.0) as client:
                response = client.post("https://api.osv.dev/v1/querybatch", json=payload)
                response.raise_for_status()
                data = response.json()
                
                # The /v1/querybatch endpoint only returns 'id' and 'modified'.
                # We need to fetch the full details for any vulnerabilities found.
                # Fetch details concurrently to keep the scan fast on large lists.
                results = []
                for result in data.get("results", []):
                    min_vulns = result.get("vulns", [])
                    vuln_ids = [v.get("id") for v in min_vulns]
                    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
                        fetched = list(pool.map(lambda vid: self._fetch_vuln_detail(client, vid), vuln_ids))
                    full_vulns = [
                        fetched_detail if fetched_detail is not None else min_vuln
                        for fetched_detail, min_vuln in zip(fetched, min_vulns)
                    ]
                    results.append(full_vulns)
                
                return results
        except Exception as e:
            print(f"Error executing OSV batch query: {e}")
            # Fallback to empty results
            return [[] for _ in packages]

    def _fetch_vuln_detail(self, client: httpx.Client, vuln_id: str) -> Any:
        """Fetches the full OSV record for a vulnerability id. Returns None on failure."""
        try:
            detail_res = client.get(f"https://api.osv.dev/v1/vulns/{vuln_id}")
            if detail_res.status_code == 200:
                return detail_res.json()
        except Exception as fetch_err:
            print(f"Failed to fetch full detail for {vuln_id}: {fetch_err}")
        return None

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
        
        # Try finding CVSS score from vector string (e.g. CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
        for rating in vuln_data.get("severity", []):
            score_str = rating.get("score", "")
            if rating.get("type") in ("CVSS_V3", "CVSS_V2") and score_str:
                try:
                    # Extract base score — it follows 'CVSS:x.x/' prefix if numeric, else parse /BM:
                    # OSV often provides the vector string; base score is in the last segment after '/'
                    # or as a plain float string.
                    if score_str.replace(".", "").isdigit():
                        base = float(score_str)
                    else:
                        # Vector string: try to extract numeric score via CVSS-like heuristic
                        # Fall back to severity from database_specific if available
                        base = None
                    if base is not None:
                        if base >= 9.0:
                            severity = "CRITICAL"
                        elif base >= 7.0:
                            severity = "HIGH"
                        elif base >= 4.0:
                            severity = "MEDIUM"
                        else:
                            severity = "LOW"
                except Exception:
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
