import os
import zipfile
import tempfile
import uuid
from pathlib import Path

class ZipManager:
    @staticmethod
    def extract_zip_archive(zip_bytes: bytes) -> str:
        """
        Extracts a ZIP archive from bytes into a secure temporary directory.
        Prevents Zip-Slip vulnerability by ensuring all extracted files 
        resolve within the target extraction directory.
        
        Returns:
            str: Path to the extracted temporary directory.
        """
        temp_dir = Path(tempfile.mkdtemp(prefix=f"atomchain_zip_{uuid.uuid4().hex[:8]}_"))
        
        # Write bytes to a temporary file first
        temp_zip_path = temp_dir / "upload.zip"
        with open(temp_zip_path, "wb") as f:
            f.write(zip_bytes)
            
        try:
            with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
                for member in zip_ref.namelist():
                    # Zip slip prevention
                    member_path = Path(member)
                    if member_path.is_absolute() or ".." in member_path.parts:
                        raise ValueError(f"Zip-slip attempt detected: {member}")
                    
                    # Prevent extracting outside temp_dir
                    target_path = (temp_dir / member).resolve()
                    if not str(target_path).startswith(str(temp_dir.resolve())):
                        raise ValueError(f"Zip-slip attempt detected: {member}")
                    
                    zip_ref.extract(member, temp_dir)
        except zipfile.BadZipFile as e:
            raise ValueError(f"Invalid ZIP archive: {str(e)}")
        finally:
            # Clean up the upload.zip file
            if temp_zip_path.exists():
                os.remove(temp_zip_path)
                
        return str(temp_dir)
