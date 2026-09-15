import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronDown, Atom } from "lucide-react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TrustLedger from "./pages/TrustLedger";

function App() {
  const [githubToken, setGithubToken] = useState(
    localStorage.getItem("github_token") || "",
  );
  const [userProfile, setUserProfile] = useState(null);

  const handleSetToken = (token) => {
    setGithubToken(token);
    localStorage.setItem("github_token", token);
  };

  useEffect(() => {
    if (githubToken) {
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.login) setUserProfile(data);
        })
        .catch(console.error);
    } else {
      setUserProfile(null);
    }
  }, [githubToken]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-canvas-dark text-body font-sans flex flex-col">
        {/* Top Navigation */}
        <nav className="h-16 flex items-center justify-between px-6 bg-canvas-dark border-b border-hairline-on-dark relative z-10 shrink-0">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-ink text-xl font-plex leading-none">
                <Atom size={20} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg text-primary tracking-tight">
                ATOMCHAIN
              </span>
            </Link>
            {githubToken && (
              <div className="hidden md:flex items-center gap-6 text-nav-link text-on-dark">
                <Link
                  to="/dashboard"
                  className="text-primary transition-colors flex items-center gap-1"
                >
                  Dashboard
                </Link>
                <Link to="/ledger" className="hover:text-primary transition-colors">
                  Trust Ledger
                </Link>
                <a href="#" className="hover:text-primary transition-colors">
                  AI Investigator
                </a>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {githubToken ? (
              <div className="flex items-center gap-4">
                {userProfile && (
                  <div className="hidden md:flex items-center gap-2">
                    <img
                      src={userProfile.avatar_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full border border-hairline-on-dark"
                    />
                    <span className="text-body-sm text-on-dark font-medium">
                      {userProfile.login}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => handleSetToken("")}
                  className="text-body hover:text-primary transition-colors text-button"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/"
                  className="text-body hover:text-primary transition-colors text-button hidden md:block"
                >
                  Log In
                </Link>
                <Link
                  to="/"
                  className="h-10 px-4 flex items-center rounded-md font-button text-on-primary bg-primary hover:bg-primary-active transition-colors"
                >
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
              element={
                githubToken ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Login setToken={handleSetToken} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                githubToken ? (
                  <Dashboard githubToken={githubToken} />
                ) : (
                  <Navigate to="/" />
                )
              }
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

        {/* Footer Light on Dark */}
        <footer className="bg-surface-soft-light text-body-on-light border-t border-border-strong pt-16 pb-8 shrink-0 mt-auto">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="border-t border-hairline-on-light pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-caption text-muted-strong">
                © 2026 AtomChain. Local Open Source Edition.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
