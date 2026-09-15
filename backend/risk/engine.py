class RiskEngine:
    def __init__(self):
        pass

    def calculate_risk(self, finding_data: dict, graph_depth: int, is_direct: bool) -> dict:
        """
        Calculates the contextual risk score (0-100) based on severity, 
        dependency depth, and other contextual factors.
        """
        base_score = 0
        severity = finding_data.get("severity", "UNKNOWN")
        cve = finding_data.get("cve", None)
        
        # 1. Base Severity (0-50 points)
        severity_map = {
            "CRITICAL": 50,
            "HIGH": 40,
            "MODERATE": 25,
            "MEDIUM": 25,
            "LOW": 15,
            "UNKNOWN": 10
        }
        
        # If it's a confirmed OSV vulnerability, it's inherently a threat.
        # Default it heavily towards 30 if UNKNOWN.
        base_sev_score = severity_map.get(severity.upper(), 30)
        base_score += base_sev_score
        
        # 2. Dependency Position Topology (0-30 points)
        if is_direct:
            base_score += 30
        else:
            depth_score = max(5, 30 - (graph_depth * 10))
            base_score += depth_score
            
        # 3. Exploit Probability / CVE Presence (0-20 points)
        if cve:
            base_score += 20
        else:
            base_score += 10 # still an OSV vulnerability
            
        # Normalize
        final_score = min(100, max(0, base_score))
        
        # Determine level based on final calculated score
        if final_score >= 90:
            level = "CRITICAL"
        elif final_score >= 70:
            level = "HIGH"
        elif final_score >= 40:
            level = "MEDIUM"
        else:
            level = "LOW"
            
        return {
            "score": final_score,
            "level": level,
            "confidence": 95 if cve else 80
        }
