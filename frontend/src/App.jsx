import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { SquaresFour, ShieldCheck, Brain, GearSix, UserCircle, Atom, SignOut } from "@phosphor-icons/react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Investigator from "./pages/Investigator";
import TrustLedger from "./pages/TrustLedger";
import FindingDetailPage from "./pages/FindingDetailPage";
import BeamsBackground from "./components/ui/beams-background";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { to: "/ledger", label: "Trust Ledger", icon: ShieldCheck },
  { to: "/investigator", label: "AI Investigator", icon: Brain },
];

function AppContent() {
  const [githubToken, setGithubToken] = useState(localStorage.getItem("github_token") || "");
  const [githubUser, setGithubUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("github_user")); } catch { return null; }
  });

  const handleSetToken = (token) => {
    setGithubToken(token);
    localStorage.setItem("github_token", token);
    if (!token) { setGithubUser(null); localStorage.removeItem("github_user"); }
  };

  useEffect(() => {
    if (!githubToken) return;
    let cancelled = false;
    fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(8000) })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data?.login) return;
        const user = { login: data.login, name: data.name, avatar_url: data.avatar_url };
        setGithubUser(user); localStorage.setItem("github_user", JSON.stringify(user));
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [githubToken]);

  if (!githubToken)
    return (
      <div className="relative min-h-screen overflow-hidden">
<BeamsBackground />
        <div className="relative z-10">
          <Routes>
            <Route path="*" element={<Login setToken={handleSetToken} />} />
          </Routes>
        </div>
      </div>
    );

  return (
    <div className="app-shell relative min-h-screen text-body font-sans">
      <BeamsBackground />
      <aside className="app-sidebar group fixed inset-y-3 left-3 z-50 flex w-[68px] flex-col rounded-[22px] border border-white/[0.08] bg-[#0e0e0e]/90 px-2 py-3 shadow-2xl backdrop-blur-xl transition-[width] duration-300 hover:w-[238px]">
        <NavLink to="/dashboard" className="nav-brand flex h-12 items-center gap-3 rounded-xl px-2 text-on-dark" title="AtomChain">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-ink shadow-[0_0_24px_rgba(255,145,38,.3)]"><Atom size={20} weight="bold" /></span>
          <span className="sidebar-label whitespace-nowrap text-[15px] font-bold tracking-[0.08em]">ATOMCHAIN</span>
        </NavLink>
        <div className="my-4 h-px bg-white/[0.07]" />
        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} title={label} className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}>
              <Icon size={21} weight={to === "/dashboard" ? "fill" : "regular"} /><span className="sidebar-label whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          <button title="Settings" className="sidebar-link w-full text-left"><GearSix size={21} /><span className="sidebar-label whitespace-nowrap">Settings</span></button>
          <div className="my-2 h-px bg-white/[0.07]" />
          <div title={githubUser?.name || githubUser?.login || "Profile"} className="sidebar-link cursor-default">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary/10 shadow-[0_0_12px_rgba(255,92,0,.4)]">
              {githubUser?.avatar_url ? <img src={githubUser.avatar_url} className="h-6 w-6 rounded-full object-cover" alt="" /> : <UserCircle size={20} weight="fill" className="text-primary" />}
            </span>
            <span className="sidebar-label min-w-0 flex-1 truncate whitespace-nowrap">{githubUser?.login || "My profile"}</span>
          </div>
          <button onClick={() => handleSetToken("")} title="Sign out" className="sidebar-link w-full text-left text-muted hover:!text-trading-down"><SignOut size={20} /><span className="sidebar-label whitespace-nowrap">Sign out</span></button>
        </div>
      </aside>
      <main className="relative z-10 min-h-screen pl-[92px] pr-4 md:pr-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard githubToken={githubToken} />} />
          <Route path="/finding/:findingId" element={<FindingDetailPage />} />
          <Route path="/investigator" element={<Investigator />} />
          <Route path="/ledger" element={<TrustLedger />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() { return <BrowserRouter><AppContent /></BrowserRouter>; }
