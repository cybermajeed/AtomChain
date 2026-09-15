import { useState, useEffect, useRef } from 'react'
import {
  X, Brain, Search, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  ExternalLink, ShieldCheck, ShieldAlert, Zap, ArrowRight, CheckCircle,
  CircleHelp, Info
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

const severityColor = (sev) => {
  const s = (sev || '').toUpperCase()
  if (s === 'CRITICAL') return 'text-trading-down'
  if (s === 'HIGH')     return 'text-trading-down'
  if (s === 'MEDIUM')   return 'text-primary'
  return 'text-trading-up'
}

const priorityBadge = (p) => {
  const badges = {
    critical: 'bg-trading-down/20 text-trading-down border border-trading-down/30',
    high:     'bg-trading-down/10 text-trading-down border border-trading-down/20',
    medium:   'bg-primary/15 text-primary border border-primary/30',
    low:      'bg-trading-up/10 text-trading-up border border-trading-up/30',
  }
  return badges[p?.toLowerCase()] || badges.medium
}

const confidenceBadge = (level) => {
  if (level === 'high')         return 'text-trading-up'
  if (level === 'medium')       return 'text-primary'
  if (level === 'low')          return 'text-trading-down'
  return 'text-muted'
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-hairline-on-dark rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-elevated-dark hover:bg-surface-card-dark transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-primary" />}
          <span className="text-body-sm font-medium text-on-dark">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>
      {open && <div className="px-4 py-3 bg-surface-card-dark">{children}</div>}
    </div>
  )
}

