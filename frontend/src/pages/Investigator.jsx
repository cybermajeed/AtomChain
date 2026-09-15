import { useState, useEffect, useRef } from 'react'
import {
  Brain, Send, Loader2, AlertTriangle, ShieldCheck, Sparkles,
  RefreshCw, MessageCircle, Info
} from 'lucide-react'

// ─── Preset copilot questions ─────────────────────────────────────────────────

const PRESET_QUESTIONS = [
  'Which finding should I fix first?',
  'Summarize the overall security posture.',
  'Why did the risk score come out this way?',
  'Show me the most suspicious dependencies.',
  'What vulnerabilities are confirmed vs suspected?',
  'What should I verify after fixing the top issue?',
]

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mr-2 mt-0.5">
          <Brain size={13} className="text-primary" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-xl text-body-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-ink rounded-br-sm'
            : 'bg-surface-card-dark border border-hairline-on-dark text-body rounded-bl-sm'
        }`}
      >
        {msg.content}
        {msg.loading && (
          <div className="flex items-center gap-1 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Scan selector ─────────────────────────────────────────────────────────────

function ScanContext({ scanId, setScanId }) {
  const [inputVal, setInputVal] = useState(scanId || '')
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-surface-card-dark border-b border-hairline-on-dark">
      <Info size={14} className="text-muted shrink-0" />
      <span className="text-caption text-muted">Scan ID:</span>
      <input
        type="number"
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onBlur={() => { if (inputVal) setScanId(Number(inputVal)) }}
        placeholder="Enter scan ID to focus"
        className="bg-transparent text-body-sm text-on-dark outline-none border-b border-hairline-on-dark pb-0.5 w-24 font-plex"
      />
      {scanId && (
        <span className="text-caption text-trading-up ml-auto">Active</span>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Investigator() {
  const [scanId, setScanId] = useState(() => {
    const stored = localStorage.getItem('last_scan_id')
    return stored ? Number(stored) : null
  })
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "I'm your SupplyShield Security Analyst, powered by Groq's llama-3.3-70b. " +
        "I have access to your scan findings and can help you understand vulnerabilities, " +
        "prioritize remediation, and interpret the dependency risk. " +
        "Enter a scan ID above to get started, or ask me anything.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const question = (text || input).trim()
    if (!question) return

    const userMsg = { role: 'user', content: question }
    const loadingMsg = { role: 'assistant', content: '', loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      if (!scanId) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content:
              "Please enter a Scan ID in the field above so I can access your scan context. " +
              "You can find the scan ID in the Dashboard after a scan completes.",
          },
        ])
        setLoading(false)
        return
      }

      // Build message history for context (exclude the loading placeholder)
      const history = messages
        .filter(m => !m.loading)
        .concat(userMsg)
        .slice(-10) // Keep last 10 messages for context window efficiency

      const res = await fetch('http://127.0.0.1:8000/api/intelligence/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_id: scanId,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }

      const data = await res.json()

      setMessages(prev => [
        ...prev.slice(0, -1), // Remove loading bubble
        { role: 'assistant', content: data.content },
      ])
    } catch (e) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `⚠️ ${e.message || 'Failed to reach AI service. Make sure the backend is running on port 8000.'}`,
        },
      ])
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const resetConversation = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "Conversation cleared. I'm ready to help analyze your supply chain security. " +
          "What would you like to know?",
      },
    ])
    setError(null)
  }

  return (
    <div className="flex-1 flex flex-col max-h-[calc(100vh-64px)]">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-hairline-on-dark bg-canvas-dark shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Brain size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-title-md text-on-dark">AI Investigator</h1>
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-primary" />
                <span className="text-caption text-muted">Groq · llama-3.3-70b-versatile</span>
              </div>
            </div>
          </div>
          <button
            onClick={resetConversation}
            className="flex items-center gap-1.5 text-body-sm text-muted hover:text-on-dark transition-colors"
          >
            <RefreshCw size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Scan Context Bar */}
      <div className="max-w-4xl mx-auto w-full px-6 shrink-0">
        <ScanContext scanId={scanId} setScanId={(id) => {
          setScanId(id)
          localStorage.setItem('last_scan_id', id)
        }} />
      </div>

      {/* Preset questions strip */}
      {messages.length <= 1 && (
        <div className="max-w-4xl mx-auto w-full px-6 py-4 shrink-0">
          <p className="text-caption text-muted mb-3 uppercase tracking-wider">Suggested Questions</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-body-sm text-body hover:text-on-dark hover:border-primary/50 border border-hairline-on-dark px-3 py-1.5 rounded-pill transition-colors disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-hairline-on-dark bg-canvas-dark shrink-0">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="flex items-center gap-2 mb-2 text-caption text-trading-down">
              <AlertTriangle size={12} />
              {error}
            </div>
          )}
          <div className="flex items-end gap-3 bg-surface-card-dark border border-hairline-on-dark rounded-xl p-3">
            <MessageCircle size={16} className="text-muted shrink-0 mb-0.5" />
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your scan, vulnerabilities, remediation..."
              rows={1}
              className="flex-1 bg-transparent text-body-sm text-on-dark placeholder-muted resize-none outline-none max-h-32 overflow-y-auto"
              style={{ fieldSizing: 'content' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-lg bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted flex items-center justify-center shrink-0 transition-colors"
            >
              {loading
                ? <Loader2 size={14} className="text-ink animate-spin" />
                : <Send size={14} className="text-ink" />
              }
            </button>
          </div>
          <p className="text-caption text-muted mt-2 text-center">
            AI analyzes your scan data · Never modifies your code or production systems
          </p>
        </div>
      </div>
    </div>
  )
}
