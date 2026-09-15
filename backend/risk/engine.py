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
        
        # 1. Base Severity (0-50 points)
        severity_map = {
            "CRITICAL": 50,
            "HIGH": 40,
            "MODERATE": 20,
            "MEDIUM": 20,
            "LOW": 10,
            "UNKNOWN": 5
        }
        base_score += severity_map.get(severity.upper(), 5)
        
        # 2. Dependency Position (0-30 points)
        if is_direct:
            base_score += 30
        else:
            # Decay score based on depth (e.g. depth 2 gets 20, depth 3 gets 10)
            depth_score = max(0, 30 - (graph_depth * 10))
            base_score += depth_score
            
        # 3. Environmental / Source Usage (0-20 points)
        # Assuming for now we found source usage (Tree-sitter analysis placeholder)
        source_usage_confirmed = finding_data.get("source_usage_confirmed", False)
        if source_usage_confirmed:
            base_score += 20
            
        # Normalize
        final_score = min(100, max(0, base_score))
        
        # Determine level
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
            "confidence": 85 if source_usage_confirmed else 60
        }
