import { useState, useEffect } from 'react'
import { Search, ShieldCheck, Activity, Globe, Zap, ArrowRight, ShieldAlert } from 'lucide-react'
import FindingDetailPanel from '../components/FindingDetailPanel'
import AIScanSummary from '../components/AIScanSummary'

export default function Dashboard({ githubToken }) {
  const [repoUrl, setRepoUrl] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [pollingId, setPollingId] = useState(null)
  const [selectedFinding, setSelectedFinding] = useState(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStage, setScanStage] = useState('Initializing scan...')

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

  // Realistic incremental progress while scanning is active
  useEffect(() => {
    if (!isScanning) return;

    const progressTimer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev < 30) {
          setScanStage('Cloning Git repository...')
          return prev + 3;
        } else if (prev < 55) {
          setScanStage('Extracting dependencies and package manifests...')
          return prev + 2;
        } else if (prev < 75) {
          setScanStage('Querying OSV vulnerability intelligence database...')
          return prev + 1.5;
        } else if (prev < 92) {
          setScanStage('Calculating blast radius, topology & risk scores...')
          return prev + 0.8;
        } else if (prev < 96) {
          setScanStage('Finalizing security audit report...')
          return prev + 0.2;
        }
        return prev;
      })
    }, 600);

    return () => clearInterval(progressTimer);
  }, [isScanning])

  useEffect(() => {
    if (!pollingId) return;

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
        }
      } catch (e) {
        console.error(e)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [pollingId])

  return (
    <>
      {/* Hero Band */}
      <section className="bg-canvas-dark py-section px-6 border-b border-hairline-on-dark text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-canvas-dark to-canvas-dark"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-hero-display text-on-dark mb-4 uppercase tracking-tighter">
            SECURE YOUR <span className="text-primary">SUPPLY CHAIN</span>
          </h1>
          <p className="text-title-lg text-body max-w-2xl mx-auto mb-12 font-normal">
            Deep repository intelligence backed by cryptographic trust and AI analysis.
          </p>
          
          {/* Search Input on Dark */}
          <div className="max-w-2xl mx-auto flex items-center bg-surface-card-dark rounded-lg p-2 border border-hairline-on-dark shadow-2xl">
            <div className="pl-4 pr-2 text-muted-strong">
              <Globe size={20} />
            </div>
            <input 
              type="text" 
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter GitHub Repository URL (e.g. facebook/react)"
              className="flex-1 bg-transparent text-body-md text-on-dark placeholder-muted-strong outline-none px-2 py-2"
              onKeyDown={(e) => e.key === 'Enter' && repoUrl && handleScan()}
            />
            <button 
              onClick={handleScan}
              disabled={isScanning || !repoUrl}
              className="ml-2 h-10 px-8 rounded-pill font-button text-on-primary bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isScanning ? (
                <>
                  <Activity size={16} className="animate-pulse" /> Scanning...
                </>
              ) : (
                <>
                  <Zap size={16} /> Scan Now
                </>
              )}
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
                    <Activity size={32} className="animate-spin text-primary" style={{ animationDuration: '3s' }} />
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
              <ShieldAlert className="w-16 h-16 text-trading-down mx-auto mb-4 opacity-50" />
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
                    <span className={`text-title-sm uppercase tracking-widest ${scanResult.level === 'LOW' ? 'text-trading-up' : scanResult.level === 'MEDIUM' ? 'text-primary' : 'text-trading-down'}`}>
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
                        onClick={() => setSelectedFinding(dep)}
                        className="grid grid-cols-12 gap-4 items-center py-3 px-2 rounded-lg hover:bg-surface-elevated-dark transition-colors cursor-pointer group border-b border-hairline-on-dark last:border-0"
                      >
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-elevated-dark flex items-center justify-center font-plex text-xs text-primary">npm</div>
                          <span className="text-number-md text-on-dark truncate" title={dep.id}>{dep.id}</span>
                        </div>
                        <div className="col-span-3 text-right font-plex text-number-md">
                          {['CRITICAL', 'HIGH'].includes(dep.risk) ? (
                            <span className="text-trading-down">{dep.risk}</span>
                          ) : dep.risk === 'MEDIUM' ? (
                            <span className="text-primary">{dep.risk}</span>
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

      {/* Finding Detail Panel (slide-in on row click) */}
      {selectedFinding && (
        <FindingDetailPanel
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </>
  )
}
