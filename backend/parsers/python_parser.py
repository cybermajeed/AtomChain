from typing import List, Dict, Any
import re

class PythonParser:
    def __init__(self, requirements_txt: str):
        self.requirements_txt = requirements_txt or ""
        
    def parse(self) -> List[Dict[str, Any]]:
        """
        Parses a requirements.txt file and returns a list of dependencies.
        Returns: [{"name": "requests", "version": "2.25.1", "is_direct": True, "ecosystem": "PyPI"}, ...]
        """
        deps = []
        lines = self.requirements_txt.splitlines()
        
        for line in lines:
            # Strip comments and whitespace
            line = line.split('#')[0].strip()
            if not line:
                continue
                
            # Match standard pip formats like Django==3.2 or requests>=2.0.0
            # For this prototype, we'll try to extract exact == pins first
            match = re.match(r'^([a-zA-Z0-9_\-\.]+)(?:\[.*?\])?==([\w\.]+)', line)
            
            if match:
                name = match.group(1)
                version = match.group(2)
                
                deps.append({
                    "name": name,
                    "version": version,
                    "is_direct": True, # In requirements.txt, everything is usually flat
                    "ecosystem": "PyPI"
                })
            else:
                # Fallback: Just grab the name if not pinned with == (OSV might need version, but we can try)
                name_match = re.match(r'^([a-zA-Z0-9_\-\.]+)', line)
                if name_match:
                    name = name_match.group(1)
                    # Try to extract >= or ~= if == fails
                    version_match = re.search(r'[>=~^]+([\w\.]+)', line)
                    version = version_match.group(1) if version_match else "0.0.0"
                    
                    deps.append({
                        "name": name,
                        "version": version,
                        "is_direct": True,
                        "ecosystem": "PyPI"
                    })
                
        return deps
