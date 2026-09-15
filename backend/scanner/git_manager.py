import os
import subprocess
import tempfile
import shutil
import urllib.parse

class GitManager:
    def __init__(self):
        pass

    def clone_repo(self, repo_url: str, branch: str = None) -> str:
        """
        Clones a GitHub repository shallowly (--depth 1) into a temporary directory.
        Returns the path to the temporary directory.
        """
        temp_dir = tempfile.mkdtemp(prefix="sustainverse_")
        
        # Prevent git from prompting for credentials on private repos by tweaking URL
        # and disabling terminal prompt
        parsed = urllib.parse.urlparse(repo_url)
        if not parsed.scheme:
            repo_url = f"https://{repo_url}"
            
        cmd = ["git", "clone", "--depth", "1"]
        if branch:
            cmd.extend(["--branch", branch])
            
        cmd.append(repo_url)
        cmd.append(temp_dir)
        
        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"
        
        try:
            result = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True,
                env=env
            )
            return temp_dir
        except subprocess.CalledProcessError as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise Exception(f"Failed to clone repository: {e.stderr}")

    def cleanup(self, path: str):
        """Removes the temporary directory."""
        if path and os.path.exists(path) and "sustainverse_" in path:
            shutil.rmtree(path, ignore_errors=True)
