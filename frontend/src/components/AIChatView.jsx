import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, AlertTriangle, Lock, ArrowLeft, Sparkle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendChat, getChatContext } from '../api'
import UpgradeModal from './UpgradeModal'
import Surface from './ui/Surface'

// Format the structured context dict from /api/chat/context into a single
// short summary line for the transparency chip. Returns '' when the user
// has no usable data yet (brand-new account).
function summarizeContext(ctx) {
  if (!ctx) return ''
  const parts = []
  const hardest = ctx.recent_hardest || ctx.alltime_hardest || {}
  if (hardest.boulder) parts.push(`${hardest.boulder} climber`)
  else if (hardest.route) parts.push(`${hardest.route} climber`)
  if (ctx.active_rehab) {
    const { injury_area, days_since } = ctx.active_rehab
    const when = days_since === 0 ? 'today' : `day ${days_since + 1}`
    parts.push(`${injury_area.toLowerCase()} rehab · ${when}`)
  }
  if (ctx.streak_days && !ctx.active_rehab) {
    parts.push(`${ctx.streak_days}-day streak`)
  }
  return parts.join(' · ')
}

const FREE_CHAT_LIMIT = 5

function getLocalChatUsed() {
  return parseInt(localStorage.getItem('ct_chat_used') || '0', 10)
}
function incrementLocalChatUsed() {
  const n = getLocalChatUsed() + 1
  localStorage.setItem('ct_chat_used', String(n))
  return n
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
        <div className="w-7 h-7 rounded-lg bg-ct-terra-tint border border-ct-terracotta/30 flex items-center justify-center shrink-0 mt-1">
          <Bot size={14} className="text-ct-terra-soft" />
        </div>
      )}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        msg.role === 'user'
          ? 'bg-ct-terra-tint border border-ct-terracotta/20 text-ct-cream rounded-tr-sm'
          : 'ct-surface-flat text-ct-cream/60 rounded-tl-sm'
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
        <div className="w-7 h-7 rounded-lg bg-ct-terra-tint border border-ct-terracotta/20 flex items-center justify-center shrink-0 mt-1">
          <User size={14} className="text-ct-terra-soft" />
        </div>
      )}
    </motion.div>
  )
})

// ── Main view ─────────────────────────────────────────────────────────────────

