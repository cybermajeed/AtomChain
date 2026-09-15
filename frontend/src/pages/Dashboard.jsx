import { useState, useEffect } from 'react'
import { Search, ShieldCheck, Activity, Globe, Zap, ArrowRight, ShieldAlert } from 'lucide-react'

export default function Dashboard({ githubToken }) {
  const [repoUrl, setRepoUrl] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [pollingId, setPollingId] = useState(null)

  const handleScan = async () => {
    setIsScanning(true)
    setScanResult(null)
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

      // 2. Check access via GitHub API
      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!ghRes.ok) {
        if (ghRes.status === 404 || ghRes.status === 403) {
           throw new Error('Security Error: You do not have access to this repository. You can only scan repositories you own or have access to.');
        }
        throw new Error(`GitHub API Error: ${ghRes.statusText}`);
      }

      const repoData = await ghRes.json();
      
      // 3. Strict access check (must have push or admin rights)
      if (!repoData.permissions?.admin && !repoData.permissions?.push) {
          throw new Error('Security Error: You do not have write or admin access to this repository. You can only scan repositories you own.');
      }

      // 4. Proceed with backend scan
      const res = await fetch('http://127.0.0.1:8000/api/scan/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl, github_token: githubToken })
      })
      if (!res.ok) throw new Error('Failed to initiate scan')
      const data = await res.json()
      setPollingId(data.scan_id)
    } catch (e) {
      console.error(e)
      setScanResult({ error: e.message || 'Failed to reach backend. Make sure Uvicorn is running on port 8000.' })
      setIsScanning(false)
    }
  }

  useEffect(() => {
    if (!pollingId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/scan/${pollingId}`)
        if (!res.ok) throw new Error('Poll failed')
        const data = await res.json()

        if (data.status === 'COMPLETED') {
          setScanResult(data)
          setIsScanning(false)
          setPollingId(null)
        } else if (data.status === 'FAILED') {
          setScanResult({ error: 'Repository scanning failed. Check backend logs.' })
          setIsScanning(false)
          setPollingId(null)
        }
      } catch (e) {
        console.error(e)
        // Keep polling if it was a temporary network blip, or we can abort. We'll keep polling for robust prototype.
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
            <div className="bg-surface-card-dark border border-hairline-on-dark rounded-xl p-12 text-center max-w-2xl mx-auto flex flex-col items-center">
               <Activity size={48} className="text-primary animate-pulse mb-6" />
               <h3 className="text-title-lg text-on-dark mb-2">Analyzing Repository</h3>
               <p className="text-body-md text-muted">Cloning, building dependency tree, and querying OSV intelligence...</p>
            </div>
          ) : scanResult.error ? (
            <div className="bg-surface-card-dark border border-trading-down rounded-xl p-8 text-center max-w-2xl mx-auto">
              <ShieldAlert className="w-16 h-16 text-trading-down mx-auto mb-4 opacity-50" />
              <h3 className="text-title-lg text-trading-down mb-2">Analysis Failed</h3>
              <p className="text-body-md text-muted">{scanResult.error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Risk Score */}
              <div className="lg:col-span-4 bg-surface-card-dark rounded-xl p-6 border border-hairline-on-dark flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-title-md text-on-dark w-full text-left mb-auto">Contextual Risk Score</h3>
                <div className="relative mt-8 mb-6">
                  {/* Decorative circular progress */}
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

              {/* Right Column: Markets Table (Dependency Analysis) */}
              <div className="lg:col-span-8 bg-surface-card-dark rounded-xl p-6 border border-hairline-on-dark">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-title-md text-on-dark">Dependency Vulnerabilities</h3>
                  <div className="flex gap-4 border-b border-hairline-on-dark">
                    <button className="text-body-sm font-medium text-primary border-b-2 border-primary pb-2 px-1">All Findings ({scanResult.dependencies?.length || 0})</button>
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
                      <div key={i} className="grid grid-cols-12 gap-4 items-center py-3 px-2 rounded-lg hover:bg-surface-elevated-dark transition-colors cursor-pointer group border-b border-hairline-on-dark last:border-0">
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
    </>
  )
}
