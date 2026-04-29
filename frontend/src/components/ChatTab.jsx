import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Cpu, Sparkles, UserCircle2, Inbox, AlertTriangle, Lock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendChat } from '../api'
import CoachChat from './CoachChat'
import CoachInbox from './CoachInbox'
import UpgradeModal from './UpgradeModal'

const FREE_CHAT_LIMIT = 5

function getLocalChatUsed() {
  return parseInt(localStorage.getItem('ct_chat_used') || '0', 10)
}
function incrementLocalChatUsed() {
  const n = getLocalChatUsed() + 1
  localStorage.setItem('ct_chat_used', String(n))
  return n
}

const COACH_EMAIL = 'mathewbudnik@gmail.com'

const MODE_META = {
  kb:  { label: 'KB-only',      icon: Cpu,      color: 'text-accent',  desc: 'Local knowledge base, no LLM' },
  gpt: { label: 'GPT (OpenAI)', icon: Sparkles, color: 'text-accent3', desc: 'Powered by GPT-4o' },
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

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatTab({ k, user, onLoginClick }) {
  const [chatMode, setChatMode]  = useState('kb') // 'kb' | 'gpt' | 'coach' | 'inbox'
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [mode, setMode]         = useState('kb')
  const [loading, setLoading]   = useState(false)
  const [chatUsed, setChatUsed] = useState(() => getLocalChatUsed())
  const [showUpgrade, setShowUpgrade] = useState(false)
  const bottomRef = useRef(null)

  const isFreeTier = !user || user?.tier === 'free'
  const chatLimitReached = isFreeTier && chatUsed >= FREE_CHAT_LIMIT

  const inputRef = useRef('')
  useEffect(() => { inputRef.current = input }, [input])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // `input` intentionally excluded from deps — read via inputRef.
  // handleSend only recreates when messages/mode/model/k change, not on each keystroke.
  const handleSend = useCallback(async (e) => {
    e.preventDefault()
    const text = inputRef.current.trim()
    if (!text || loading) return

    // Client-side gate for unauth users (server enforces for logged-in free users)
    if (chatLimitReached) {
      setShowUpgrade(true)
      return
    }

    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const data = await sendChat({ message: text, history: messages, mode, k })
      setMessages([...updated, { role: 'assistant', content: data.response }])
      // Track usage locally for display
      if (isFreeTier) {
        const n = incrementLocalChatUsed()
        setChatUsed(n)
      }
    } catch (err) {
      if (err.message?.includes('chat_limit_reached')) {
        setChatUsed(FREE_CHAT_LIMIT)
        localStorage.setItem('ct_chat_used', String(FREE_CHAT_LIMIT))
        setMessages(updated) // rollback optimistic user message
        setShowUpgrade(true)
      } else {
        setMessages([...updated, { role: 'assistant', content: `Error: ${err.message}` }])
      }
    } finally {
      setLoading(false)
    }
  }, [messages, loading, mode, k, chatLimitReached, isFreeTier]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = useCallback((e) => setInput(e.target.value), [])

  const availableModes = ['kb', 'gpt']

  const MAX_CHARS = 1000
  const charCount = input.length
  const overLimit = charCount > MAX_CHARS

  // Derived boolean so trim() isn't called in the render path on every keystroke
  const hasInput = useMemo(() => input.trim().length > 0 && !overLimit, [input, overLimit])

  const ActiveModeIcon = MODE_META[mode].icon

  // Show coach/inbox views
  if (chatMode === 'coach') {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-outline px-6 py-3 flex items-center gap-2 bg-panel2/40">
          <div className="flex items-center gap-1 bg-panel rounded-lg p-1 border border-outline">
            <button onClick={() => setChatMode('kb')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-text transition-colors">
              <Bot size={13} /> KB / AI
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-panel2 text-accent2 shadow">
              <UserCircle2 size={13} /> Coach
            </button>
            {user?.email === COACH_EMAIL && (
              <button onClick={() => setChatMode('inbox')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-text transition-colors">
                <Inbox size={13} /> Inbox
              </button>
            )}
          </div>
        </div>
        <CoachChat user={user} onLoginClick={onLoginClick} />
      </div>
    )
  }

  if (chatMode === 'inbox' && user?.email === COACH_EMAIL) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-outline px-6 py-3 flex items-center gap-2 bg-panel2/40">
          <div className="flex items-center gap-1 bg-panel rounded-lg p-1 border border-outline">
            <button onClick={() => setChatMode('kb')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-text transition-colors">
              <Bot size={13} /> KB / AI
            </button>
            <button onClick={() => setChatMode('coach')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-text transition-colors">
              <UserCircle2 size={13} /> Coach
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-panel2 text-accent shadow">
              <Inbox size={13} /> Inbox
            </button>
          </div>
        </div>
        <CoachInbox />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="border-b border-outline px-6 py-3 flex items-center gap-4 flex-wrap bg-panel2/40">
        <div className="flex items-center gap-1 bg-panel rounded-lg p-1 border border-outline">
          {availableModes.map((m) => {
            const { label, icon: Icon, color } = MODE_META[m]
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  active ? `bg-panel2 ${color} shadow` : 'text-muted hover:text-text'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            )
          })}
          <button
            onClick={() => setChatMode('coach')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-accent2 transition-colors"
          >
            <UserCircle2 size={13} />
            Coach
          </button>
          {user?.email === COACH_EMAIL && (
            <button
              onClick={() => setChatMode('inbox')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-accent transition-colors"
            >
              <Inbox size={13} />
              Inbox
            </button>
          )}
        </div>

        <div className={`ml-auto text-xs font-medium flex items-center gap-1.5 ${MODE_META[mode].color}`}>
          <ActiveModeIcon size={12} />
          {MODE_META[mode].desc}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
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
      <div className="px-6 pt-3 pb-0">
        <div className="flex items-center gap-2 bg-accent3/8 border border-accent3/20 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="text-accent3 shrink-0" />
          <p className="text-[11px] text-accent3/80">
            General guidance only — not medical advice. Emergencies: call <strong>911</strong>.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-outline p-4 bg-panel2/40 mt-3">
        {/* Free tier limit banner */}
        {isFreeTier && chatUsed >= FREE_CHAT_LIMIT - 1 && (
          <div className="mb-3 flex items-center justify-between bg-panel border border-outline rounded-xl px-3 py-2.5 gap-3">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-accent shrink-0" />
              {chatLimitReached ? (
                <p className="text-xs text-muted">You've used all {FREE_CHAT_LIMIT} free messages.</p>
              ) : (
                <p className="text-xs text-muted">{FREE_CHAT_LIMIT - chatUsed} free message{FREE_CHAT_LIMIT - chatUsed !== 1 ? 's' : ''} remaining.</p>
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
            placeholder={chatLimitReached ? 'Upgrade to continue chatting…' : 'Ask about symptoms, training load, return-to-climb, or rehab basics…'}
            className="input-base flex-1"
            disabled={loading || chatLimitReached}
            maxLength={MAX_CHARS + 50}
          />
          <button
            type="submit"
            disabled={loading || !hasInput || chatLimitReached}
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
          <UpgradeModal onClose={() => setShowUpgrade(false)} trigger="chat" />
        )}
      </AnimatePresence>
    </div>
  )
}
