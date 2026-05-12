import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Search, Sparkles, AlertTriangle, Lock, ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendChat } from '../api'
import UpgradeModal from './UpgradeModal'

const FREE_GPT_LIMIT = 5
const MODE_KEY = 'coretriage_chat_mode'

function getLocalChatUsed() {
  return parseInt(localStorage.getItem('ct_chat_used') || '0', 10)
}
function incrementLocalChatUsed() {
  const n = getLocalChatUsed() + 1
  localStorage.setItem('ct_chat_used', String(n))
  return n
}

const MODE_META = {
  kb:  { label: 'Lookup',    icon: Search,    color: 'text-accent',  desc: 'Climbing-injury knowledge base · free for all' },
  gpt: { label: 'AI answer', icon: Sparkles,  color: 'text-accent3', desc: 'GPT-synthesized answer · 5 free / unlimited Pro' },
}

// ── Memoized message item — skips re-render on every input keystroke ──────────

const MessageItem = memo(function MessageItem({ msg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {msg.role === 'assistant' && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/30 to-accent2/20 border border-outline flex items-center justify-center shrink-0 mt-1">
          <Bot size={14} className="text-accent" />
        </div>
      )}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        msg.role === 'user'
          ? 'bg-gradient-to-br from-accent2/25 to-accent3/15 border border-accent2/25 text-text rounded-tr-sm'
          : 'bg-panel border border-outline text-muted rounded-tl-sm'
      }`}>
        {msg.role === 'assistant' ? (
          <ReactMarkdown className="prose prose-sm prose-invert max-w-none">
            {msg.content}
          </ReactMarkdown>
        ) : (
          msg.content
        )}
      </div>
      {msg.role === 'user' && (
        <div className="w-7 h-7 rounded-lg bg-accent2/20 border border-accent2/30 flex items-center justify-center shrink-0 mt-1">
          <User size={14} className="text-accent2" />
        </div>
      )}
    </motion.div>
  )
})

// ── Main view ─────────────────────────────────────────────────────────────────

export default function AIChatView({ k, user, onBack }) {
  // Default to Lookup (kb) so first-time users don't burn a paid GPT message.
  // Persisted after their first explicit toggle.
  const [mode, setMode] = useState(() => localStorage.getItem(MODE_KEY) || 'kb')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatUsed, setChatUsed] = useState(() => getLocalChatUsed())
  const [showUpgrade, setShowUpgrade] = useState(false)
  const bottomRef = useRef(null)

  const tier = user?.tier ?? 'free'
  const isCoachRole = user?.is_coach === true
  const gptUnlimited = isCoachRole || tier === 'pro' || tier === 'coaching'
  const gptUsedExceeded = !gptUnlimited && chatUsed >= FREE_GPT_LIMIT

  const inputRef = useRef('')
  useEffect(() => { inputRef.current = input }, [input])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Persist mode on change
  useEffect(() => { localStorage.setItem(MODE_KEY, mode) }, [mode])

  const setModeWithGuard = useCallback((m) => {
    if (m === 'gpt' && gptUsedExceeded) {
      setShowUpgrade(true)
      return
    }
    setMode(m)
  }, [gptUsedExceeded])

  const handleSend = useCallback(async (e) => {
    e.preventDefault()
    const text = inputRef.current.trim()
    if (!text || loading) return

    // GPT mode + limit reached → upsell, don't send
    if (mode === 'gpt' && gptUsedExceeded) {
      setShowUpgrade(true)
      return
    }

    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const trimmedHistory = messages.slice(-20)
      const data = await sendChat({ message: text, history: trimmedHistory, mode, k })
      setMessages([...updated, { role: 'assistant', content: data.response }])
      // Track GPT usage locally for free / anonymous users
      if (mode === 'gpt' && !gptUnlimited) {
        const n = incrementLocalChatUsed()
        setChatUsed(n)
      }
    } catch (err) {
      if (err.message?.includes('chat_limit_reached')) {
        setChatUsed(FREE_GPT_LIMIT)
        localStorage.setItem('ct_chat_used', String(FREE_GPT_LIMIT))
        setMessages(updated) // rollback optimistic user message
        setShowUpgrade(true)
      } else {
        setMessages([
          ...updated,
          {
            role: 'assistant',
            content: "Sorry, I couldn't get a response right now. Please try again in a moment.",
            isError: true,
          },
        ])
      }
    } finally {
      setLoading(false)
    }
  }, [messages, loading, mode, k, gptUsedExceeded, gptUnlimited]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = useCallback((e) => setInput(e.target.value), [])

  const MAX_CHARS = 1000
  const charCount = input.length
  const overLimit = charCount > MAX_CHARS
  const hasInput = useMemo(() => input.trim().length > 0 && !overLimit, [input, overLimit])

  const sendDisabled = loading || !hasInput || (mode === 'gpt' && gptUsedExceeded)

  return (
    <div className="h-full flex flex-col">
      {/* Header bar — mode toggle + back-to-picker link */}
      <div className="border-b border-outline px-4 md:px-6 py-3 flex items-center gap-3 flex-wrap bg-panel2/40">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
          aria-label="Back to picker"
        >
          <ArrowLeft size={13} />
          Back
        </button>

        <div className="flex items-center gap-1 bg-panel rounded-lg p-1 border border-outline">
          {(['kb', 'gpt']).map((m) => {
            const meta = MODE_META[m]
            const Icon = meta.icon
            const active = mode === m
            const isLocked = m === 'gpt' && gptUsedExceeded
            return (
              <button
                key={m}
                onClick={() => setModeWithGuard(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  active ? `bg-panel2 ${meta.color} shadow` : 'text-muted hover:text-text'
                } ${isLocked && !active ? 'opacity-70' : ''}`}
              >
                {isLocked ? <Lock size={12} /> : <Icon size={13} />}
                {meta.label}
              </button>
            )
          })}
        </div>

        {/* Right side: counter (free) or "Unlimited" pill (Pro/Coaching) when on GPT */}
        {mode === 'gpt' && (
          <div className="ml-auto text-[11px] font-medium flex items-center gap-1.5">
            {gptUnlimited ? (
              <span className="text-accent3">Unlimited</span>
            ) : (
              <span className={chatUsed >= FREE_GPT_LIMIT - 1 ? 'text-accent2' : 'text-muted'}>
                {Math.min(chatUsed, FREE_GPT_LIMIT)} / {FREE_GPT_LIMIT} used
              </span>
            )}
          </div>
        )}
        {mode === 'kb' && (
          <div className="ml-auto text-[11px] font-medium text-accent">Free · unlimited</div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent2/20 border border-outline flex items-center justify-center shadow-glow">
              <Bot size={28} className="text-accent" />
            </div>
            <div>
              <p className="text-text font-semibold">CoreTriage Assistant</p>
              <p className="text-sm text-muted mt-1 max-w-sm">
                Ask about symptoms, return-to-climb, training load, or rehab basics. Educational only — not a diagnosis.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {[
                'What could cause finger pain after crimping?',
                'How do I return to climbing after elbow tendinopathy?',
                'What are the red flags for shoulder injury?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-panel border border-outline rounded-full px-3 py-1.5 text-muted hover:text-accent hover:border-accent/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageItem key={i} msg={msg} />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/30 to-accent2/20 border border-outline flex items-center justify-center shrink-0">
              <Bot size={14} className="text-accent" />
            </div>
            <div className="bg-panel border border-outline rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-accent" />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Warning banner */}
      <div className="px-4 md:px-6 pt-3 pb-0">
        <div className="flex items-center gap-2 bg-accent3/8 border border-accent3/20 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="text-accent3 shrink-0" />
          <p className="text-[11px] text-accent3/80">
            General guidance only — not medical advice. Emergencies: call <strong>911</strong>.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-outline p-4 bg-panel2/40 mt-3">
        {/* GPT-limit banner — only for free users approaching/at limit */}
        {mode === 'gpt' && !gptUnlimited && chatUsed >= FREE_GPT_LIMIT - 1 && (
          <div className="mb-3 flex items-center justify-between bg-panel border border-outline rounded-xl px-3 py-2.5 gap-3">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-accent shrink-0" />
              {gptUsedExceeded ? (
                <p className="text-xs text-muted">
                  You've used all {FREE_GPT_LIMIT} free AI answers. <span className="text-accent">Lookup is still free</span> — switch above.
                </p>
              ) : (
                <p className="text-xs text-muted">
                  {FREE_GPT_LIMIT - chatUsed} free AI answer{FREE_GPT_LIMIT - chatUsed !== 1 ? 's' : ''} remaining.
                </p>
              )}
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="text-xs btn-secondary shrink-0"
            >
              Upgrade
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={
              mode === 'gpt' && gptUsedExceeded
                ? 'Switch to Lookup or upgrade to keep using AI answers…'
                : 'Ask about symptoms, training load, return-to-climb, or rehab basics…'
            }
            className="input-base flex-1"
            disabled={loading || (mode === 'gpt' && gptUsedExceeded)}
            maxLength={MAX_CHARS + 50}
          />
          <button
            type="submit"
            disabled={sendDisabled}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Send
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-muted">
            Educational only · No diagnosis · If severe or worsening, seek professional evaluation
          </p>
          <span className={`text-[11px] shrink-0 ml-3 tabular-nums ${overLimit ? 'text-accent2 font-semibold' : 'text-muted/50'}`}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>
        {overLimit && (
          <p className="text-xs text-accent2 mt-1">Message too long — please shorten it before sending.</p>
        )}
      </div>

      <AnimatePresence>
        {showUpgrade && (
          <UpgradeModal onClose={() => setShowUpgrade(false)} trigger="chat_limit" />
        )}
      </AnimatePresence>
    </div>
  )
}
