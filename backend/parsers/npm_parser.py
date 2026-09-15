import os
import json
import subprocess
from typing import List, Dict, Any

class NpmParser:
    def __init__(self, target_dir: str):
        self.target_dir = target_dir

    def ensure_lockfile(self):
        """
        If package-lock.json doesn't exist, generates it dynamically
        using npm install --package-lock-only.
        """
        lockfile_path = os.path.join(self.target_dir, 'package-lock.json')
        if not os.path.exists(lockfile_path):
            print("package-lock.json missing. Generating via npm...")
            try:
                # Use shell=True for Windows compatibility with npm.cmd
                subprocess.run(
                    "npm install --package-lock-only --ignore-scripts --no-audit --no-fund",
                    cwd=self.target_dir,
                    shell=True,
                    check=True,
                    capture_output=True
                )
            except subprocess.CalledProcessError as e:
                raise Exception(f"Failed to generate package-lock.json: {e.stderr}")

    def parse(self) -> List[Dict[str, Any]]:
        """
        Parses the lockfile and returns a list of dependencies.
        Returns: [{"name": "axios", "version": "1.5.0", "is_direct": True}, ...]
        """
        self.ensure_lockfile()
        
        lockfile_path = os.path.join(self.target_dir, 'package-lock.json')
        with open(lockfile_path, 'r', encoding='utf-8') as f:
            lock_data = json.load(f)
            
        packages = lock_data.get('packages', {})
        if not packages:
            # Fallback for older lockfiles (v1)
            packages = lock_data.get('dependencies', {})
            return self._parse_v1(packages)
            
        return self._parse_v3(packages)

    def _parse_v3(self, packages: dict) -> List[Dict[str, Any]]:
        deps = []
        root_package = packages.get("", {})
        direct_deps = set(root_package.get("dependencies", {}).keys())
        direct_deps.update(root_package.get("devDependencies", {}).keys())
        
        for path, info in packages.items():
            if path == "":
                continue
                
            # Path usually looks like "node_modules/axios"
            name = path.split("node_modules/")[-1]
            version = info.get("version")
            
            if not version:
                continue
                
            is_direct = name in direct_deps
            
            deps.append({
                "name": name,
                "version": version,
                "is_direct": is_direct,
                "ecosystem": "npm"
            })
            
        return deps

    def _parse_v1(self, dependencies: dict) -> List[Dict[str, Any]]:
        # Simplified parsing for v1
        deps = []
        for name, info in dependencies.items():
            deps.append({
                "name": name,
                "version": info.get("version"),
                "is_direct": False, # Hard to determine easily in v1 without package.json crossref
                "ecosystem": "npm"
            })
        return deps
