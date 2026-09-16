import { motion, AnimatePresence } from 'framer-motion'
import { RocketLaunch, Speedometer, Video, Microphone, Globe } from '@phosphor-icons/react'

const container = {
  hidden: { opacity: 0, y: -6 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.2,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.2,
    },
  },
}

function ActionSearchBar({
  open = false,
  actions = [
    { id: '1', label: 'Book tickets', icon: <RocketLaunch className="h-4 w-4 text-primary" />, description: 'Operator', end: 'Agent' },
    { id: '2', label: 'Summarize', icon: <Speedometer className="h-4 w-4 text-primary" />, description: 'gpt-4o', end: 'Command' },
    { id: '3', label: 'Screen Studio', icon: <Video className="h-4 w-4 text-primary" />, description: 'gpt-4o', end: 'Application' },
    { id: '4', label: 'Talk to Jarvis', icon: <Microphone className="h-4 w-4 text-primary" />, description: 'gpt-4o voice', end: 'Active' },
    { id: '5', label: 'Translate', icon: <Globe className="h-4 w-4 text-primary" />, description: 'gpt-4o', end: 'Command' },
  ],
  loading = false,
  error = '',
  emptyText = 'No repositories found.',
  onSelect,
  className = '',
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`overflow-hidden rounded-2xl border border-white/10 bg-[#1c1815] shadow-2xl ${className}`}
          variants={container}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <div className="border-b border-white/[.07] px-4 py-3 text-xs font-semibold text-on-dark">Your repositories</div>
          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {loading && (
              <motion.p variants={item} className="flex items-center gap-3 px-4 py-3 text-sm text-muted">
                <motion.span
                  className="h-3 w-3 shrink-0 rounded-full border-2 border-trading-up border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
                Loading repositories…
              </motion.p>
            )}
            {error && <motion.p variants={item} className="px-4 py-4 text-sm text-trading-down">{error}</motion.p>}
            {!loading &&
              !error &&
              actions.map((action) => (
                <motion.button
                  key={action.id}
                  type="button"
                  variants={item}
                  layout
                  onClick={() => onSelect?.(action)}
                  className="flex w-full items-center gap-3 border-b border-white/[.05] px-4 py-3 text-left transition-colors hover:bg-white/[.04]"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[.04] text-primary">{action.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-on-dark">{action.label}</span>
                    {action.description && <span className="mt-0.5 block truncate text-xs text-muted">{action.description}</span>}
                  </span>
                  {action.end && <span className="shrink-0 text-[10px] uppercase tracking-[.12em] text-muted">{action.end}</span>}
                </motion.button>
              ))}
            {!loading && !error && actions.length === 0 && <motion.p variants={item} className="px-4 py-4 text-sm text-muted">{emptyText}</motion.p>}
          </div>
          <div className="border-t border-white/[.07] px-4 py-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[.14em] text-muted">
              <span>Select a repository</span>
              <span>ESC to close</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { ActionSearchBar }
export default ActionSearchBar