function QuickQuestion({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left text-body-sm text-body hover:text-primary hover:bg-surface-elevated-dark px-3 py-2 rounded-lg border border-hairline-on-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}

function LoadingSteps({ step }) {
  const steps = [
    'Collecting security context...',
    'Searching security intelligence...',
    'Filtering authoritative sources...',
    'Generating AI assessment...',
  ]
  return (
    <div className="py-8 flex flex-col items-center gap-4">
      <Loader2 size={32} className="text-primary animate-spin" />
      <div className="text-center">
        <p className="text-body-sm text-on-dark font-medium">{steps[step % steps.length]}</p>
        <p className="text-caption text-muted mt-1">Powered by Groq · llama-3.3-70b</p>
      </div>
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i <= (step % steps.length) ? 'bg-primary' : 'bg-surface-elevated-dark'}`}
          />
        ))}
      </div>
    </div>
  )
}

function AnalysisResult({ analysis }) {
  if (!analysis) return null
  const { summary, why_it_matters, evidence, impact, confidence, uncertainty,
    recommendation, verification_steps, sources, research_used } = analysis

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="p-3 bg-surface-elevated-dark rounded-lg border border-hairline-on-dark">
        <p className="text-body-sm text-on-dark leading-relaxed">{summary}</p>
        {research_used && (
          <div className="flex items-center gap-1 mt-2">
            <Search size={11} className="text-accent-turquoise" />
            <span className="text-caption text-accent-turquoise">External research used</span>
          </div>
        )}
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-elevated-dark rounded-lg border border-hairline-on-dark">
        <span className="text-caption text-muted">Confidence</span>
        <div className="flex items-center gap-2">
          <span className={`text-caption font-medium uppercase ${confidenceBadge(confidence?.level)}`}>
            {confidence?.level}
          </span>
          <span className="text-caption text-muted font-plex">
            {confidence?.score != null ? `${Math.round(confidence.score * 100)}%` : ''}
          </span>
        </div>
      </div>

      {/* Why it matters */}
      {why_it_matters && (
        <CollapsibleSection title="Why It Matters" icon={Info}>
          <p className="text-body-sm text-body leading-relaxed">{why_it_matters}</p>
        </CollapsibleSection>
      )}

      {/* Evidence */}
      {evidence?.length > 0 && (
        <CollapsibleSection title="Evidence" icon={ShieldCheck}>
          <ul className="space-y-1.5">
            {evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-body">
                <CheckCircle size={13} className="text-trading-up mt-0.5 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Impact */}
      {impact && (
        <CollapsibleSection title="Impact" icon={ShieldAlert} defaultOpen={false}>
          <p className="text-body-sm text-body leading-relaxed">{impact}</p>
        </CollapsibleSection>
      )}

      {/* Recommendation */}
      {recommendation && (
        <CollapsibleSection title="Recommendation" icon={Zap}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-caption px-2 py-0.5 rounded-pill uppercase font-medium ${priorityBadge(recommendation.priority)}`}>
                {recommendation.priority}
              </span>
              <span className="text-body-sm font-medium text-on-dark capitalize">{recommendation.action}</span>
              {recommendation.target_version && (
                <span className="text-body-sm font-plex text-primary">→ v{recommendation.target_version}</span>
              )}
            </div>
            <p className="text-body-sm text-body leading-relaxed">{recommendation.rationale}</p>
          </div>
        </CollapsibleSection>
      )}

      {/* Verification Steps */}
      {verification_steps?.length > 0 && (
        <CollapsibleSection title="Verification Steps" icon={CheckCircle} defaultOpen={false}>
          <ol className="space-y-1.5">
            {verification_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-body">
                <span className="text-primary font-plex shrink-0 w-4">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {/* Uncertainty */}
      {uncertainty?.length > 0 && (
        <CollapsibleSection title="Uncertainty" icon={CircleHelp} defaultOpen={false}>
          <ul className="space-y-1.5">
            {uncertainty.map((u, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-muted">
                <AlertTriangle size={12} className="text-primary mt-0.5 shrink-0" />
                {u}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Sources */}
      {sources?.length > 0 && (
        <CollapsibleSection title={`Sources (${sources.length})`} icon={Search} defaultOpen={false}>
          <ul className="space-y-2">
            {sources.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <ArrowRight size={11} className="text-muted mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-body-sm text-on-dark truncate">{s.title || s.url}</p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-caption text-accent-turquoise hover:underline flex items-center gap-1 truncate"
                  >
                    <ExternalLink size={10} />
                    {s.url}
                  </a>
                  {s.authority && (
                    <span className="text-caption text-muted">{s.authority}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  { label: '❓ Why is this risky?', type: 'vulnerability', q: 'Why is this finding risky and high priority?' },
  { label: '🔧 How do I fix this?', type: 'remediation', q: 'What is the recommended remediation? What version should I upgrade to?' },
  { label: '💥 What could break?', type: 'remediation', q: 'What could break if I upgrade this dependency? What should I verify after upgrading?' },
  { label: '🔍 Research this vuln', type: 'vulnerability', q: 'Research this vulnerability and provide all available advisory details.' },
]

export default function FindingDetailPanel({ finding, onClose }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState(null)
  const stepInterval = useRef(null)

  // Auto-scroll panel into view
  useEffect(() => {
    if (finding) {
      setAnalysis(null)
      setError(null)
    }
  }, [finding?.finding_id])

  // Advance loading step dots animation
  useEffect(() => {
    if (loading) {
      stepInterval.current = setInterval(() => setLoadingStep(s => s + 1), 1200)
    } else {
      clearInterval(stepInterval.current)
      setLoadingStep(0)
    }
    return () => clearInterval(stepInterval.current)
  }, [loading])

  const runAnalysis = async (questionType = 'vulnerability', question = null) => {
    if (!finding?.finding_id) return
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/intelligence/analyze-finding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding_id: finding.finding_id,
          question,
          question_type: questionType,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      setAnalysis(data)
    } catch (e) {
      setError(e.message || 'Failed to reach AI service. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  if (!finding) return null

  const [pkgName, pkgVersion] = (finding.id || '').split('@')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-canvas-dark border-l border-hairline-on-dark z-40 flex flex-col shadow-2xl"
        role="dialog"
        aria-label="Finding Details"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-on-dark shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-surface-elevated-dark flex items-center justify-center text-caption font-plex text-primary shrink-0">
              npm
            </div>
            <div className="min-w-0">
              <p className="text-title-sm text-on-dark truncate">{finding.id}</p>
              <p className="text-caption text-muted">{finding.direct ? 'Direct dependency' : 'Transitive dependency'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-on-dark transition-colors p-1 rounded shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Meta strip */}
        <div className="flex items-center gap-3 px-5 py-3 bg-surface-card-dark border-b border-hairline-on-dark shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-caption text-muted">Severity</span>
            <span className={`text-body-sm font-medium uppercase ${severityColor(finding.risk)}`}>
              {finding.risk}
            </span>
          </div>
          <div className="w-px h-8 bg-hairline-on-dark" />
          <div className="flex flex-col gap-0.5">
            <span className="text-caption text-muted">Topology</span>
            <span className="text-body-sm text-on-dark">{finding.direct ? 'Direct' : 'Transitive'}</span>
          </div>
          <div className="w-px h-8 bg-hairline-on-dark" />
          <div className="flex flex-col gap-0.5">
            <span className="text-caption text-muted">Finding ID</span>
            <span className="text-body-sm font-plex text-on-dark">#{finding.finding_id}</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Quick Questions */}
          {!loading && !analysis && (
            <div>
              <p className="text-caption text-muted mb-2 uppercase tracking-wider">Quick Analysis</p>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_QUESTIONS.map((qq, i) => (
                  <QuickQuestion
                    key={i}
                    label={qq.label}
                    disabled={loading}
                    onClick={() => runAnalysis(qq.type, qq.q)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && <LoadingSteps step={loadingStep} />}

          {/* Error */}
          {error && !loading && (
            <div className="p-4 bg-trading-down/10 border border-trading-down/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-trading-down mt-0.5 shrink-0" />
                <div>
                  <p className="text-body-sm font-medium text-trading-down">Analysis Failed</p>
                  <p className="text-body-sm text-muted mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Analysis result */}
          {analysis && !loading && (
            <>
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-primary" />
                <p className="text-caption text-muted uppercase tracking-wider">AI Security Assessment</p>
              </div>
              <AnalysisResult analysis={analysis} />
              {/* Ask another question */}
              <div>
                <p className="text-caption text-muted mb-2 uppercase tracking-wider">Ask Another</p>
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_QUESTIONS.map((qq, i) => (
                    <QuickQuestion
                      key={i}
                      label={qq.label}
                      disabled={loading}
                      onClick={() => runAnalysis(qq.type, qq.q)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer CTA */}
        {!loading && (
          <div className="px-5 py-4 border-t border-hairline-on-dark shrink-0">
            <button
              onClick={() => runAnalysis('vulnerability')}
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted text-ink font-button transition-colors"
            >
              <Brain size={16} />
              {analysis ? 'Re-analyze with AI' : 'Analyze with AI'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
