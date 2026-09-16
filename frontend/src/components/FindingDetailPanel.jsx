import { useState, useEffect, useRef, Component } from 'react'
import {
  X, Brain, MagnifyingGlass, CircleNotch, Warning, CaretDown, CaretUp,
  ArrowSquareOut, ShieldCheck, Lightning, ArrowRight, CheckCircle,
  Question, Info
} from '@phosphor-icons/react'
import ReactMarkdown from 'react-markdown'
import DependencyGraph from './DependencyGraph'

class FindingPanelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("FindingDetailPanel ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={this.props.onClose} aria-hidden="true" />
          <div className="fixed right-0 top-0 h-full w-full max-w-[800px] bg-canvas-dark border-l border-hairline-on-dark z-40 p-6 flex flex-col shadow-2xl overflow-y-auto" role="dialog">
            <div className="flex justify-between items-center mb-6 border-b border-hairline-on-dark pb-4">
              <div className="flex items-center gap-2">
                <Warning size={20} className="text-trading-down" />
                <h3 className="text-title-md text-on-dark">Analysis View Error</h3>
              </div>
              <button onClick={this.props.onClose} className="p-2 text-muted hover:text-on-dark rounded-lg hover:bg-surface-elevated-dark transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-trading-down/10 border border-trading-down/30 rounded-xl mb-4">
              <p className="text-body-sm text-trading-down font-medium mb-1">
                An error occurred while rendering the finding details.
              </p>
              <p className="text-caption text-muted font-plex">
                {String(this.state.error?.message || this.state.error)}
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-auto h-10 px-6 bg-surface-elevated-dark hover:bg-surface-card-dark text-on-dark text-body-sm font-button rounded-lg border border-hairline-on-dark transition-colors self-start"
            >
              Reset View
            </button>
          </div>
        </>
      );
    }
    return this.props.children;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const severityColor = (sev) => {
  const s = (sev || '').toUpperCase()
  if (s === 'CRITICAL') return 'text-severity-critical'
  if (s === 'HIGH')     return 'text-severity-high'
  if (s === 'MEDIUM' || s === 'MODERATE') return 'text-severity-moderate'
  return 'text-severity-low'
}

const priorityBadge = (p) => {
  const badges = {
    critical: 'bg-severity-critical/20 text-severity-critical border border-severity-critical/30',
    high:     'bg-severity-high/10 text-severity-high border border-severity-high/20',
    medium:   'bg-severity-moderate/15 text-severity-moderate border border-severity-moderate/30',
    moderate: 'bg-severity-moderate/15 text-severity-moderate border border-severity-moderate/30',
    low:      'bg-severity-low/10 text-severity-low border border-severity-low/30',
  }
  return badges[p?.toLowerCase()] || badges.medium
}

