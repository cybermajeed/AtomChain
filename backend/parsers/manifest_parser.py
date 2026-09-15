"""
Multi-ecosystem dependency manifest discovery & parsing.

Finds and parses the widest practical set of dependency manifests so that ANY
project language can be scanned — not just npm. Every dependency is normalized
into: {name, version, is_direct, ecosystem} where `ecosystem` uses the exact
OSV.dev naming (npm, PyPI, Go, crates.io, Maven, NuGet, RubyGems, Packagist).
"""
import json
import os
import re
import tomllib
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional, Tuple

# ─── OSV ecosystem identifiers ────────────────────────────────────────────────
ECOSYSTEM_NPM = "npm"
ECOSYSTEM_PYPI = "PyPI"
ECOSYSTEM_GO = "Go"
ECOSYSTEM_CARGO = "crates.io"
ECOSYSTEM_MAVEN = "Maven"
ECOSYSTEM_NUGET = "NuGet"
ECOSYSTEM_RUBY = "RubyGems"
ECOSYSTEM_PHP = "Packagist"

# Directories that hold generated/vendored deps — never scan inside them.
EXCLUDED_DIRS = {
    "node_modules", "bower_components",
    ".git", ".hg", ".svn",
    "dist", "build", "out", "target", "dist-electron", "coverage",
    ".venv", "venv", "env", "envs", ".tox", ".nox",
    "__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    "site-packages", ".gradle", ".idea", ".vscode", ".next", ".nuxt",
}

# Maximum manifests processed per scan (protects against pathological repos).
MAX_MANIFEST_FILES = 300
MAX_MANIFEST_BYTES = 1_500_000


