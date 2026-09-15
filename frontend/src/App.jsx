import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Clock, SignOut } from "@phosphor-icons/react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Investigator from "./pages/Investigator";
import TrustLedger from "./pages/TrustLedger";
import FindingDetailPage from "./pages/FindingDetailPage";
import HistoryPanel from "./components/HistoryPanel";

function AppContent() {
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [githubUser, setGithubUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('github_user'))
    } catch {
      return null
    }
  });
  const navigate = useNavigate();

  const handleSetToken = (token) => {
    setGithubToken(token)
    localStorage.setItem('github_token', token)
    if (!token) {
      setGithubUser(null)
      localStorage.removeItem('github_user')
    }
  }

  useEffect(() => {
    if (!githubToken) return
    let cancelled = false
    fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      signal: AbortSignal.timeout(8000),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.login) return
        const user = { login: data.login, name: data.name, avatar_url: data.avatar_url }
        setGithubUser(user)
        localStorage.setItem('github_user', JSON.stringify(user))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [githubToken])

  const handleRescan = (scan) => {
    // If it's a zip scan, we can't easily rescan without the file unless backend caches it.
    // So we tell them to re-upload for now, or just redirect to dashboard
    navigate("/dashboard", { state: { rescanUrl: scan.repository_url } });
  };

  const handleViewCached = (scanId) => {
    navigate(`/dashboard?scan_id=${scanId}`);
  };

  return (
    <div className="min-h-screen bg-canvas-dark text-body font-sans flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 flex items-center justify-between px-6 bg-canvas-dark border-b border-hairline-on-dark relative z-10 shrink-0">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-ink text-xl font-plex leading-none">
              A
            </div>
            <span className="font-bold text-lg text-primary tracking-tight">ATOMCHAIN</span>
          </Link>
          {githubToken && (
            <div className="hidden md:flex items-center gap-6 text-nav-link text-on-dark">
              <Link
                to="/dashboard"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                Dashboard
              </Link>
              <Link to="/ledger" className="hover:text-primary transition-colors">
                Trust Ledger
              </Link>
              <Link to="/investigator" className="hover:text-primary transition-colors flex items-center gap-1">
                AI Investigator
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {githubToken ? (
            <>
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 text-body hover:text-primary transition-colors text-button"
              >
                <Clock size={16} />
                History
              </button>
              {githubUser && (
                <Link
                  to={`https://github.com/${githubUser.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={githubUser.name || githubUser.login}
                  className="flex items-center gap-2 pl-4 ml-4 border-l border-hairline-on-dark text-body hover:text-primary transition-colors"
                >
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-6 h-6 rounded-full bg-surface-elevated-dark object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <span className="text-button">{githubUser.login}</span>
                </Link>
              )}
              <button 
                onClick={() => handleSetToken('')}
                className="text-body hover:text-primary transition-colors text-button ml-4 flex items-center gap-1.5"
              >
                <SignOut size={15} />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="text-body hover:text-primary transition-colors text-button hidden md:block">
                Log In
              </Link>
              <Link to="/" className="h-10 px-4 flex items-center rounded-md font-button text-on-primary bg-primary hover:bg-primary-active transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route 
            path="/" 
            element={githubToken ? <Navigate to="/dashboard" /> : <Login setToken={handleSetToken} />} 
          />
          <Route 
            path="/dashboard" 
            element={githubToken ? <Dashboard githubToken={githubToken} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/finding/:findingId" 
            element={githubToken ? <FindingDetailPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/investigator" 
            element={githubToken ? <Investigator /> : <Navigate to="/" />} 
          />
          <Route
            path="/ledger"
            element={
              githubToken ? (
                <TrustLedger />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
      </div>
      
      {/* Footer */}
      <footer className="bg-canvas-dark text-body border-t border-hairline-on-dark pt-16 pb-8 shrink-0 mt-auto">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="border-t border-hairline-on-dark pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-caption text-muted-strong">
              © 2026 AtomChain. Local Open Source Edition.
            </p>
          </div>
        </div>
      </footer>

      <HistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        onRescan={handleRescan}
        onViewCached={handleViewCached}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
