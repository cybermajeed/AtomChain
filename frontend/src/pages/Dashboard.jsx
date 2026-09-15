import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Pulse, Globe, Lightning, ArrowRight, Warning, Folder, Archive, CaretDown, GitBranch } from '@phosphor-icons/react'
import FindingDetailPanel from '../components/FindingDetailPanel'
import AIScanSummary from '../components/AIScanSummary'

// Every dependency manifest the scanner understands (mirrors backend/parsers/manifest_parser.py)
const MANIFEST_EXACT = [
  'package.json', 'package-lock.json', 'npm-shrinkwrap.json',
  'yarn.lock', 'pnpm-lock.yaml', 'pnpm-lock.yml',
  'pipfile', 'pipfile.lock', 'pyproject.toml', 'poetry.lock',
  'setup.py', 'setup.cfg',
  'requirements.txt', 'requirements.in', 'dev-requirements.txt',
  'test-requirements.txt', 'constraints.txt', 'constraints.in',
  'go.mod', 'cargo.toml', 'cargo.lock',
  'gemfile', 'gems.rb', 'gemfile.lock',
  'composer.json', 'composer.lock', 'pom.xml', 'packages.config',
  'environment.yml', 'environment.yaml',
]

const isManifestFile = (name) => {
  const base = (name || '').toLowerCase()
  if (MANIFEST_EXACT.includes(base)) return true
  if (base.startsWith('requirements-') && base.endsWith('.txt')) return true
  if (base.endsWith('.csproj') || base.endsWith('.fsproj') || base.endsWith('.props')) return true
  return false
}

