import { useState } from 'react'
import { KeyRound, ShieldAlert } from 'lucide-react'

export default function Login({ setToken }) {
  const [tokenInput, setTokenInput] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    if (tokenInput.trim()) {
      setToken(tokenInput.trim())
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-canvas-dark to-canvas-dark"></div>
      
      <div className="max-w-md w-full bg-surface-card-dark rounded-xl p-8 border border-hairline-on-dark shadow-2xl relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-surface-elevated-dark rounded-full flex items-center justify-center text-primary">
            <KeyRound size={32} />
          </div>
        </div>
        
        <h1 className="text-display-sm text-on-dark text-center mb-2">Connect GitHub</h1>
        <p className="text-body-md text-muted text-center mb-8">
          Sustainverse requires a Personal Access Token (PAT) to analyze your private repositories securely.
        </p>

        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label className="block text-title-sm text-body mb-2">Personal Access Token</label>
            <input 
              type="password" 
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full bg-canvas-dark text-on-dark border border-hairline-on-dark rounded-lg p-3 outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <button 
            type="submit"
            disabled={!tokenInput}
            className="w-full h-12 rounded-md font-button text-on-primary bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted transition-colors"
          >
            Authenticate & Continue
          </button>
        </form>
        
        <div className="mt-6 flex items-start gap-3 p-4 bg-surface-elevated-dark rounded-lg">
          <ShieldAlert className="text-muted shrink-0" size={20} />
          <p className="text-caption text-muted">
            Your token never leaves this machine. It is stored in local browser storage and sent directly to GitHub and the local Python backend.
          </p>
        </div>
      </div>
    </div>
  )
}
