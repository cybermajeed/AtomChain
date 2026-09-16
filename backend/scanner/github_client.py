import httpx
import base64
import json
from typing import Optional, Dict, Any

class GitHubAPIClient:
    def __init__(self, token: Optional[str] = None):
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3.raw",
            "User-Agent": "AtomChain-Backend"
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
            
    def get_file_content(self, owner: str, repo: str, file_path: str, branch: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Fetches a file's raw content directly via the GitHub API without cloning the repository.
        Parses it as JSON automatically.
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/contents/{file_path}"
        if branch:
            url += f"?ref={branch}"
            
        with httpx.Client(timeout=15.0, follow_redirects=False) as client:
            response = client.get(url, headers=self.headers)
            
            # Manually handle redirects (up to 3 times) to prevent httpx from stripping the Authorization header
            redirects = 0
            while response.status_code in (301, 302, 307, 308) and redirects < 3:
                redirect_url = response.headers.get("Location")
                if not redirect_url:
                    break
                response = client.get(redirect_url, headers=self.headers)
                redirects += 1
                    
            if response.status_code == 404:
                return None
            response.raise_for_status()
            
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                return response.text  # Return raw text for files like requirements.txt
