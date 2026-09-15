import os
import shutil
import zipfile
from parsers.python_parser import PythonParser
from scanner.zip_manager import ZipManager

def test_python_parser():
    print("Testing PythonParser...")
    req_txt = "requests==2.25.1\ndjango>=3.2\n"
    parser = PythonParser(requirements_txt=req_txt)
    deps = parser.parse()
    assert len(deps) == 2, f"Expected 2 deps, got {len(deps)}"
    assert deps[0]["name"] == "requests"
    assert deps[0]["version"] == "2.25.1"
    assert deps[1]["name"] == "django"
    assert deps[1]["version"] == "3.2"
    print("PythonParser test passed.")

def test_zip_manager():
    print("Testing ZipManager...")
    # Create a dummy zip file
    dummy_zip = "test.zip"
    with zipfile.ZipFile(dummy_zip, "w") as z:
        z.writestr("requirements.txt", "flask==2.0.1")
        
    with open(dummy_zip, "rb") as f:
        zip_bytes = f.read()
        
    temp_dir = ZipManager.extract_zip_archive(zip_bytes)
    assert os.path.exists(temp_dir), "Temp dir should exist"
    assert os.path.exists(os.path.join(temp_dir, "requirements.txt")), "requirements.txt should exist"
    
    with open(os.path.join(temp_dir, "requirements.txt"), "r") as f:
        content = f.read()
    assert content == "flask==2.0.1", f"Content mismatch: {content}"
    
    shutil.rmtree(temp_dir)
    os.remove(dummy_zip)
    print("ZipManager test passed.")

if __name__ == "__main__":
    test_python_parser()
    test_zip_manager()
    print("All tests passed.")
