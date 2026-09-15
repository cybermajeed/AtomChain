import json
import re
from typing import List, Dict, Any

class PythonParser:
    def __init__(self, requirements_txt: str = "", pipfile_lock: str = ""):
        self.requirements_txt = requirements_txt or ""
        self.pipfile_lock = pipfile_lock or ""
        
    def parse(self) -> List[Dict[str, Any]]:
        """
        Parses python dependency files and returns a list of dependencies.
        Returns: [{"name": "requests", "version": "2.25.1", "is_direct": True, "ecosystem": "PyPI"}, ...]
        """
        deps = []
        seen = set()

        # Parse Pipfile.lock if available
        if self.pipfile_lock:
            try:
                lock_data = json.loads(self.pipfile_lock)
                for section in ["default", "develop"]:
                    for pkg_name, pkg_info in lock_data.get(section, {}).items():
                        if isinstance(pkg_info, dict):
                            version = pkg_info.get("version", "").strip("=")
                            if version:
                                deps.append({
                                    "name": pkg_name,
                                    "version": version,
                                    "is_direct": section == "default",
                                    "ecosystem": "PyPI"
                                })
                                seen.add(pkg_name.lower())
            except json.JSONDecodeError:
                pass

        # Parse requirements.txt
        if self.requirements_txt:
            lines = self.requirements_txt.splitlines()
            for line in lines:
                line = line.split('#')[0].strip()
                if not line:
                    continue
                match = re.match(r'^([a-zA-Z0-9_\-\.]+)(?:\[.*?\])?==([\w\.]+)', line)
                if match:
                    name, version = match.group(1), match.group(2)
                else:
                    name_match = re.match(r'^([a-zA-Z0-9_\-\.]+)', line)
                    if not name_match:
                        continue
                    name = name_match.group(1)
                    version_match = re.search(r'[>=~^]+([\w\.]+)', line)
                    version = version_match.group(1) if version_match else "0.0.0"
                
                if name.lower() not in seen:
                    deps.append({
                        "name": name,
                        "version": version,
                        "is_direct": True,
                        "ecosystem": "PyPI"
                    })
                    seen.add(name.lower())
                
        return deps
