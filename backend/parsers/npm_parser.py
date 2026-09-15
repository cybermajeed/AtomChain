from typing import List, Dict, Any, Optional

class NpmParser:
    def __init__(self, package_json: Optional[dict] = None, package_lock_json: Optional[dict] = None):
        """
        Accepts the raw JSON dictionaries of package.json and package-lock.json directly from the GitHub API.
        This completely bypasses disk I/O and `npm install` overhead.
        """
        self.package_json = package_json
        self.package_lock_json = package_lock_json

    def parse(self) -> List[Dict[str, Any]]:
        """
        Parses the lockfile (or package.json as fallback) and returns a list of dependencies.
        Returns: [{"name": "axios", "version": "1.5.0", "is_direct": True}, ...]
        """
        if self.package_lock_json:
            packages = self.package_lock_json.get('packages', {})
            if not packages:
                # Fallback for older lockfiles (v1)
                packages = self.package_lock_json.get('dependencies', {})
                return self._parse_v1(packages)
            return self._parse_v3(packages)
            
        # SPEED OPTIMIZATION: If no lockfile exists, fall back to package.json immediately.
        if self.package_json:
            return self._parse_package_json()
            
        return []

    def _parse_package_json(self) -> List[Dict[str, Any]]:
        """
        Fallback parser that only grabs direct dependencies from package.json.
        """
        deps = []
        direct_deps = self.package_json.get('dependencies', {})
        dev_deps = self.package_json.get('devDependencies', {})
        
        # Combine them
        all_deps = {**direct_deps, **dev_deps}
        
        for name, version in all_deps.items():
            # Strip semver prefixes (^, ~, >, >=, <=)
            clean_version = version.replace('^', '').replace('~', '').replace('>', '').replace('<', '').replace('=', '').strip()
            deps.append({
                "name": name,
                "version": clean_version,
                "is_direct": True,
                "ecosystem": "npm"
            })
            
        return deps

    def _parse_v3(self, packages: dict) -> List[Dict[str, Any]]:
        deps = []
        root_package = packages.get("", {})
        direct_deps = set(root_package.get("dependencies", {}).keys())
        direct_deps.update(root_package.get("devDependencies", {}).keys())
        
        for path, info in packages.items():
            if path == "":
                continue
                
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
        deps = []
        for name, info in dependencies.items():
            deps.append({
                "name": name,
                "version": info.get("version"),
                "is_direct": False,
                "ecosystem": "npm"
            })
        return deps
