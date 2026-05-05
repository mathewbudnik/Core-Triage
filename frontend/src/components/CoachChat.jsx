import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, LogIn } from 'lucide-react'
import { getCoachThread, sendCoachMessage } from '../api'

const COACH_EMAIL = 'mathewbudnik@gmail.com'

function Message({ msg }) {
  const isCoach = msg.sender_type === 'coach'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-3 ${isCoach ? 'justify-start' : 'justify-end'}`}
    >
      {isCoach && (
        <img
          src="/logo.png"
          alt="Coach"
          className="w-7 h-7 rounded-lg shrink-0 mt-1"
        />
      )}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isCoach
          ? 'bg-panel border border-outline text-muted rounded-tl-sm'
          : 'bg-gradient-to-br from-accent2/25 to-accent3/15 border border-accent2/25 text-text rounded-tr-sm'
      }`}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className="text-[10px] text-muted/50 mt-1.5">
          {new Date(msg.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

export default function CoachChat({ user, onLoginClick }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef('')
  useEffect(() => { inputRef.current = input }, [input])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getCoachThread()
      setMessages(data.messages || [])
    } catch {
      // no thread yet — empty state is fine
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Poll for coach replies every 15s
  useEffect(() => {
    if (!user) return
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const text = inputRef.current.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      await sendCoachMessage(text)
      setInput('')
      await load()
    } catch (err) {
      setError(err.message || 'Could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16 space-y-5">
        <img src="/logo.png" alt="Coach" className="w-16 h-16 rounded-2xl" />
        <div>
          <p className="font-semibold text-text">Chat with your coach</p>
          <p className="text-sm text-muted mt-1 max-w-xs">
            Sign in to send a message directly to Mathew for a personalised training plan or coaching advice.
          </p>
        </div>
        <button onClick={onLoginClick} className="btn-primary flex items-center gap-2">
          <LogIn size={15} />
          Log in or create account
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Thread header */}
      <div className="border-b border-outline px-6 py-3 flex items-center gap-3 bg-panel2/40">
        <img src="/logo.png" alt="Coach" className="w-8 h-8 rounded-xl" />
        <div>
          <p className="text-sm font-semibold text-text">Mathew · Coach</p>
          <p className="text-xs text-muted">Replies within 24–48 hours</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="text-accent animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-16">
            <img src="/logo.png" alt="Coach" className="w-14 h-14 rounded-2xl opacity-80" />
            <div>
              <p className="font-semibold text-text">Start a conversation</p>
              <p className="text-sm text-muted mt-1 max-w-sm">
                Tell Mathew about your climbing background, goals, and what you're working on.
                He'll write you a hyper-specific plan tailored to you.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {[
                "I'm a V6 boulderer trying to break into V8 — can you build me a plan?",
                "I've been dealing with a finger injury and want to get back to projecting.",
                "I climb 3x/week and want to improve my endurance for long sport routes.",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-panel border border-outline rounded-xl px-4 py-2.5 text-muted hover:text-accent hover:border-accent/40 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-xs text-accent2 text-center pb-2">{error}</p>
      )}

      {/* Input */}
      <div className="border-t border-outline p-4 bg-panel2/40">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your coach…"
            className="input-base flex-1"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary flex items-center gap-2 shrink-0 disabled:opacity-40"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Send
          </button>
        </form>
        <p className="text-xs text-muted mt-2 text-center">
          Direct messages to Mathew · Not an AI
        </p>
      </div>
    </div>
  )
}
