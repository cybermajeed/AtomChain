import { useState, useEffect } from 'react'
import { Brain, CircleNotch, Warning, StarFour } from '@phosphor-icons/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ─── Markdown Components Map ───────────────────────────────────────────────────

const markdownComponents = {
  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
  li: ({node, ...props}) => <li className="pl-1" {...props} />,
  h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-4 text-on-dark" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 mt-3 text-on-dark" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-2 text-on-dark" {...props} />,
  a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold text-on-dark" {...props} />,
  code: ({node, inline, ...props}) => inline ? (
    <code className="bg-canvas-dark px-1 py-0.5 rounded text-[0.9em] font-plex text-trading-up" {...props} />
  ) : (
    <pre className="bg-canvas-dark p-3 rounded-lg overflow-x-auto my-2 border border-hairline-on-dark">
      <code className="font-plex text-sm text-body" {...props} />
    </pre>
  ),
  table: ({node, ...props}) => <div className="overflow-x-auto my-3"><table className="w-full text-left border-collapse text-sm" {...props} /></div>,
  th: ({node, ...props}) => <th className="border-b border-hairline-on-dark px-2 py-1.5 font-medium text-muted whitespace-nowrap" {...props} />,
  td: ({node, ...props}) => <td className="border-b border-hairline-on-dark/50 px-2 py-1.5" {...props} />,
  blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary pl-3 italic text-muted my-2" {...props} />
}

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
          <StarFour size={12} className="text-primary" />
          <span className="text-caption text-muted">Groq · gpt-oss-120b</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <CircleNotch size={14} className="text-primary animate-spin" />
          <span className="text-body-sm text-muted">Generating AI assessment...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-2 py-1">
          <Warning size={13} className="text-muted mt-0.5 shrink-0" />
          <p className="text-body-sm text-muted">{error}</p>
        </div>
      )}

      {summary && !loading && (
        <div className="text-body-sm text-body leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {summary}
          </ReactMarkdown>
        </div>
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
