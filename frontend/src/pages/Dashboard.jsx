import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Pulse, Globe, ArrowRight, Warning, Folder, CaretDown, GitBranch, FileArchive } from '@phosphor-icons/react'
import FindingDetailPanel from '../components/FindingDetailPanel'
import BorderBeam from '../components/ui/border-beam-search'
import ActionSearchBar from '../components/ui/action-search-bar'

function useDebounce(value, delay = 200) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

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

const severityText = (sev) => {
  const s = (sev || '').toUpperCase()
  if (s === 'CRITICAL') return 'text-severity-critical'
  if (s === 'HIGH') return 'text-severity-high'
  if (s === 'MEDIUM' || s === 'MODERATE') return 'text-severity-moderate'
  return 'text-severity-low'
}

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
  const localMenuRef = useRef(null)
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false)
  const [isLocalMenuOpen, setIsLocalMenuOpen] = useState(false)
  const [userRepos, setUserRepos] = useState(null)
  const [reposLoading, setReposLoading] = useState(false)
  const [reposError, setReposError] = useState('')
  const [history, setHistory] = useState([])
  const [showOnlyVulnerable, setShowOnlyVulnerable] = useState(false)

  useEffect(() => {
    if (scanResult) {
      localStorage.setItem('cached_scan_result', JSON.stringify(scanResult))
    }
  }, [scanResult])

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/scans')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
  }, [])

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

  const handleFolderClick = (e) => {
    e.stopPropagation();
    setIsLocalMenuOpen((o) => !o);
  }

  const handleChooseFolder = async () => {
    setIsLocalMenuOpen(false);
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

  const handleChooseZip = () => {
    setIsLocalMenuOpen(false);
    if (zipInputRef.current) {
      zipInputRef.current.click();
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

  const openRepoDropdown = async () => {
    setReposError('')
    if (userRepos) {
      setIsRepoDropdownOpen(true)
      return
    }
    setReposLoading(true)
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

  const toggleRepoDropdown = () => {
    if (isRepoDropdownOpen) setIsRepoDropdownOpen(false)
    else openRepoDropdown()
  }

  const selectRepo = (repo) => {
    setRepoUrl(`https://github.com/${repo.full_name}`)
    setIsRepoDropdownOpen(false)
  }

  const debouncedRepoUrl = useDebounce(repoUrl, 200)

  const repoActions = (userRepos || [])
    .slice()
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .filter((repo) => {
      const q = debouncedRepoUrl.toLowerCase().trim()
      return !q || repo.full_name.toLowerCase().includes(q)
    })
    .map((repo) => ({
      id: repo.id,
      label: repo.full_name,
      description: repo.description || repo.language || 'Repository',
      end: repo.language || 'Repo',
      icon: <GitBranch size={16} />,
    }))

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

  useEffect(() => {
    if (!isLocalMenuOpen) return;
    const onDocClick = (e) => {
      if (localMenuRef.current && !localMenuRef.current.contains(e.target)) {
        setIsLocalMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isLocalMenuOpen])

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
      <section className="mx-auto w-full max-w-[1500px] pt-8 md:pt-12">
<div ref={repoDropdownRef} className="relative mx-auto max-w-3xl overflow-visible">
          <BorderBeam size="line" colorVariant="sunset" theme="dark" strength={0.6} duration={3.1} borderRadius={22} className="block" style={{ overflow: 'visible' }}>
          <div className="flex h-[46px] items-center gap-2 rounded-[22px] bg-[#1d1d1d] px-3 ring-1 ring-white/[0.12] shadow-[inset_0_0_50px_rgba(255,255,255,.02)]">
            <Globe size={20} className="shrink-0 text-primary" /><input id="repo-input" type="text" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} onFocus={openRepoDropdown} placeholder="Enter GitHub repository" className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#8b8b8b]" onKeyDown={(e) => { if (e.key === 'Enter' && repoUrl) handleScan(); if (e.key === 'Escape') setIsRepoDropdownOpen(false) }} />
            <div><button type="button" onClick={toggleRepoDropdown} disabled={isScanning} title="Your repositories" className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white/[.05] hover:text-primary"><CaretDown size={18} className={isRepoDropdownOpen ? 'rotate-180' : ''} /></button></div>
            <div ref={localMenuRef} className="relative"><button onClick={handleFolderClick} disabled={isScanning} title="Select a local file, folder or zip" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-white/[.05] hover:text-primary disabled:opacity-40"><Folder size={19} /></button>{isLocalMenuOpen && <div className="absolute right-0 top-[calc(100%+10px)] z-[9999] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#1c1815] shadow-2xl"><div className="border-b border-white/[.07] px-4 py-3 text-xs font-semibold text-on-dark">Import local project</div><button type="button" onClick={handleChooseFolder} className="flex w-full items-center gap-3 border-b border-white/[.05] px-4 py-3 text-left hover:bg-white/[.04]"><Folder size={16} className="text-primary" /><span className="min-w-0 flex-1 truncate text-sm text-on-dark">Upload folder</span></button><button type="button" onClick={handleChooseZip} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[.04]"><FileArchive size={16} className="text-primary" /><span className="min-w-0 flex-1 truncate text-sm text-on-dark">Upload ZIP file</span></button></div>}</div>
          </div>
          </BorderBeam>

          <ActionSearchBar
            open={isRepoDropdownOpen}
            actions={repoActions}
            loading={reposLoading}
            error={reposError}
            onSelect={(action) => selectRepo({ id: action.id, full_name: action.label })}
            className="absolute left-0 right-0 top-[calc(100%+10px)] z-[9999]"
          />

          <input type="file" ref={folderInputRef} webkitdirectory="" directory="" className="hidden" onChange={handleFolderChange} /><input type="file" ref={zipInputRef} accept=".zip" className="hidden" onChange={handleZipChange} />
        </div>
        {!scanResult && !isScanning && <div className="mx-auto mt-12 max-w-3xl"><h2 className="mb-3 text-sm font-semibold text-on-dark">History</h2><div className="max-h-[calc(100vh-270px)] overflow-y-auto rounded-[18px] border border-white/[.08] bg-surface-card-dark/60 p-1">{history.length ? history.map((scan) => <button key={scan.id} onClick={() => scan.status === 'COMPLETED' && setPollingId(scan.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[13px] px-4 py-3 text-left hover:bg-white/[.04]"><span className={`h-2.5 w-2.5 rounded-full ${scan.status === 'COMPLETED' ? 'bg-trading-up' : scan.status === 'FAILED' ? 'bg-trading-down' : 'bg-primary'}`} /><span className="min-w-0"><span className="block truncate text-sm text-on-dark">{(scan.repository_url || 'Local analysis').replace(/^(zip|local|folder):\/\//, '')}</span><span className="mt-0.5 block text-xs text-muted">{new Date(scan.timestamp).toLocaleString()}</span></span><span className="text-xs text-muted">{scan.score ?? '—'}%</span></button>) : <div className="flex min-h-40 items-center justify-center rounded-[14px] border border-dashed border-white/[.08] text-sm text-muted">Previously analyzed repositories and local projects will appear here.</div>}</div></div>}
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Context risk', value: scanResult.score ?? 0, color: severityText(scanResult.level) },
                  { label: 'Project health', value: Math.max(0, 100 - (scanResult.score ?? 0)), color: 'text-trading-up' },
                  { label: 'Signal confidence', value: scanResult.confidence ?? 86, color: 'text-body' },
                ].map((metric) => <div key={metric.label} className="bento flex items-center gap-5 p-5"><div className={`grid h-20 w-20 place-items-center rounded-full border-4 border-current bg-black/10 text-xl font-bold ${metric.color}`}>{metric.value}</div><div><p className="eyebrow">{metric.label}</p><p className="mt-1 text-xs text-muted">{metric.label === 'Context risk' ? (scanResult.level || 'Assessing') : metric.label === 'Project health' ? 'Dependency posture' : 'Evidence quality'}</p></div></div>)}
              </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="bento lg:col-span-4 p-5">
                <div className="mb-5 flex items-center justify-between"><div><p className="eyebrow mb-1">Project structure</p><h3 className="text-sm font-semibold text-on-dark">{repoUrl || localPath || 'Analyzed project'}</h3></div><Folder size={18} className="text-primary" /></div>
                <div className="space-y-1 text-sm"><div className="rounded-lg px-3 py-2 text-body">⌄ &nbsp; root</div><div className="rounded-lg px-3 py-2 pl-8 text-muted">├─ package manifests</div><div className="rounded-lg px-3 py-2 pl-8 text-muted">├─ dependencies</div><div className="rounded-lg px-3 py-2 pl-8 text-muted">└─ lockfiles</div></div>
                <button onClick={() => setShowOnlyVulnerable(v => !v)} className={`mt-5 w-full rounded-lg border py-2.5 text-xs transition-colors ${showOnlyVulnerable ? 'border-primary bg-primary/15 text-primary' : 'border-white/[.08] text-body hover:border-primary/40 hover:text-primary'}`}>{showOnlyVulnerable ? 'Showing vulnerable files' : 'Show vulnerable files only'}</button>
              </div>

              {/* Right Column: Dependency Vulnerabilities Table */}
              <div className="bento lg:col-span-8 p-5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-title-md text-on-dark">Dependency Vulnerabilities</h3>
                  <div className="flex gap-4 border-b border-hairline-on-dark">
                    <button className="text-body-sm font-medium text-primary border-b-2 border-primary pb-2 px-1">
                      {showOnlyVulnerable ? 'Vulnerable Findings' : 'All Findings'} ({showOnlyVulnerable ? (scanResult.dependencies || []).filter((d) => !['LOW', 'UNKNOWN'].includes((d.risk || '').toUpperCase())).length : scanResult.dependencies?.length || 0})
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
                  {scanResult.dependencies && (showOnlyVulnerable ? scanResult.dependencies.filter((d) => !['LOW', 'UNKNOWN'].includes((d.risk || '').toUpperCase())) : scanResult.dependencies).length > 0 ? (
                    (showOnlyVulnerable ? scanResult.dependencies.filter((d) => !['LOW', 'UNKNOWN'].includes((d.risk || '').toUpperCase())) : scanResult.dependencies).map((dep, i) => (
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
                          {dep.risk === 'CRITICAL' ? (
                            <span className="text-severity-critical">{dep.risk}</span>
                          ) : dep.risk === 'HIGH' ? (
                            <span className="text-severity-high">{dep.risk}</span>
                          ) : (dep.risk === 'MEDIUM' || dep.risk === 'MODERATE') ? (
                            <span className="text-severity-moderate font-medium">{dep.risk}</span>
                          ) : (
                            <span className="text-severity-low">{dep.risk}</span>
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
                      {showOnlyVulnerable ? 'No medium, high or critical vulnerabilities found.' : 'No vulnerabilities found! Your dependencies are secure.'}
                    </div>
                  )}
                </div>
              </div>
              
            </div></div>
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