export default function AIChatView({ k, user, onBack }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatUsed, setChatUsed] = useState(() => getLocalChatUsed())
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [userCtx, setUserCtx] = useState(null)
  const bottomRef = useRef(null)

  // Fetch the user's chat context on mount (and whenever the auth user
  // changes) so the transparency chip can show what's being personalized.
  // Anonymous users get null — chip stays hidden.
  useEffect(() => {
    if (!user) { setUserCtx(null); return }
    let cancelled = false
    getChatContext()
      .then((r) => { if (!cancelled) setUserCtx(r?.context || null) })
      .catch(() => { if (!cancelled) setUserCtx(null) })
    return () => { cancelled = true }
  }, [user])

  const ctxSummary = useMemo(() => summarizeContext(userCtx), [userCtx])

  const tier = user?.tier ?? 'free'
  const isCoachRole = user?.is_coach === true
  const chatUnlimited = isCoachRole || tier === 'pro' || tier === 'coaching'
  const limitExceeded = !chatUnlimited && chatUsed >= FREE_CHAT_LIMIT

  const inputRef = useRef('')
  useEffect(() => { inputRef.current = input }, [input])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = useCallback(async (e) => {
    e.preventDefault()
    const text = inputRef.current.trim()
    if (!text || loading) return

    // Free limit reached → upsell, don't send
    if (limitExceeded) {
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
      const data = await sendChat({ message: text, history: trimmedHistory, k })
      setMessages([...updated, { role: 'assistant', content: data.response }])
      // Track usage locally for free / anonymous users
      if (!chatUnlimited) {
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
  }, [messages, loading, k, limitExceeded, chatUnlimited]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = useCallback((e) => setInput(e.target.value), [])

  const MAX_CHARS = 1000
  const charCount = input.length
  const overLimit = charCount > MAX_CHARS
  const hasInput = useMemo(() => input.trim().length > 0 && !overLimit, [input, overLimit])

  const sendDisabled = loading || !hasInput || limitExceeded

  return (
    <div className="h-full flex flex-col">
      {/* Header bar — back link + free-tier counter */}
      <div className="border-b border-ct-hairline px-4 md:px-6 py-3 flex items-center gap-3 flex-wrap bg-ct-forest-deep/40">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-ct-cream/60 hover:text-ct-cream transition-colors"
          aria-label="Back to picker"
        >
          <ArrowLeft size={13} />
          Back
        </button>

        {/* Right side: counter (free) or "Unlimited" pill (Pro/Coaching) */}
        <div className="ml-auto text-[11px] font-medium flex items-center gap-1.5">
          {chatUnlimited ? (
            <span className="text-ct-terra-soft">Unlimited</span>
          ) : (
            <span className={chatUsed >= FREE_CHAT_LIMIT - 1 ? 'text-ct-terracotta' : 'text-ct-cream/60'}>
              {Math.min(chatUsed, FREE_CHAT_LIMIT)} / {FREE_CHAT_LIMIT} used
            </span>
          )}
        </div>
      </div>

      {/* Transparency chip — surfaces the personalization context the
          assistant is using. Hidden for anonymous users and accounts
          with no usable data yet. */}
      {ctxSummary && (
        <div className="px-4 md:px-6 pt-3">
          <div
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold
                       bg-ct-terra-tint border border-ct-terracotta/20
                       rounded-full px-2.5 py-1 text-ct-terra-soft"
            title="The assistant is personalizing answers using this context."
          >
            <Sparkle size={10} strokeWidth={2.4} />
            Answering as your {ctxSummary}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-ct-terra-tint border border-ct-terracotta/30 flex items-center justify-center">
              <Bot size={28} className="text-ct-terra-soft" />
            </div>
            <div>
              <p className="text-ct-cream font-semibold">CoreTriage Assistant</p>
              <p className="text-sm text-ct-cream/60 mt-1 max-w-sm">
                Ask about technique, training, movement, strategy, or injury. Educational only — not a diagnosis.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {[
                'Why does my foot keep cutting on overhangs?',
                'How do I get better at slopers?',
                'What does an A2 pulley injury feel like?',
                'How should I structure a hangboard session?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs ct-surface-flat border border-ct-hairline rounded-full px-3 py-1.5 text-ct-cream/60 hover:text-ct-terra-soft hover:border-ct-terracotta/40 transition-colors"
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
            <div className="w-7 h-7 rounded-lg bg-ct-terra-tint border border-ct-terracotta/30 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-ct-terra-soft" />
            </div>
            <div className="ct-surface-flat border border-ct-hairline rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-ct-terracotta" />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Warning banner */}
      <div className="px-4 md:px-6 pt-3 pb-0">
        <div className="flex items-center gap-2 bg-ct-terra-tint border border-ct-terracotta/20 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="text-ct-terra-soft shrink-0" />
          <p className="text-[11px] text-ct-cream/60">
            General guidance only — not medical advice. Emergencies: call <strong>911</strong>.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-ct-hairline p-4 bg-ct-forest-deep/40 mt-3">
        {/* Free-limit banner — only when approaching/at limit */}
        {!chatUnlimited && chatUsed >= FREE_CHAT_LIMIT - 1 && (
          <div className="mb-3 flex items-center justify-between ct-surface border border-ct-hairline rounded-xl px-3 py-2.5 gap-3">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-ct-terra-soft shrink-0" />
              {limitExceeded ? (
                <p className="text-xs text-ct-cream/60">
                  Your free chat answers are used up. Subscribe to keep going.
                </p>
              ) : (
                <p className="text-xs text-ct-cream/60">
                  {FREE_CHAT_LIMIT - chatUsed} free answer{FREE_CHAT_LIMIT - chatUsed !== 1 ? 's' : ''} remaining.
                </p>
              )}
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="text-xs btn-secondary shrink-0"
            >
              Subscribe
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={
              limitExceeded
                ? 'Upgrade to keep asking questions…'
                : 'Ask about technique, training, movement, or injury…'
            }
            className="flex-1 bg-ct-forest-deep border border-ct-hairline rounded-lg px-3 py-2 text-ct-cream text-base sm:text-sm placeholder:text-ct-cream/40 focus:outline-none focus:ring-1 focus:ring-ct-terracotta focus:border-ct-terracotta transition-colors duration-200"
            disabled={loading || limitExceeded}
            maxLength={MAX_CHARS + 50}
          />
          <button
            type="submit"
            disabled={sendDisabled}
            className="flex items-center gap-2 shrink-0 px-5 py-2.5 rounded-lg font-semibold text-sm bg-ct-terracotta text-ct-cream hover:opacity-90 active:opacity-80 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Send
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-ct-cream/60">
            Educational only · No diagnosis · If severe or worsening, seek professional evaluation
          </p>
          <span className={`text-[11px] shrink-0 ml-3 tabular-nums ${overLimit ? 'text-ct-terracotta font-semibold' : 'text-ct-cream/30'}`}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>
        {overLimit && (
          <p className="text-xs text-ct-terracotta mt-1">Message too long — please shorten it before sending.</p>
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