export default function Dashboard({ githubToken }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [repoUrl, setRepoUrl] = useState(() => localStorage.getItem('cached_repo_url') || '')
  const [localPath, setLocalPath] = useState(() => localStorage.getItem('cached_local_path') || '')
  const [scanResult, setScanResult] = useState(() => {
    const saved = localStorage.getItem('cached_scan_result')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) {}
    }
    return null
  })
  const [isScanning, setIsScanning] = useState(false)
  const [pollingId, setPollingId] = useState(null)
  const [selectedFinding, setSelectedFinding] = useState(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStage, setScanStage] = useState('Initializing scan...')
  const folderInputRef = useRef(null)
  const zipInputRef = useRef(null)
  const repoDropdownRef = useRef(null)
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false)
  const [userRepos, setUserRepos] = useState(null)
  const [reposLoading, setReposLoading] = useState(false)
  const [reposError, setReposError] = useState('')

  useEffect(() => {
    if (scanResult) {
      localStorage.setItem('cached_scan_result', JSON.stringify(scanResult))
    }
  }, [scanResult])

  // Handle History panel actions
  useEffect(() => {
    const historyScanId = searchParams.get('scan_id');
    if (historyScanId) {
      setPollingId(parseInt(historyScanId, 10));
      setIsScanning(true);
      setScanProgress(95);
      setScanStage('Loading cached history...');
      searchParams.delete('scan_id');
      setSearchParams(searchParams, { replace: true });
    }

    if (location.state?.rescanUrl) {
      const url = location.state.rescanUrl;
      // Need to clear the state so it doesn't infinite loop on re-renders
      navigate(location.pathname, { replace: true });
      
      if (url.startsWith('zip://') || url.startsWith('local://') || url.startsWith('folder://')) {
         setLocalPath(url);
         // Cannot easily auto-rescan zip/local without file selection, so just prefill
      } else {
         setRepoUrl(url);
         // Simulate clicking scan
         setTimeout(() => {
           const ev = new KeyboardEvent('keydown', { key: 'Enter' });
           document.getElementById('repo-input')?.dispatchEvent(ev);
         }, 500);
      }
    }
  }, [searchParams, location, navigate, setSearchParams]);

  useEffect(() => {
    if (repoUrl) localStorage.setItem('cached_repo_url', repoUrl)
  }, [repoUrl])

  useEffect(() => {
    if (localPath) localStorage.setItem('cached_local_path', localPath)
  }, [localPath])

  useEffect(() => {
    const lastScanId = localStorage.getItem('last_scan_id')
    if (!scanResult && lastScanId) {
      fetch(`http://127.0.0.1:8000/api/scan/${lastScanId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.status === 'COMPLETED') {
            setScanResult(data)
            localStorage.setItem('cached_scan_result', JSON.stringify(data))
          }
        })
        .catch(console.error)
    }
  }, [])

  const handleFolderClick = async () => {
    if (window.electronAPI?.selectDirectory) {
      const dir = await window.electronAPI.selectDirectory();
      if (dir) {
        setLocalPath(dir);
        return;
      }
    }
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  }

  const handleFolderChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let folderName = 'Local Project';
    const firstFile = files[0];
    if (firstFile.webkitRelativePath) {
      folderName = firstFile.webkitRelativePath.split('/')[0];
    } else if (firstFile.name) {
      folderName = firstFile.name;
    }
    setLocalPath(folderName);

    // Collect every supported dependency manifest inside the selected folder
    const manifests = files.filter((f) => isManifestFile(f.name));

    if (manifests.length === 0) {
      setScanResult({
        error: `No supported dependency manifests found in selected folder "${folderName}". Supported files: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml, requirements*.txt, Pipfile, Pipfile.lock, pyproject.toml, poetry.lock, setup.py, setup.cfg, go.mod, Cargo.toml, Cargo.lock, Gemfile, Gemfile.lock, composer.json, composer.lock, pom.xml, packages.config, *.csproj, environment.yml.`
      });
      return;
    }

    // Send manifests as raw text — the backend parses each format by type
    const manifestFiles = {};
    try {
      for (const f of manifests.slice(0, 150)) {
        const rel = f.webkitRelativePath || f.name;
        manifestFiles[rel] = await f.text();
      }
    } catch (readErr) {
      setScanResult({ error: `Failed to read manifest files in "${folderName}": ${readErr.message}` });
      return;
    }

    // Initiate scan with uploaded manifests
    setIsScanning(true);
    setScanResult(null);
    setSelectedFinding(null);
    setScanProgress(15);
    setScanStage(`Found ${manifests.length} dependency manifest(s) in "${folderName}". Initiating scan...`);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/scan/manifests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: manifestFiles, project_name: folderName })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to initiate scan from manifest files.');
      }
      const data = await res.json();
      setPollingId(data.scan_id);
    } catch (err) {
      console.error(err);
      setScanResult({ error: err.message || 'Failed to reach scan backend.' });
      setIsScanning(false);
      setScanProgress(0);
    }
  }


  const handleZipChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.zip')) return;

    setLocalPath(file.name);
    setIsScanning(true);
    setScanResult(null);
    setSelectedFinding(null);
    setScanProgress(15);
    setScanStage(`Uploading and extracting "${file.name}"...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/scan/zip', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to initiate zip scan.');
      }
      const data = await res.json();
      setPollingId(data.scan_id);
    } catch (err) {
      console.error(err);
      setScanResult({ error: err.message || 'Failed to reach scan backend.' });
      setIsScanning(false);
      setScanProgress(0);
    }
  }

  const handleScan = async () => {
    setIsScanning(true)
    setScanResult(null)
    setSelectedFinding(null)
    setScanProgress(5)
    setScanStage('Connecting to repository & verifying access...')
    try {
      // 1. Extract owner and repo from URL
      let owner, repoName;
      try {
        const urlObj = new URL(repoUrl);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length < 2) throw new Error();
        owner = parts[0];
        repoName = parts[1].replace('.git', '');
      } catch (e) {
        throw new Error('Invalid GitHub repository URL format. Please use https://github.com/owner/repo');
      }

      // 2. Check access via GitHub API (best-effort — skip if network unavailable)
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          signal: AbortSignal.timeout(8000),   // 8s cap — don't block forever
        });

        if (ghRes.ok) {
          const repoData = await ghRes.json();
          // Strict access check (must have push or admin rights)
          if (!repoData.permissions?.admin && !repoData.permissions?.push) {
            throw new Error('Security Error: You do not have write or admin access to this repository. You can only scan repositories you own.');
          }
        } else if (ghRes.status === 404 || ghRes.status === 403) {
          throw new Error('Security Error: You do not have access to this repository. If this is a private repo, ensure your Personal Access Token has the "repo" scope checked.');
        }
        // Any other non-OK status: let backend handle it
      } catch (ghErr) {
        // If it's our security error, re-throw it
        if (ghErr.message.startsWith('Security Error')) throw ghErr;
        // Otherwise it's a network/timeout error — skip the pre-check, backend will catch it
        console.warn('GitHub API pre-check skipped (network unavailable):', ghErr.message);
      }

      setScanProgress(15)
      setScanStage('Cloning repository files & lockfiles...')

      // 3. Proceed with backend scan
      const res = await fetch('http://127.0.0.1:8000/api/scan/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl, github_token: githubToken })
      })
      if (!res.ok) throw new Error('Failed to initiate scan')
      const data = await res.json()
      setPollingId(data.scan_id)
      setScanProgress(25)
      setScanStage('Parsing dependencies and lockfiles...')
    } catch (e) {
      console.error(e)
      setScanResult({ error: e.message || 'Failed to reach backend. Make sure Uvicorn is running on port 8000.' })
      setIsScanning(false)
      setScanProgress(0)
    }
  }

  const handleLocalScan = async () => {
    setIsScanning(true)
    setScanResult(null)
    setSelectedFinding(null)
    setScanProgress(25)
    setScanStage('Parsing dependencies and lockfiles from local directory...')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/scan/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ local_path: localPath })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to initiate local scan. Make sure the path is correct and contains a supported dependency manifest (package.json, requirements.txt, go.mod, pyproject.toml, etc.).');
      }
      const data = await res.json()
      setPollingId(data.scan_id)
    } catch (e) {
      console.error(e)
      setScanResult({ error: e.message || 'Failed to reach backend.' })
      setIsScanning(false)
      setScanProgress(0)
    }
  }

  const toggleRepoDropdown = async () => {
    if (isRepoDropdownOpen) {
      setIsRepoDropdownOpen(false)
      return
    }
    if (userRepos) {
      setReposError('')
      setIsRepoDropdownOpen(true)
      return
    }
    setReposLoading(true)
    setReposError('')
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner', {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'GitHub token invalid or expired. Please sign in again.' : `Failed to load repositories (${res.status}).`);
      }
      const data = await res.json();
      setUserRepos(data);
      setIsRepoDropdownOpen(true);
    } catch (e) {
      console.error(e)
      setReposError(e.message || 'Failed to load repositories.');
      setIsRepoDropdownOpen(true);
    } finally {
      setReposLoading(false)
    }
  }

  const selectRepo = (repo) => {
    setRepoUrl(`https://github.com/${repo.full_name}`)
    setIsRepoDropdownOpen(false)
  }

  useEffect(() => {
    if (!isRepoDropdownOpen) return;
    const onDocClick = (e) => {
      if (repoDropdownRef.current && !repoDropdownRef.current.contains(e.target)) {
        setIsRepoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isRepoDropdownOpen])

  // Realistic incremental progress while scanning is active
  useEffect(() => {
    if (!isScanning) return;

    const progressTimer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev < 30) {
          setScanStage('Cloning Git repository...')
          return Math.min(prev + 3, 30);
        } else if (prev < 55) {
          setScanStage('Extracting dependencies and package manifests...')
          return Math.min(prev + 2, 55);
        } else if (prev < 75) {
          setScanStage('Querying OSV vulnerability intelligence database...')
          return Math.min(prev + 1.5, 75);
        } else if (prev < 92) {
          setScanStage('Calculating blast radius, topology & risk scores...')
          return Math.min(prev + 0.8, 92);
        } else if (prev < 98) {
          setScanStage('Finalizing security audit report...')
          return Math.min(prev + 0.2, 98);
        } else if (prev < 99.5) {
          setScanStage('Compiling final security assessment...')
          return Math.min(prev + 0.05, 99.5);
        }
        return prev;
      })
    }, 600);

    return () => clearInterval(progressTimer);
  }, [isScanning])

  useEffect(() => {
    if (!pollingId) return;

    let consecutiveFailures = 0;
    let stalls = 0;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/scan/${pollingId}`)
        if (!res.ok) throw new Error('Poll failed')
        const data = await res.json()

        if (data.status === 'COMPLETED') {
          setScanProgress(100)
          setScanStage('Analysis complete!')
          setTimeout(() => {
            setScanResult(data)
            setIsScanning(false)
            setPollingId(null)
          }, 450)
          // Store scan_id for AI Investigator page
          localStorage.setItem('last_scan_id', data.scan_id)
        } else if (data.status === 'FAILED') {
          setScanResult({ error: data.error_message || 'Repository scanning failed. Check backend logs.' })
          setIsScanning(false)
          setPollingId(null)
          setScanProgress(0)
        } else {
          // Still pending/in-progress
          consecutiveFailures = 0;
          stalls += 1;
          if (stalls > 150) {  // ~5 minutes with no status change
            setScanResult({ error: 'The scan is taking too long. Please check that the backend is running and try again.' })
            setIsScanning(false)
            setPollingId(null)
            setScanProgress(0)
          }
        }
      } catch (e) {
        console.error(e)
        consecutiveFailures += 1
        if (consecutiveFailures >= 6) {  // ~12s of unreachable backend
          setScanResult({ error: 'Lost connection to the scan backend. Please make sure the backend is running and try again.' })
          setIsScanning(false)
          setPollingId(null)
          setScanProgress(0)
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [pollingId])

  return (
    <>
      {/* Hero Band */}
      <section className="bg-canvas-dark py-section px-6 border-b border-hairline-on-dark text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-canvas-dark to-canvas-dark"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-hero-display text-on-dark mb-4 uppercase tracking-tighter">
            SECURE YOUR <span className="text-primary">SUPPLY CHAIN</span>
          </h1>
          <p className="text-title-lg text-body max-w-2xl mx-auto mb-12 font-normal">
            Deep repository intelligence backed by cryptographic trust and AI analysis.
          </p>
          
          {/* Search Input on Dark */}
          <div className="max-w-2xl mx-auto flex items-center bg-surface-card-dark rounded-lg p-2 border border-hairline-on-dark shadow-2xl relative">
            <div className="pl-4 pr-2 text-muted-strong">
              <Globe size={20} />
            </div>
            <input 
              id="repo-input"
              type="text" 
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter GitHub Repository URL (e.g. facebook/react)"
              className="flex-1 bg-transparent text-body-md text-on-dark placeholder-muted-strong outline-none px-2 py-2"
              onKeyDown={(e) => e.key === 'Enter' && repoUrl && handleScan()}
            />
            <div ref={repoDropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={toggleRepoDropdown}
                disabled={isScanning}
                title="My Repositories"
                className="p-2 text-muted-strong hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CaretDown size={18} className={`transition-transform duration-200 ${isRepoDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isRepoDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-[26rem] max-w-[calc(100vw-4rem)] bg-surface-card-dark border border-hairline-on-dark rounded-lg shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-hairline-on-dark flex items-center justify-between">
                    <span className="text-body-sm font-medium text-on-dark">My Repositories</span>
                    {userRepos && !reposLoading && (
                      <span className="text-caption text-muted">{userRepos.length}</span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {reposLoading && (
                      <div className="px-4 py-3 text-body-sm text-muted flex items-center gap-2">
                        <Pulse size={16} className="animate-pulse" /> Loading repositories...
                      </div>
                    )}
                    {reposError && (
                      <div className="px-4 py-3 text-body-sm text-trading-down">{reposError}</div>
                    )}
                    {userRepos && userRepos.length === 0 && !reposLoading && !reposError && (
                      <div className="px-4 py-3 text-body-sm text-muted">
                        No repositories found.
                      </div>
                    )}
                    {userRepos && userRepos.length > 0 && userRepos.map((repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => selectRepo(repo)}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface-elevated-dark transition-colors flex items-center gap-3 border-b border-hairline-on-dark/40 last:border-0 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-md bg-surface-elevated-dark flex items-center justify-center text-muted shrink-0">
                          <GitBranch size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-body-sm text-on-dark truncate font-medium">{repo.full_name}</div>
                          {repo.description && (
                            <div className="text-caption text-muted truncate">{repo.description}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-caption text-muted">{repo.language || '—'}</span>
                          <span className={`text-caption ${repo.private ? 'text-muted-strong' : 'text-trading-up'}`}>
                            {repo.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={handleScan}
              disabled={isScanning || !repoUrl}
              className="ml-2 h-10 px-8 rounded-pill font-button text-on-primary bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isScanning ? (
                <>
                  <Pulse size={16} className="animate-pulse" /> Scanning...
                </>
              ) : (
                <>
                  <Lightning size={16} /> Scan Now
                </>
              )}
            </button>
          </div>

          {/* Local Scan Option */}
          <div className="max-w-2xl mx-auto mt-4 pt-4 border-t border-hairline-on-dark/40 flex items-center bg-surface-dark rounded-lg p-2 border shadow-inner">
            <input 
              type="file"
              ref={folderInputRef}
              webkitdirectory=""
              directory=""
              className="hidden"
              onChange={handleFolderChange}
            />
            <input 
              type="file"
              ref={zipInputRef}
              accept=".zip"
              className="hidden"
              onChange={handleZipChange}
            />
            <button 
              className="pl-3 pr-2 text-muted-strong hover:text-primary transition-colors cursor-pointer"
              onClick={handleFolderClick}
              title="Select Folder"
              type="button"
            >
              <Folder size={18} />
            </button>
            <button 
              className="pr-2 text-muted-strong hover:text-primary transition-colors cursor-pointer"
              onClick={() => zipInputRef.current?.click()}
              title="Upload ZIP Archive"
              type="button"
            >
              <Archive size={18} />
            </button>
            <input 
              type="text" 
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="Or scan local directory path / .zip file"
              className="flex-1 bg-transparent text-body-sm text-on-dark placeholder-muted-strong outline-none px-2 py-1.5"
              onKeyDown={(e) => e.key === 'Enter' && localPath && handleLocalScan()}
            />
            <button 
              onClick={handleLocalScan}
              disabled={isScanning || !localPath}
              className="ml-2 h-8 px-6 rounded-md font-button text-xs text-on-dark bg-surface-elevated-dark hover:bg-surface-card-dark disabled:bg-surface-dark disabled:text-muted border border-hairline-on-dark transition-colors whitespace-nowrap"
            >
              Scan Local
            </button>
          </div>
        </div>
      </section>

      {/* Results Section */}
      {(scanResult || isScanning) && (
        <section className="max-w-[1440px] mx-auto py-12 px-6 w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            <h2 className="text-display-sm text-on-dark">Scan Results</h2>
          </div>

          {isScanning && !scanResult ? (
            <div className="bg-surface-card-dark border border-hairline-on-dark rounded-2xl p-8 md:p-10 max-w-2xl mx-auto shadow-2xl relative overflow-hidden backdrop-blur-sm">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-1/4 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-0"></div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                    <Pulse size={32} className="animate-spin text-primary" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-md -z-10 animate-pulse"></div>
                </div>

                <h3 className="text-title-lg text-on-dark font-semibold tracking-tight mb-2">Analyzing Repository</h3>
                <p className="text-body-md text-primary font-medium mb-6 min-h-[1.5rem] transition-all duration-300">
                  {scanStage}
                </p>

                {/* Progress Bar Container */}
                <div className="w-full bg-surface-elevated-dark rounded-full h-3.5 p-0.5 border border-hairline-on-dark relative overflow-hidden mb-3">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-primary to-teal-300 rounded-full transition-all duration-500 ease-out shadow-sm relative overflow-hidden"
                    style={{ width: `${Math.min(100, Math.round(scanProgress))}%` }}
                  >
                    {/* Animated shine line */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] w-full"></div>
                  </div>
                </div>

                {/* Progress metadata */}
                <div className="w-full flex justify-between items-center text-caption text-muted px-1 mb-6 font-plex">
                  <span>Securing Supply Chain Pipeline</span>
                  <span className="text-on-dark font-semibold">{Math.min(100, Math.round(scanProgress))}%</span>
                </div>

                {/* Milestone pills */}
                <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-hairline-on-dark/60 text-left">
                  <div className={`text-caption p-2 rounded-lg border transition-all ${scanProgress >= 25 ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface-dark border-hairline-on-dark/40 text-muted opacity-60'}`}>
                    <div className="font-semibold flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${scanProgress >= 25 ? 'bg-primary' : 'bg-muted'}`}></span>
                      Clone Repo
                    </div>
                  </div>
                  <div className={`text-caption p-2 rounded-lg border transition-all ${scanProgress >= 50 ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface-dark border-hairline-on-dark/40 text-muted opacity-60'}`}>
                    <div className="font-semibold flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${scanProgress >= 50 ? 'bg-primary' : 'bg-muted'}`}></span>
                      Parse Tree
                    </div>
                  </div>
                  <div className={`text-caption p-2 rounded-lg border transition-all ${scanProgress >= 75 ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface-dark border-hairline-on-dark/40 text-muted opacity-60'}`}>
                    <div className="font-semibold flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${scanProgress >= 75 ? 'bg-primary' : 'bg-muted'}`}></span>
                      Query OSV
                    </div>
                  </div>
                  <div className={`text-caption p-2 rounded-lg border transition-all ${scanProgress >= 95 ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface-dark border-hairline-on-dark/40 text-muted opacity-60'}`}>
                    <div className="font-semibold flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${scanProgress >= 95 ? 'bg-primary' : 'bg-muted'}`}></span>
                      Risk Scoring
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : scanResult?.error ? (
            <div className="bg-surface-card-dark border border-trading-down rounded-xl p-8 text-center max-w-2xl mx-auto">
              <Warning className="w-16 h-16 text-trading-down mx-auto mb-4 opacity-50" />
              <h3 className="text-title-lg text-trading-down mb-2">Analysis Failed</h3>
              <p className="text-body-md text-muted">{scanResult.error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Risk Score + AI Summary */}
              <div className="lg:col-span-4 space-y-0">
                <div className="bg-surface-card-dark rounded-xl p-6 border border-hairline-on-dark flex flex-col items-center justify-center min-h-[300px]">
                  <h3 className="text-title-md text-on-dark w-full text-left mb-auto">Contextual Risk Score</h3>
                  <div className="relative mt-8 mb-6">
                    {/* Circular progress */}
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface-elevated-dark" />
                      <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="552" strokeDashoffset={552 - (552 * scanResult.score) / 100} className="text-primary drop-shadow-md" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-hero-display font-plex text-on-dark leading-none mb-1">{scanResult.score}</span>
                      <span className="text-title-sm text-muted uppercase tracking-wide">/ 100</span>
                    </div>
                  </div>
                  <div className="bg-surface-elevated-dark px-4 py-2 rounded-lg mt-auto w-full flex justify-between items-center">
                    <span className="text-body-sm text-muted">Overall Risk Level</span>
                    <span className={`text-title-sm uppercase tracking-widest ${scanResult.level === 'LOW' ? 'text-trading-up' : (scanResult.level === 'MEDIUM' || scanResult.level === 'MODERATE') ? 'text-primary' : 'text-trading-down'}`}>
                      {scanResult.level}
                    </span>
                  </div>
                </div>

                {/* AI Summary Card — sits directly below the risk score */}
                <AIScanSummary scanId={scanResult.scan_id} />
              </div>

              {/* Right Column: Dependency Vulnerabilities Table */}
              <div className="lg:col-span-8 bg-surface-card-dark rounded-xl p-6 border border-hairline-on-dark">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-title-md text-on-dark">Dependency Vulnerabilities</h3>
                  <div className="flex gap-4 border-b border-hairline-on-dark">
                    <button className="text-body-sm font-medium text-primary border-b-2 border-primary pb-2 px-1">
                      All Findings ({scanResult.dependencies?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 text-caption text-muted mb-4 px-2">
                  <div className="col-span-5">Package / Version</div>
                  <div className="col-span-3 text-right">Severity</div>
                  <div className="col-span-3 text-right">Topology</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Table Rows */}
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
                  {scanResult.dependencies && scanResult.dependencies.length > 0 ? (
                    scanResult.dependencies.map((dep, i) => (
                      <div
                        key={i}
                        onClick={() => navigate(`/finding/${dep.finding_id || dep.id}`, { state: { finding: dep, dependencies: scanResult?.dependencies } })}
                        className="grid grid-cols-12 gap-4 items-center py-3 px-2 rounded-lg hover:bg-surface-elevated-dark transition-colors cursor-pointer group border-b border-hairline-on-dark last:border-0"
                      >
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="h-6 px-2.5 rounded-full bg-surface-elevated-dark flex items-center justify-center font-plex text-xs text-primary truncate shrink-0 max-w-[90px]" title={(dep.ecosystem || 'npm')}>{dep.ecosystem || 'npm'}</div>
                          <span className="text-number-md text-on-dark truncate" title={dep.id}>{dep.id}</span>
                        </div>
                        <div className="col-span-3 text-right font-plex text-number-md">
                          {['CRITICAL', 'HIGH'].includes(dep.risk) ? (
                            <span className="text-trading-down">{dep.risk}</span>
                          ) : (dep.risk === 'MEDIUM' || dep.risk === 'MODERATE') ? (
                            <span className="text-primary font-medium">{dep.risk}</span>
                          ) : (
                            <span className="text-trading-up">{dep.risk}</span>
                          )}
                        </div>
                        <div className="col-span-3 text-right text-body-sm text-body">
                          {dep.direct ? 'Direct' : 'Transitive'}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button className="text-muted group-hover:text-primary transition-colors">
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-muted">
                      No vulnerabilities found! Your dependencies are secure.
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          )}
        </section>
      )}

      {/* Dynamic Details Panel Overlay */}
      {selectedFinding && (
        <FindingDetailPanel 
          finding={selectedFinding}
          dependencies={scanResult?.dependencies}
          onClose={() => setSelectedFinding(null)} 
        />
      )}
    </>
  )
}
