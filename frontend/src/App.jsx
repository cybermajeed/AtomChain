import { useState } from 'react'
import { Search, ShieldCheck, Activity, Globe, Zap, ArrowRight, ChevronDown } from 'lucide-react'

function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(false)

  const handleScan = async () => {
    setIsScanning(true)
    setScanResult(null)
    try {
      // Mock API call to local backend
      const res = await fetch('http://127.0.0.1:8000/api/scan/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl })
      })
      if (!res.ok) throw new Error('Failed to reach backend')
      const data = await res.json()
      // For presentation purposes, simulate a delay then show results
      setTimeout(() => {
        setScanResult({
          status: 'COMPLETED',
          score: 87,
          level: 'HIGH',
          dependencies: [
            { id: 'axios@1.5.0', risk: 'LOW', change: '+0.00%', direct: true },
            { id: 'lodash@4.17.20', risk: 'CRITICAL', change: '-12.45%', direct: false },
            { id: 'react@19.2.8', risk: 'LOW', change: '+0.00%', direct: true }
          ]
        })
        setIsScanning(false)
      }, 1500)
    } catch (e) {
      console.error(e)
      setScanResult({ error: 'Failed to reach backend. Make sure Uvicorn is running on port 8000.' })
      setIsScanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas-dark text-body font-sans">
      {/* Top Navigation */}
      <nav className="h-16 flex items-center justify-between px-6 bg-canvas-dark border-b border-hairline-on-dark relative z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-ink text-xl font-plex leading-none">
              S
            </div>
            <span className="font-bold text-lg text-primary tracking-tight">SUSTAINVERSE</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-nav-link text-on-dark">
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">Dashboards <ChevronDown size={16}/></a>
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">Local Scan <ChevronDown size={16}/></a>
            <a href="#" className="text-primary transition-colors">GitHub Scan</a>
            <a href="#" className="hover:text-primary transition-colors">Trust Ledger</a>
            <a href="#" className="hover:text-primary transition-colors">AI Investigator</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-body hover:text-primary transition-colors text-button hidden md:block">
            Log In
          </button>
          <button className="h-10 px-4 rounded-md font-button text-on-primary bg-primary hover:bg-primary-active transition-colors">
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Band */}
      <section className="bg-canvas-dark py-section px-6 border-b border-hairline-on-dark text-center relative overflow-hidden">
        {/* Subtle decorative glow to mimic Binance promotional bands (Optional) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-canvas-dark to-canvas-dark"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-hero-display text-on-dark mb-4 uppercase tracking-tighter">
            SECURE YOUR <span className="text-primary">SUPPLY CHAIN</span>
          </h1>
          <p className="text-title-lg text-body max-w-2xl mx-auto mb-12 font-normal">
            Deep repository intelligence backed by cryptographic trust and AI analysis.
          </p>
          
          {/* Funds Safu Callout */}
          <div className="flex justify-center items-baseline gap-12 mb-12">
            <div className="text-center">
              <div className="text-number-display text-primary font-plex mb-1">14,204</div>
              <div className="text-caption text-muted uppercase tracking-wider">Packages Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-number-display text-primary font-plex mb-1">3,492</div>
              <div className="text-caption text-muted uppercase tracking-wider">Risks Mitigated</div>
            </div>
            <div className="text-center hidden md:block">
              <div className="text-number-display text-primary font-plex mb-1">$0</div>
              <div className="text-caption text-muted uppercase tracking-wider">Cost of Breach</div>
            </div>
          </div>

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
      {scanResult && (
        <section className="max-w-[1440px] mx-auto py-12 px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            <h2 className="text-display-sm text-on-dark">Scan Results</h2>
          </div>

          {scanResult.error ? (
            <div className="bg-surface-card-dark border border-trading-down rounded-xl p-8 text-center max-w-2xl mx-auto">
              <ShieldCheck className="w-16 h-16 text-trading-down mx-auto mb-4 opacity-50" />
              <h3 className="text-title-lg text-trading-down mb-2">Analysis Failed</h3>
              <p className="text-body-md text-muted">{scanResult.error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Risk Score */}
              <div className="lg:col-span-4 bg-surface-card-dark rounded-xl p-6 border border-hairline-on-dark flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-title-md text-on-dark w-full text-left mb-auto">Contextual Risk Score</h3>
                <div className="relative mt-8 mb-6">
                  {/* Decorative circular progress placeholder */}
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface-elevated-dark" />
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="552" strokeDashoffset={552 - (552 * scanResult.score) / 100} className="text-trading-down drop-shadow-md" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-hero-display font-plex text-trading-down leading-none mb-1">{scanResult.score}</span>
                    <span className="text-title-sm text-on-dark uppercase tracking-wide">/ 100</span>
                  </div>
                </div>
                <div className="bg-surface-elevated-dark px-4 py-2 rounded-lg mt-auto w-full flex justify-between items-center">
                  <span className="text-body-sm text-muted">Overall Risk Level</span>
                  <span className="text-title-sm text-trading-down uppercase tracking-widest">{scanResult.level}</span>
                </div>
              </div>

              {/* Right Column: Markets Table (Dependency Analysis) */}
              <div className="lg:col-span-8 bg-surface-card-dark rounded-xl p-6 border border-hairline-on-dark">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-title-md text-on-dark">Dependency Vulnerabilities</h3>
                  <div className="flex gap-4 border-b border-hairline-on-dark">
                    <button className="text-body-sm font-medium text-primary border-b-2 border-primary pb-2 px-1">Top Risks</button>
                    <button className="text-body-sm font-medium text-muted hover:text-on-dark pb-2 px-1 transition-colors">Direct</button>
                    <button className="text-body-sm font-medium text-muted hover:text-on-dark pb-2 px-1 transition-colors">Transitive</button>
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 text-caption text-muted mb-4 px-2">
                  <div className="col-span-5">Package / Version</div>
                  <div className="col-span-3 text-right">Risk Impact</div>
                  <div className="col-span-3 text-right">Topology</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Table Rows */}
                <div className="space-y-1">
                  {scanResult.dependencies.map((dep, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 items-center py-3 px-2 rounded-lg hover:bg-surface-elevated-dark transition-colors cursor-pointer group border-b border-hairline-on-dark last:border-0">
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-elevated-dark flex items-center justify-center font-plex text-xs text-primary">npm</div>
                        <span className="text-number-md text-on-dark">{dep.id}</span>
                      </div>
                      <div className="col-span-3 text-right font-plex text-number-md">
                        {dep.risk === 'CRITICAL' ? (
                          <span className="text-trading-down">{dep.risk}</span>
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
                  ))}
                </div>
                
                <div className="mt-6 flex justify-center">
                  <button className="text-button text-on-dark bg-surface-elevated-dark hover:bg-hairline-on-dark transition-colors px-6 py-3 rounded-md">
                    View Full Graph (Cytoscape)
                  </button>
                </div>
              </div>
              
            </div>
          )}
        </section>
      )}
      
      {/* Spacer to push footer down if content is small */}
      {!scanResult && <div className="h-[40vh]"></div>}

      {/* Footer Light on Dark */}
      <footer className="bg-surface-soft-light text-body-on-light border-t border-border-strong pt-16 pb-8">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center font-bold text-ink text-sm font-plex">S</div>
                <span className="font-bold text-ink tracking-tight">SUSTAINVERSE</span>
              </div>
              <p className="text-body-sm text-muted-strong pr-4">
                Securing the software supply chain through contextual analysis, localized trust ledgers, and AI-driven investigations.
              </p>
            </div>
            
            <div>
              <h4 className="text-title-sm text-ink mb-4 font-bold">Products</h4>
              <ul className="space-y-3 text-body-sm">
                <li><a href="#" className="hover:text-primary transition-colors">Local Scanner</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Trust Ledger</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">AI Investigator</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Dependency Graph</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-title-sm text-ink mb-4 font-bold">Service</h4>
              <ul className="space-y-3 text-body-sm">
                <li><a href="#" className="hover:text-primary transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">OSV Integration</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Security Rules</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-title-sm text-ink mb-4 font-bold">Legal</h4>
              <ul className="space-y-3 text-body-sm">
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-title-sm text-ink mb-4 font-bold">Community</h4>
              <ul className="space-y-3 text-body-sm">
                <li><a href="#" className="hover:text-primary transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-hairline-on-light pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-caption text-muted-strong">
              © 2026 Sustainverse. All rights reserved. Built for the Hackathon.
            </p>
            <p className="text-caption text-muted-strong flex items-center gap-1">
              Made with <span className="text-primary font-bold">BinanceNova</span> & <span className="text-primary font-bold">BinancePlex</span> tokens.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
