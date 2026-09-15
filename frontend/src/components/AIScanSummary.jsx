import { useState, useEffect } from 'react'
import { Brain, Loader2, AlertTriangle, Sparkles } from 'lucide-react'

/**
 * AIScanSummary — compact AI overview card shown after a scan completes.
 * Sits below the risk score circle in the Dashboard results view.
 */
export default function AIScanSummary({ scanId }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (scanId && !fetched) {
      fetchSummary()
    }
  }, [scanId])

  const fetchSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/intelligence/scan-summary?scan_id=${scanId}`,
        { method: 'POST' }
      )
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setSummary(data.summary)
      setFetched(true)
    } catch {
      setError('AI summary unavailable. Check backend or add GROQ_API_KEY.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-card-dark rounded-xl p-5 border border-hairline-on-dark mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-primary" />
          <span className="text-body-sm font-medium text-on-dark">AI Assessment</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles size={12} className="text-primary" />
          <span className="text-caption text-muted">Groq · llama-3.3-70b</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={14} className="text-primary animate-spin" />
          <span className="text-body-sm text-muted">Generating AI assessment...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-2 py-1">
          <AlertTriangle size={13} className="text-muted mt-0.5 shrink-0" />
          <p className="text-body-sm text-muted">{error}</p>
        </div>
      )}

      {summary && !loading && (
        <p className="text-body-sm text-body leading-relaxed">{summary}</p>
      )}

      {!summary && !loading && !error && (
        <button
          onClick={fetchSummary}
          className="w-full h-9 flex items-center justify-center gap-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-body-sm font-medium transition-colors"
        >
          <Brain size={14} />
          Generate AI Overview
        </button>
      )}
    </div>
  )
}