class ManifestParser:
    def __init__(self):
        self._direct_names: set = set()   # names known to be direct (cross-file)

    # ─── Public API ───────────────────────────────────────────────────────────

    def collect(self, root_dir: str) -> List[Dict[str, Any]]:
        """Walk `root_dir`, discover supported manifests, and parse them."""
        if not root_dir or not os.path.isdir(root_dir):
            return []

        manifest_paths: List[str] = []
        for current, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
            for name in files:
                if len(manifest_paths) >= MAX_MANIFEST_FILES:
                    break
                if self._is_manifest(name):
                    manifest_paths.append(os.path.join(current, name))
            if len(manifest_paths) >= MAX_MANIFEST_FILES:
                break

        # Lockfiles are parsed AFTER primary manifests so exact versions can
        # upgrade range-style versions while preserving the "direct" flag.
        manifest_paths.sort(key=lambda p: self._file_kind(os.path.basename(p)))

        files: Dict[str, str] = {}
        for path in manifest_paths:
            try:
                if os.path.getsize(path) > MAX_MANIFEST_BYTES:
                    continue
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    rel = os.path.relpath(path, root_dir)
                    files[rel] = f.read()
            except Exception as e:
                print(f"[ManifestParser] skipped {path}: {e}")

        return self.parse_files(files)

    def parse_files(self, files: Dict[str, str]) -> List[Dict[str, Any]]:
        """Parse in-memory manifests keyed by relative path -> raw content."""
        staged: List[Dict[str, Any]] = []
        for rel_path, content in (files or {}).items():
            if not content:
                continue
            basename = os.path.basename(rel_path)
            if not self._is_manifest(basename):
                continue
            handler = self._handler_for(basename)
            if handler is None:
                continue
            try:
                parsed = handler(content)
                if parsed:
                    staged.extend(parsed)
            except Exception as e:
                print(f"[ManifestParser] failed parsing {rel_path}: {e}")

        return self._merge(staged)

    # ─── Manifest classification ──────────────────────────────────────────────

    _DIRECT_FILES = {
        "package.json", "requirements.txt", "requirements.in",
        "dev-requirements.txt", "test-requirements.txt", "constraints.txt",
        "constraints.in", "pipfile", "pyproject.toml", "setup.py", "setup.cfg",
        "gems.rb", "gemfile", "go.mod", "cargo.toml", "composer.json",
        "pom.xml", "packages.config", "environment.yml", "environment.yaml",
    }

    def _is_manifest(self, name: str) -> bool:
        base = name.lower()
        if base in self._DIRECT_FILES:
            return True
        if base in {"package-lock.json", "npm-shrinkwrap.json", "yarn.lock",
                    "pnpm-lock.yaml", "pnpm-lock.yml", "pipfile.lock",
                    "poetry.lock", "cargo.lock", "gemfile.lock", "composer.lock",
                    "go.sum"}:
            return True
        if base.startswith("requirements-") and base.endswith(".txt"):
            return True
        if base.endswith((".csproj", ".fsproj", ".props")):
            return True
        return False

    def _file_kind(self, name: str) -> int:
        """Sort key: 0 = primary manifest first, 1 = lockfile second."""
        if name.lower() in {"package-lock.json", "npm-shrinkwrap.json",
                            "yarn.lock", "pnpm-lock.yaml", "pnpm-lock.yml",
                            "pipfile.lock", "poetry.lock", "cargo.lock",
                            "gemfile.lock", "composer.lock", "go.sum"}:
            return 1
        return 0

    def _handler_for(self, basename: str):
        base = basename.lower()
        table = {
            "package.json": self._parse_package_json,
            "package-lock.json": self._parse_package_lock,
            "npm-shrinkwrap.json": self._parse_package_lock,
            "yarn.lock": self._parse_yarn_lock,
            "pnpm-lock.yaml": self._parse_pnpm_lock,
            "pnpm-lock.yml": self._parse_pnpm_lock,
            "pipfile": self._parse_pipfile,
            "pipfile.lock": self._parse_pipfile_lock,
            "pyproject.toml": self._parse_pyproject_toml,
            "poetry.lock": self._parse_poetry_lock,
            "setup.py": self._parse_setup_py,
            "setup.cfg": self._parse_setup_cfg,
            "go.mod": self._parse_go_mod,
            "cargo.toml": self._parse_cargo_toml,
            "cargo.lock": self._parse_cargo_lock,
            "gemfile": self._parse_gemfile,
            "gems.rb": self._parse_gemfile,
            "gemfile.lock": self._parse_gemfile_lock,
            "composer.json": self._parse_composer_json,
            "composer.lock": self._parse_composer_lock,
            "pom.xml": self._parse_pom_xml,
            "packages.config": self._parse_packages_config,
            "environment.yml": self._parse_environment_yml,
            "environment.yaml": self._parse_environment_yml,
        }
        if base in table:
            return table[base]
        if base.startswith("requirements-") and base.endswith(".txt"):
            return self._parse_requirements
        if base in {"requirements.txt", "requirements.in", "constraints.txt",
                    "constraints.in"}:
            return self._parse_requirements
        if base.endswith((".csproj", ".fsproj", ".props")):
            return self._parse_csproj
        return None

    # ─── npm ──────────────────────────────────────────────────────────────────

    def _parse_package_json(self, content: str) -> List[Dict[str, Any]]:
        data = json.loads(content)
        deps: List[Dict[str, Any]] = []
        sections = ("dependencies", "devDependencies", "optionalDependencies",
                    "peerDependencies")
        for section in sections:
            for name, spec in data.get(section, {}).items():
                deps.append({
                    "name": name,
                    "version": self._clean_semver(str(spec)),
                    "is_direct": True,
                    "ecosystem": ECOSYSTEM_NPM,
                })
        return deps

    def _parse_package_lock(self, content: str) -> List[Dict[str, Any]]:
        data = json.loads(content)
        packages = data.get("packages", {})
        if packages:
            root = packages.get("", {}) or {}
            direct = set(root.get("dependencies", {}))
            direct.update(root.get("devDependencies", {}))
            direct.update(root.get("optionalDependencies", {}))
            out = []
            for path, info in packages.items():
                if path == "" or not info or not info.get("version"):
                    continue
                name = path.split("node_modules/")[-1]
                out.append({
                    "name": name,
                    "version": str(info["version"]),
                    "is_direct": name in direct,
                    "ecosystem": ECOSYSTEM_NPM,
                })
            return out
        # Lockfile v1
        out = []
        for name, info in data.get("dependencies", {}).items():
            out.append({
                "name": name,
                "version": str(info.get("version", "")) or "0.0.0",
                "is_direct": False,
                "ecosystem": ECOSYSTEM_NPM,
            })
        return out

    def _parse_yarn_lock(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        parts = re.split(r"\n(?=[^\s])", content)
        for part in parts:
            header = part.split("\n", 1)[0].strip() if "\n" in part else part.strip()
            m = re.search(r"version \"([^\"]+)\"", part)
            version = m.group(1) if m else ""
            # Header looks like: '"pkg@^1.0.0", "pkg@~1.0.0":' or 'pkg@^1.0.0:'
            keys = re.findall(r'"([^"]+)"|([A-Za-z0-9@_.\-/]+(?:@[^":,]+))', header)
            for quoted, plain in keys:
                token = quoted or plain
                token = token.rstrip(",:").strip()
                if not token:
                    continue
                name = self._yarn_token_name(token)
                if name:
                    out.append({
                        "name": name,
                        "version": version or self._yarn_token_range(token),
                        "is_direct": False,
                        "ecosystem": ECOSYSTEM_NPM,
                    })
        return out

    @staticmethod
    def _yarn_token_name(token: str) -> str:
        token = token.strip().strip('"').rstrip(',')
        # Workspace/native tokens like 'react-native@npm:0.71.0' or '@babel/core@^7'
        if "@npm:" in token:
            token = token.split("@npm:")[0]
        if token.endswith(":"):
            token = token[:-1]
        # Name is everything before the LAST '@' that begins a version/range.
        m = re.match(r"^(@?[A-Za-z0-9_.\-]+)(?:@(.*))?$", token)
        if not m:
            return ""
        return m.group(1)

    @staticmethod
    def _yarn_token_range(token: str) -> str:
        m = re.match(r"^@?[A-Za-z0-9_.\-]+@(?:npm:)?(.+)$", token)
        return m.group(1) if m else ""

    def _parse_pnpm_lock(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        direct: Dict[str, str] = {}

        # Importers section: direct deps with `version:` / `specifier:` values.
        current_group = None
        for line in content.splitlines():
            if re.match(r"^\s{2,}\w[\w.-]*:$", line):
                current_group = line.strip().rstrip(":")
            m_ver = re.match(r"^\s{4}version:\s*['\"]?([^'\"\s]+)", line)
            if m_ver and current_group:
                name = current_group
                direct[name] = m_ver.group(1)
        # Also expose importers deps that only have specifier (no exact pin).
        spec_match = re.findall(r"^\s{4}specifier:\s*['\"]?([^'\"\s]+)", content,
                                re.MULTILINE)
        if spec_match:
            line_names = re.findall(r"^\s{2}([A-Za-z0-9._\-]+):\s*$", content,
                                    re.MULTILINE)
            for name in line_names:
                direct.setdefault(name, "")

        # packages section: `@scope/name@1.2.3:` or `/name/1.2.3:` keys.
        for name, version in re.findall(
            r"^\s{2,}(/[^/]+/[^:\s]+|@?[A-Za-z0-9._\-]+)@([A-Za-z0-9_.\-+]+):\s*$",
            content, re.MULTILINE,
        ):
            clean_name = name.lstrip("/").split("/")[-1]
            clean_name = clean_name.rsplit("/", 1)[-1] if False else clean_name
            out.append({
                "name": clean_name,
                "version": version,
                "is_direct": False,
                "ecosystem": ECOSYSTEM_NPM,
            })

        for name, version in direct.items():
            out.append({
                "name": name,
                "version": version,
                "is_direct": True,
                "ecosystem": ECOSYSTEM_NPM,
            })
        return out

    @staticmethod
    def _clean_semver(spec: str) -> str:
        """Strip semver range operators, keep the first concrete version token."""
        spec = spec.split(";")[0].strip()
        m = re.search(r"(\d+\.\d+(?:\.\d+)?(?:[-+][A-Za-z0-9\-_.]+)?)", spec)
        return m.group(1) if m else spec.replace("^", "").replace("~", "").strip()

    # ─── Python / PyPI ────────────────────────────────────────────────────────

    def _parse_requirements(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for line in content.splitlines():
            spec = line.split("#")[0].strip()
            if not spec or spec.startswith(("-r", "-c", "-e", "--", "-i",
                                           "-f", "-e ")):
                continue
            parsed = self._parse_requirement(spec)
            if parsed:
                name, version = parsed
                out.append({
                    "name": name, "version": version,
                    "is_direct": True, "ecosystem": ECOSYSTEM_PYPI,
                })
        return out

    def _parse_requirement(self, spec: str) -> Optional[Tuple[str, str]]:
        spec = spec.split(";")[0].strip()
        spec = re.sub(r"\[[^\]]*\]", "", spec)  # strip extras: requests[socks]
        m = re.match(r"^([A-Za-z0-9][A-Za-z0-9._-]*)", spec)
        if not m:
            return None
        name = m.group(1)
        # Exact pin or best-effort version: grab the first X.Y token.
        vm = re.search(r"([0-9]+(?:\.[0-9A-Za-z!._-]+)+)", spec)
        version = vm.group(1) if vm else ""
        return name, version

    def _parse_pipfile(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            data = tomllib.loads(content)
        except Exception:
            return out
        for section in ("packages", "dev-packages"):
            for name, spec in data.get(section, {}).items():
                if not isinstance(spec, (str, dict)):
                    continue
                version = ""
                if isinstance(spec, str):
                    version = self._clean_semver(spec)
                elif isinstance(spec, dict):
                    version = self._clean_semver(str(spec.get("version", "")))
                out.append({
                    "name": name, "version": version,
                    "is_direct": True, "ecosystem": ECOSYSTEM_PYPI,
                })
        return out

    def _parse_pipfile_lock(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            data = json.loads(content)
        except Exception:
            return out
        for section in ("default", "develop"):
            for name, info in data.get(section, {}).items():
                if not isinstance(info, dict):
                    continue
                version = str(info.get("version", "")).strip("=")
                out.append({
                    "name": name, "version": version,
                    "is_direct": section == "default",
                    "ecosystem": ECOSYSTEM_PYPI,
                })
        return out

    def _parse_pyproject_toml(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            data = tomllib.loads(content)
        except Exception:
            return out

        project = data.get("project", {}) or {}
        for spec in project.get("dependencies", []):
            parsed = self._parse_requirement(spec)
            if parsed:
                name, version = parsed
                out.append({"name": name, "version": version, "is_direct": True,
                            "ecosystem": ECOSYSTEM_PYPI})
        for _group, specs in (project.get("optional-dependencies", {}) or {}).items():
            for spec in specs:
                parsed = self._parse_requirement(spec)
                if parsed:
                    name, version = parsed
                    out.append({"name": name, "version": version,
                                "is_direct": True, "ecosystem": ECOSYSTEM_PYPI})

        def _poetry_deps(section: dict, direct: bool):
            for name, spec in (section or {}).items():
                if name == "python" or not isinstance(spec, (str, dict)):
                    continue
                version = spec if isinstance(spec, str) else spec.get("version", "")
                if isinstance(version, str) and version.startswith("{"):
                    version = ""
                version = self._clean_semver(str(version)) if version else ""
                out.append({"name": name, "version": version,
                            "is_direct": direct, "ecosystem": ECOSYSTEM_PYPI})

        poetry = data.get("tool", {}).get("poetry", {}) or {}
        _poetry_deps(poetry.get("dependencies"), True)
        _poetry_deps(poetry.get("dev-dependencies"), True)
        for group in (poetry.get("group", {}) or {}).values():
            _poetry_deps(group.get("dependencies"), True)

        uv = data.get("dependency-groups", {}) or {}
        for _group, specs in uv.items():
            if isinstance(specs, list):
                for spec in specs:
                    if isinstance(spec, dict):
                        spec = spec.get("include", "")
                    if isinstance(spec, str):
                        parsed = self._parse_requirement(spec)
                        if parsed:
                            name, version = parsed
                            out.append({"name": name, "version": version,
                                        "is_direct": True,
                                        "ecosystem": ECOSYSTEM_PYPI})
        return out

    def _parse_poetry_lock(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            data = tomllib.loads(content)
        except Exception:
            return out
        for pkg in data.get("package", []) or []:
            name = pkg.get("name")
            version = pkg.get("version")
            if not name or not version:
                continue
            out.append({
                "name": name, "version": str(version),
                "is_direct": pkg.get("category") == "main",
                "ecosystem": ECOSYSTEM_PYPI,
            })
        return out

    def _parse_setup_py(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for match in re.findall(r"(?:install_requires|dependencies)\s*=\s*\[([^\]]*)\]",
                                content, re.DOTALL):
            for spec in re.findall(r"['\"]([^'\"]+)['\"]", match):
                parsed = self._parse_requirement(spec)
                if parsed:
                    name, version = parsed
                    out.append({"name": name, "version": version,
                                "is_direct": True, "ecosystem": ECOSYSTEM_PYPI})
        return out

    def _parse_setup_cfg(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        in_req = False
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("install_requires"):
                in_req = True
                continue
            if in_req and any(stripped.startswith(prefix)
                              for prefix in ("[", "packages", "package_dir",
                                             "python_requires", "setup_requires")):
                in_req = False
            if in_req and stripped:
                parsed = self._parse_requirement(stripped)
                if parsed:
                    name, version = parsed
                    out.append({"name": name, "version": version,
                                "is_direct": True, "ecosystem": ECOSYSTEM_PYPI})
        return out

    def _parse_environment_yml(self, content: str) -> List[Dict[str, Any]]:
        """conda environment.yml — PyPI-pinnable deps are surfaced as PyPI."""
        out: List[Dict[str, Any]] = []
        in_deps = False
        for line in content.splitlines():
            stripped = line.strip()
            if not in_deps:
                if stripped.lower().startswith("dependencies"):
                    in_deps = True
                continue
            if not stripped.startswith("-") and not stripped.startswith("- "):
                # A de-indented top-level key ends the dependencies block.
                if re.match(r"^\S", line):
                    break
                continue
            item = stripped.lstrip("- ").strip()
            if not item or item.startswith("#"):
                continue
            if item.startswith("pip:"):
                continue
            name_item, _, version = item.partition("=")
            name_item = name_item.rstrip(":").strip()
            if not version:
                version = ""
            if name_item.lower() in ("python", "pip", "wheel", "setuptools"):
                continue
            parsed = self._parse_requirement(f"{name_item}{('==' + version) if version else ''}")
            if parsed:
                name, ver = parsed
                out.append({"name": name, "version": version or ver,
                            "is_direct": True, "ecosystem": ECOSYSTEM_PYPI})
        # Nested `pip:` requirements block
        pip_match = re.search(r"^\s{2,}pip:\s*\n(.*?)(?=^\S|\Z)", content,
                              re.MULTILINE | re.DOTALL)
        if pip_match:
            for spec in pip_match.group(1).splitlines():
                spec = spec.strip().lstrip("- ").strip()
                if not spec or spec.startswith("#"):
                    continue
                parsed = self._parse_requirement(spec)
                if parsed:
                    name, ver = parsed
                    out.append({"name": name, "version": ver,
                                "is_direct": True, "ecosystem": ECOSYSTEM_PYPI})
        return out

    # ─── Go ───────────────────────────────────────────────────────────────────

    def _parse_go_mod(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        in_require = False
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("require ("):
                in_require = True
                continue
            if in_require:
                if stripped.startswith(")"):
                    in_require = False
                    continue
                line = stripped
            elif stripped.startswith("require "):
                line = stripped[len("require "):].strip()
            else:
                continue
            if not line or line.startswith("("):
                continue
            indirect = "// indirect" in line
            line = line.split("//")[0].strip()
            parts = line.split()
            if len(parts) < 2:
                continue
            mod, ver = parts[0], parts[1]
            ver = ver.lstrip("v")
            out.append({
                "name": mod, "version": ver,
                "is_direct": not indirect,
                "ecosystem": ECOSYSTEM_GO,
            })
        return out

    # ─── Rust ─────────────────────────────────────────────────────────────────

    def _parse_cargo_toml(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            data = tomllib.loads(content)
        except Exception:
            return out
        sections = [("dependencies", "dependencies"),
                    ("dev-dependencies", "dev-dependencies"),
                    ("build-dependencies", "build-dependencies")]
        for _key, section in sections:
            for name, spec in (data.get(section, {}) or {}).items():
                version = spec if isinstance(spec, str) else spec.get("version", "") if isinstance(spec, dict) else ""
                if isinstance(spec, dict) and spec.get("workspace") is True:
                    continue
                if not isinstance(version, str):
                    version = ""
                out.append({
                    "name": name,
                    "version": self._clean_semver(version) if version else "",
                    "is_direct": True,
                    "ecosystem": ECOSYSTEM_CARGO,
                })
        for name, spec in (data.get("workspace", {}).get("dependencies", {}) or {}).items():
            version = spec if isinstance(spec, str) else spec.get("version", "") if isinstance(spec, dict) else ""
            if isinstance(spec, dict) and spec.get("workspace") is True:
                continue
            out.append({
                "name": name,
                "version": self._clean_semver(str(version)) if version else "",
                "is_direct": True,
                "ecosystem": ECOSYSTEM_CARGO,
            })
        return out

    def _parse_cargo_lock(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            data = tomllib.loads(content)
        except Exception:
            return out
        for pkg in data.get("package", []) or []:
            if pkg.get("source"):  # git/registry sourced
                out.append({
                    "name": pkg["name"],
                    "version": str(pkg.get("version", "")),
                    "is_direct": False,
                    "ecosystem": ECOSYSTEM_CARGO,
                })
        return out

    # ─── Ruby ─────────────────────────────────────────────────────────────────

    def _parse_gemfile(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for m in re.finditer(r"^\s*gem\s+['\"]([^'\"]+)['\"]\s*(?:,\s*['\"]([^'\"]+)['\"])?",
                             content, re.MULTILINE):
            name, constraint = m.group(1), m.group(2) or ""
            out.append({
                "name": name,
                "version": self._clean_semver(constraint) if constraint else "",
                "is_direct": True,
                "ecosystem": ECOSYSTEM_RUBY,
            })
        return out

    def _parse_gemfile_lock(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for m in re.finditer(r"^\s{4}([A-Za-z0-9_.\-]+)\s+\(([^)]+)\)", content,
                             re.MULTILINE):
            out.append({
                "name": m.group(1),
                "version": m.group(2).split(",")[0].strip(),
                "is_direct": False,
                "ecosystem": ECOSYSTEM_RUBY,
            })
        return out

    # ─── PHP ──────────────────────────────────────────────────────────────────

    def _parse_composer_json(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            data = json.loads(content)
        except Exception:
            return out
        for section in ("require", "require-dev"):
            for name, spec in data.get(section, {}).items():
                if name == "php":
                    continue
                out.append({
                    "name": name,
                    "version": self._clean_semver(str(spec)),
                    "is_direct": True,
                    "ecosystem": ECOSYSTEM_PHP,
                })
        return out

    def _parse_composer_lock(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            data = json.loads(content)
        except Exception:
            return out
        for section in ("packages", "packages-dev"):
            direct = section == "packages"
            for pkg in data.get(section, []) or []:
                if not pkg.get("name"):
                    continue
                out.append({
                    "name": pkg["name"],
                    "version": str(pkg.get("version", "")).lstrip("v"),
                    "is_direct": direct,
                    "ecosystem": ECOSYSTEM_PHP,
                })
        return out

    # ─── Java / Maven ─────────────────────────────────────────────────────────

    @staticmethod
    def _xml_children(el, tag: str):
        return [c for c in list(el) if c.tag.split("}")[-1] == tag]

    def _parse_pom_xml(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            return out
        for group in self._xml_children(root, "dependencies"):
            for dep in self._xml_children(group, "dependency"):
                fields = {c.tag.split("}")[-1]: (c.text or "").strip()
                          for c in list(dep)}
                if fields.get("scope") == "provided" or fields.get("systemPath"):
                    continue
                artifact = fields.get("artifactId")
                if not artifact:
                    continue
                group_id = fields.get("groupId", "")
                version = fields.get("version", "")
                name = f"{group_id}:{artifact}" if group_id else artifact
                out.append({
                    "name": name,
                    "version": version,
                    "is_direct": True,
                    "ecosystem": ECOSYSTEM_MAVEN,
                })
        return out

    # ─── .NET / NuGet ─────────────────────────────────────────────────────────

    def _parse_packages_config(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for m in re.finditer(r'<package\s+id="([^"]+)"\s+version="([^"]+)"', content):
            out.append({
                "name": m.group(1),
                "version": m.group(2),
                "is_direct": True,
                "ecosystem": ECOSYSTEM_NUGET,
            })
        return out

    def _parse_csproj(self, content: str) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for m in re.finditer(
            r'<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]*)")?'
            r'|\bVersion="([^"]*)"\s+Include="([^"]+)"',
            content):
            name = m.group(1) or m.group(4)
            version = m.group(2) or m.group(3) or ""
            if not name:
                continue
            out.append({
                "name": name,
                "version": version,
                "is_direct": True,
                "ecosystem": ECOSYSTEM_NUGET,
            })
        return out

    # ─── Deduplication ────────────────────────────────────────────────────────

    @staticmethod
    def _is_range(version: str) -> bool:
        return any(ch in version for ch in ("^", "~", "<", ">", "=", ",", "*", "|"))

    def _merge(self, deps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        merged: Dict[Tuple[str, str], Dict[str, Any]] = {}
        order: List[Tuple[str, str]] = []
        for dep in deps:
            key = (dep.get("ecosystem", ECOSYSTEM_NPM), dep["name"].lower())
            if key not in merged:
                merged[key] = dict(dep)
                order.append(key)
                continue
            prev = merged[key]
            # Lockfile exact versions upgrade range-style declared versions.
            if prev.get("version") and dep.get("version"):
                if self._is_range(prev["version"]) and not self._is_range(dep["version"]):
                    prev["version"] = dep["version"]
            if not prev.get("is_direct") and dep.get("is_direct"):
                prev["is_direct"] = True
        return [merged[k] for k in order]