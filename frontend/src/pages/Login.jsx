import { useEffect, useState } from "react";
import { ShieldAlert, KeyRound } from "lucide-react";

export default function Login({ setToken }) {
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const handleMessage = (event) => {
      // Allow messages from same origin, or strictly verify if needed
      // Since it's a local app, we accept the oauth-token type
      if (event.data?.type === "oauth-token" && event.data?.token) {
        setAuthError("");
        setToken(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        setAuthError(event.data.error || "GitHub login failed.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setToken]);

  const handleGitHubLogin = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      "http://127.0.0.1:8000/api/auth/github/login",
      "github-oauth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-canvas-dark to-canvas-dark"></div>

      <div className="max-w-md w-full bg-surface-card-dark rounded-xl p-8 border border-hairline-on-dark shadow-2xl relative z-10 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-surface-elevated-dark rounded-full flex items-center justify-center text-on-dark">
            <KeyRound size={32} />
          </div>
        </div>

        <h1 className="text-display-sm text-on-dark mb-2">
          Sign in to Sustainverse
        </h1>
        <p className="text-body-md text-muted mb-8">
          Authenticate with GitHub to securely analyze your private
          repositories. We only request read access.
        </p>

        {authError && (
          <div className="mb-4 p-3 rounded-md bg-trading-down/10 border border-trading-down text-body-sm text-trading-down">
            {authError}
          </div>
        )}

        <button
          onClick={handleGitHubLogin}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-md font-button text-on-primary bg-primary hover:bg-primary-active transition-colors"
        >
          <KeyRound size={20} />
          Sign In with GitHub
        </button>

        <div className="mt-6 flex items-start gap-3 p-4 bg-surface-elevated-dark rounded-lg text-left">
          <ShieldAlert className="text-muted shrink-0 mt-0.5" size={18} />
          <p className="text-caption text-muted">
            Sustainverse operates entirely locally on your machine. Your OAuth
            token is stored securely in your browser and is never sent to any
            external servers other than the official GitHub API.
          </p>
        </div>
      </div>
    </div>
  );
}
