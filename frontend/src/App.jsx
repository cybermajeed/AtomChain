import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Investigator from "./pages/Investigator";
import TrustLedger from "./pages/TrustLedger";

function App() {
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '')

  const handleSetToken = (token) => {
    setGithubToken(token)
    localStorage.setItem('github_token', token)
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-canvas-dark text-body font-sans flex flex-col">
        {/* Top Navigation */}
        <nav className="h-16 flex items-center justify-between px-6 bg-canvas-dark border-b border-hairline-on-dark relative z-10 shrink-0">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-ink text-xl font-plex leading-none">
                S
              </div>
              <span className="font-bold text-lg text-primary tracking-tight">SUPPLYSHIELD</span>
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
              <button 
                onClick={() => handleSetToken('')}
                className="text-body hover:text-primary transition-colors text-button"
              >
                Sign Out
              </button>
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
        <footer className="bg-surface-soft-light text-body-on-light border-t border-border-strong pt-16 pb-8 shrink-0 mt-auto">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="border-t border-hairline-on-light pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-caption text-muted-strong">
                © 2026 Sustainverse. Local Open Source Edition.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
