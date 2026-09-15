import os
import subprocess
import tempfile
import shutil
import urllib.parse
import urllib.request as urlrequest
import tarfile

class GitManager:
    def __init__(self):
        pass

    @staticmethod
    def clear_all_temp_repos():
        """Clears any orphaned temporary repository directories."""
        temp_base = tempfile.gettempdir()
        for item in os.listdir(temp_base):
            if item.startswith("sustainverse_"):
                path = os.path.join(temp_base, item)
                if os.path.isdir(path):
                    shutil.rmtree(path, ignore_errors=True)

    def fetch_repo_tarball(self, repo_url: str, branch: str = None, github_token: str = None) -> str:
        """
        Downloads a GitHub repository as a tarball and extracts it into a temporary directory.
        Returns the path to the temporary directory.
        """
        temp_dir = tempfile.mkdtemp(prefix="sustainverse_")
        
        parsed = urllib.parse.urlparse(repo_url)
        if not parsed.scheme:
            repo_url = f"https://{repo_url}"
            parsed = urllib.parse.urlparse(repo_url)

        path_parts = parsed.path.strip("/").split("/")
        if len(path_parts) < 2:
            raise Exception("Invalid GitHub repository URL")
        owner, repo = path_parts[0], path_parts[1].replace(".git", "")

        api_url = f"https://api.github.com/repos/{owner}/{repo}/tarball"
        if branch:
            api_url += f"/{branch}"

        req = urlrequest.Request(api_url)
        if github_token:
            req.add_header("Authorization", f"token {github_token}")
        req.add_header("User-Agent", "AtomChain-Scanner")
        req.add_header("Accept", "application/vnd.github.v3+json")

        tar_path = os.path.join(temp_dir, "repo.tar.gz")
        try:
            with urlrequest.urlopen(req, timeout=30) as response, open(tar_path, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
            
            with tarfile.open(tar_path, "r:gz") as tar:
                # Security: prevent path traversal in tar
                def is_within_directory(directory, target):
                    abs_directory = os.path.abspath(directory)
                    abs_target = os.path.abspath(target)
                    prefix = os.path.commonprefix([abs_directory, abs_target])
                    return prefix == abs_directory
                
                def safe_extract(tar, path=".", members=None, *, numeric_owner=False):
                    for member in tar.getmembers():
                        member_path = os.path.join(path, member.name)
                        if not is_within_directory(path, member_path):
                            raise Exception("Attempted Path Traversal in Tar File")
                    tar.extractall(path, members, numeric_owner=numeric_owner)

                safe_extract(tar, temp_dir)
            
            os.remove(tar_path)
            
            # The tarball extracts into a subfolder like `owner-repo-commitHash/`
            extracted_items = os.listdir(temp_dir)
            if len(extracted_items) == 1:
                inner_dir = os.path.join(temp_dir, extracted_items[0])
                if os.path.isdir(inner_dir):
                    return inner_dir
                    
            return temp_dir
        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise Exception(f"Failed to fetch repository tarball: {e}")

    def cleanup(self, path: str):
        """Removes the temporary directory."""
        if path and os.path.exists(path) and "sustainverse_" in path:
            shutil.rmtree(path, ignore_errors=True)