const confidenceBadge = (level) => {
  if (level === 'high')         return 'text-trading-up'
  if (level === 'medium' || level === 'moderate') return 'text-primary'
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
        {open ? <CaretUp size={14} className="text-muted" /> : <CaretDown size={14} className="text-muted" />}
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
    'MagnifyingGlassing security intelligence...',
    'Filtering authoritative sources...',
    'Generating AI assessment...',
  ]
  return (
    <div className="py-8 flex flex-col items-center gap-4">
      <CircleNotch size={32} className="text-primary animate-spin" />
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

function AnalysisResult({ analysis, finding }) {
  const [isReviewed, setIsReviewed] = useState(finding?.is_reviewed || false)
  const [reviewing, setReviewing] = useState(false)
  if (!analysis) return null

  const { summary, why_it_matters, evidence, impact, confidence, uncertainty,
    recommendation, verification_steps, sources, research_used } = analysis

  const summaryText = typeof summary === 'string' ? summary : (summary ? JSON.stringify(summary, null, 2) : '')
  const whyText = typeof why_it_matters === 'string' ? why_it_matters : (why_it_matters ? JSON.stringify(why_it_matters, null, 2) : '')
  const impactText = typeof impact === 'string' ? impact : (impact ? JSON.stringify(impact, null, 2) : '')

  const evidenceList = Array.isArray(evidence) ? evidence : (typeof evidence === 'string' ? [evidence] : [])
  const verificationList = Array.isArray(verification_steps) ? verification_steps : (typeof verification_steps === 'string' ? [verification_steps] : [])
  const uncertaintyList = Array.isArray(uncertainty) ? uncertainty : (typeof uncertainty === 'string' ? [uncertainty] : [])
  const sourcesList = Array.isArray(sources) ? sources : []

  const targetFindingId = finding?.finding_id || finding?.id

  const needsReview = 
    recommendation?.action === 'investigate' || 
    confidence?.level === 'low' || 
    summaryText.toLowerCase().includes('suspicious') ||
    recommendation?.rationale?.toLowerCase().includes('authorization') ||
    recommendation?.rationale?.toLowerCase().includes('suspicious')

  const toggleReview = async () => {
    if (!targetFindingId) return
    setReviewing(true)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/findings/${targetFindingId}/review`, {
        method: 'POST',
      })
      if (res.ok) {
        setIsReviewed(!isReviewed)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Summary */}
      {needsReview && (
        <div className="p-3 bg-trading-down/10 border border-trading-down/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warning size={14} className="text-trading-down" />
            <span className="text-body-sm font-medium text-trading-down">Suspicious Finding / Authorization Required</span>
          </div>
          <button 
            onClick={toggleReview}
            disabled={reviewing}
            className={`px-3 py-1.5 rounded-md text-caption font-button transition-colors flex items-center gap-1 ${
              isReviewed 
                ? 'bg-trading-up/20 text-trading-up hover:bg-trading-up/30' 
                : 'bg-primary hover:bg-primary-active text-ink'
            }`}
          >
            {isReviewed ? <><CheckCircle size={12}/> Reviewed</> : 'Mark Reviewed'}
          </button>
        </div>
      )}
      
      <div className="p-4 bg-surface-elevated-dark rounded-lg border border-hairline-on-dark">
        <div className="text-body-sm text-on-dark leading-relaxed prose prose-invert prose-p:mb-2 prose-a:text-accent-turquoise max-w-none">
          <ReactMarkdown>
            {summaryText}
          </ReactMarkdown>
        </div>
        {research_used && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-hairline-on-dark">
            <MagnifyingGlass size={11} className="text-accent-turquoise" />
            <span className="text-caption text-accent-turquoise">External research used</span>
          </div>
        )}
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-elevated-dark rounded-lg border border-hairline-on-dark">
        <span className="text-caption text-muted">Confidence</span>
        <div className="flex items-center gap-2">
          <span className={`text-caption font-medium uppercase ${confidenceBadge(confidence?.level)}`}>
            {confidence?.level || 'MEDIUM'}
          </span>
          <span className="text-caption text-muted font-plex">
            {confidence?.score != null ? `${Math.round(confidence.score * 100)}%` : ''}
          </span>
        </div>
      </div>

      {/* Why it matters */}
      {whyText && (
        <CollapsibleSection title="Why It Matters" icon={Info}>
          <div className="text-body-sm text-body leading-relaxed prose prose-invert max-w-none">
            <ReactMarkdown>
              {whyText}
            </ReactMarkdown>
          </div>
        </CollapsibleSection>
      )}

      {/* Evidence */}
      {evidenceList.length > 0 && (
        <CollapsibleSection title="Evidence" icon={ShieldCheck}>
          <ul className="space-y-1.5">
            {evidenceList.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-body">
                <CheckCircle size={13} className="text-trading-up mt-0.5 shrink-0" />
                {typeof e === 'string' ? e : JSON.stringify(e)}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Impact */}
      {impactText && (
        <CollapsibleSection title="Impact" icon={Warning} defaultOpen={false}>
          <p className="text-body-sm text-body leading-relaxed">{impactText}</p>
        </CollapsibleSection>
      )}

      {/* Recommendation */}
      {recommendation && (
        <CollapsibleSection title="Recommendation" icon={Lightning}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-caption px-2 py-0.5 rounded-pill uppercase font-medium ${priorityBadge(recommendation.priority)}`}>
                {recommendation.priority || 'medium'}
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
      {verificationList.length > 0 && (
        <CollapsibleSection title="Verification Steps" icon={CheckCircle} defaultOpen={false}>
          <ol className="space-y-1.5">
            {verificationList.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-body">
                <span className="text-primary font-plex shrink-0 w-4">{i + 1}.</span>
                {typeof step === 'string' ? step : JSON.stringify(step)}
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {/* Uncertainty */}
      {uncertaintyList.length > 0 && (
        <CollapsibleSection title="Uncertainty" icon={Question} defaultOpen={false}>
          <ul className="space-y-1.5">
            {uncertaintyList.map((u, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-muted">
                <Warning size={12} className="text-primary mt-0.5 shrink-0" />
                {typeof u === 'string' ? u : JSON.stringify(u)}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Sources */}
      {sourcesList.length > 0 && (
        <CollapsibleSection title={`Real-time Tavily MagnifyingGlass & OSV Sources (${sourcesList.length})`} icon={MagnifyingGlass} defaultOpen={true}>
          <ul className="space-y-2">
            {sourcesList.map((s, i) => (
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
                    <ArrowSquareOut size={10} />
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

function FindingDetailPanelInner({ finding, dependencies, onClose }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState(null)
  const stepInterval = useRef(null)

  useEffect(() => {
    if (finding) {
      setAnalysis(null)
      setError(null)
    }
  }, [finding?.finding_id])

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
    let numericFindingId = finding?.finding_id;
    if (typeof numericFindingId !== 'number' && typeof finding?.id === 'number') {
      numericFindingId = finding.id;
    }
    if (!numericFindingId && finding?.id && !isNaN(Number(finding.id))) {
      numericFindingId = Number(finding.id);
    }

    if (!numericFindingId || typeof numericFindingId !== 'number') {
      setError('Cannot analyze finding: missing valid numeric finding ID.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/intelligence/analyze-finding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding_id: numericFindingId,
          question,
          question_type: questionType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        let msg = `Server error ${res.status}`;
        if (typeof err.detail === 'string') {
          msg = err.detail;
        } else if (Array.isArray(err.detail)) {
          msg = err.detail.map(d => (d.msg ? `${d.loc ? d.loc.join('.'): ''}: ${d.msg}` : JSON.stringify(d))).join('; ');
        } else if (err.detail) {
          msg = JSON.stringify(err.detail);
        }
        throw new Error(msg);
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      const displayMsg = typeof e?.message === 'string' ? e.message : 'Failed to reach AI service.';
      setError(displayMsg);
    } finally {
      setLoading(false);
    }
  }

  if (!finding) return null

  const [pkgName, pkgVersion] = (finding.id || '').split('@')

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={onClose} aria-hidden="true" />

      <div className="fixed right-0 top-0 h-full w-full max-w-[800px] bg-canvas-dark border-l border-hairline-on-dark z-40 flex flex-col shadow-2xl overflow-hidden" role="dialog">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-hairline-on-dark shrink-0 bg-surface-dark">
          <div className="flex items-center gap-4">
            <div className="min-w-10 h-10 px-2 rounded-lg bg-surface-elevated-dark flex items-center justify-center text-body-sm font-plex text-primary shrink-0" title={finding.ecosystem || 'npm'}>
              {finding.ecosystem || 'npm'}
            </div>
            <div>
              <h2 className="text-title-md text-on-dark truncate max-w-[500px]">
                {finding.package_name || pkgName}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-plex text-body-sm text-primary">v{finding.version || pkgVersion}</span>
                <span className="text-muted text-xs">•</span>
                <span className={`text-caption font-medium uppercase ${severityColor(finding.risk)}`}>
                  {finding.risk}
                </span>
                <span className="text-muted text-xs">•</span>
                <span className="text-caption text-muted">{finding.direct ? 'Direct dependency' : 'Transitive dependency'}</span>
                <span className="text-muted text-xs">•</span>
                <span className="text-caption text-muted font-plex">#{finding.finding_id}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-elevated-dark text-muted hover:text-on-dark transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-hairline-on-dark bg-surface-dark shrink-0">
          <button
            className={`px-4 py-3 text-body-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-on-dark'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-3 text-body-sm font-medium border-b-2 transition-colors ${activeTab === 'tree' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-on-dark'}`}
            onClick={() => setActiveTab('tree')}
          >
            Node Tree
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-canvas-dark">
          {activeTab === 'tree' && (
            <div className="h-full min-h-[500px] flex flex-col">
              <h3 className="text-title-sm text-on-dark mb-4">Dependency Node Tree</h3>
              <p className="text-body-sm text-muted mb-4">Visual representation of how this dependency is connected in your project.</p>
              <div className="flex-1 bg-surface-dark border border-hairline-on-dark rounded-xl overflow-hidden relative">
                {dependencies ? (
                  <DependencyGraph dependencies={dependencies} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-muted">No dependency graph available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
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
                <Warning size={16} className="text-trading-down mt-0.5 shrink-0" />
                <div>
                  <p className="text-body-sm font-medium text-trading-down">Analysis Failed</p>
                  <p className="text-body-sm text-muted mt-1">{String(error)}</p>
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
              <AnalysisResult analysis={analysis} finding={finding} />
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
          )}
        </div>

        {/* Footer CTA */}
      {!loading && activeTab === 'overview' && (
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

export default function FindingDetailPanel(props) {
  return (
    <FindingPanelErrorBoundary onClose={props.onClose}>
      <FindingDetailPanelInner {...props} />
    </FindingPanelErrorBoundary>
  )
}
