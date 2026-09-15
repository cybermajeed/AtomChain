import os
import shutil
import zipfile
from parsers.python_parser import PythonParser
from parsers.manifest_parser import ManifestParser
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

def test_manifest_parser():
    print("Testing ManifestParser...")
    files = {
        "requirements.txt": "requests==2.25.1\ndjango>=3.2\nflask==2.0.1; python_version >= '3.8'\n",
        "pyproject.toml": "[project]\ndependencies = [\n  'fastapi>=0.100,<1',\n  'uvicorn[standard]~=0.23',\n]\n",
        "go.mod": "module example.com/app\n\ngo 1.21\n\nrequire (\n\tgithub.com/spf13/cobra v1.7.0\n\tgolang.org/x/text v0.3.7 // indirect\n)\n",
        "Cargo.lock": "[[package]]\nname = \"serde\"\nversion = \"1.0.150\"\nsource = \"registry+https://github.com/rust-lang/crates.io-index\"\n",
        "composer.json": '{"require": {"laravel/framework": "^10.0", "php": ">=8.1"}}',
        "environment.yml": "name: ml\nchannels:\n  - conda-forge\ndependencies:\n  - python=3.11\n  - numpy=1.24.3\n  - pip:\n      - scikit-learn==1.3.0\n",
        "packages.config": '<packages><package id="Newtonsoft.Json" version="13.0.1" /></packages>',
        "pom.xml": "<project><dependencies><dependency><groupId>com.google.guava</groupId><artifactId>guava</artifactId><version>32.1.0</version></dependency></dependencies></project>",
        "pom.xml_ignore": "placeholder",
    }
    del files["pom.xml_ignore"]

    deps = ManifestParser().parse_files(files)
    names = {(d["name"], d["ecosystem"]) for d in deps}
    print("Parsed deps:", sorted(d["name"] for d in deps))

    assert ("requests", "PyPI") in names
    assert ("django", "PyPI") in names
    assert ("fastapi", "PyPI") in names
    assert ("uvicorn", "PyPI") in names
    assert ("github.com/spf13/cobra", "Go") in names
    assert ("golang.org/x/text", "Go") in names
    assert ("serde", "crates.io") in names
    assert ("laravel/framework", "Packagist") in names
    assert ("numpy", "PyPI") in names
    assert ("scikit-learn", "PyPI") in names
    assert ("Newtonsoft.Json", "NuGet") in names
    assert ("com.google.guava:guava", "Maven") in names

    by_name = {d["name"]: d for d in deps}
    requests = by_name["requests"]
    assert requests["version"] == "2.25.1"
    assert requests["is_direct"] is True
    assert by_name["django"]["version"] == "3.2"
    assert by_name["serde"]["is_direct"] is False

    print("ManifestParser test passed.")

if __name__ == "__main__":
    test_python_parser()
    test_manifest_parser()
    test_zip_manager()
    print("All tests passed.")
