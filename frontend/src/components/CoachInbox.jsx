import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Inbox, ChevronLeft } from 'lucide-react'
import { adminGetThreads, adminGetMessages, adminReply } from '../api'

function ThreadRow({ thread, selected, onClick }) {
  const hasUnread = thread.unread_count > 0
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-ct-hairline transition-colors duration-150 ${
        selected ? 'bg-clay/12 border-l-2 border-l-clay' : 'hover:bg-card'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
          {thread.email}
        </p>
        {hasUnread > 0 && (
          <span className="shrink-0 text-[10px] font-bold bg-clay text-cream rounded-full w-4 h-4 flex items-center justify-center">
            {thread.unread_count}
          </span>
        )}
      </div>
      {thread.last_msg && (
        <p className="text-xs text-ink-soft truncate mt-0.5">
          {thread.last_sender === 'coach' ? 'You: ' : ''}{thread.last_msg}
        </p>
      )}
      <p className="text-[10px] text-ink-muted mt-0.5">
        {new Date(thread.updated_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
    </button>
  )
}

function Message({ msg }) {
  const isCoach = msg.sender_type === 'coach'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isCoach ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_2px_8px_rgba(42,39,34,0.08)] ${
        isCoach
          ? 'bg-clay/15 border border-clay/25 text-ink rounded-tr-sm'
          : 'ct-surface text-ink-soft rounded-tl-sm'
      }`}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <p className="text-[10px] text-ink-muted mt-1.5">
          {new Date(msg.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

export default function CoachInbox() {
  const [threads, setThreads] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef('')
  useEffect(() => { inputRef.current = input }, [input])

  const loadThreads = useCallback(async () => {
    try {
      const data = await adminGetThreads()
      setThreads(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Could not load inbox.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadThreads() }, [loadThreads])

  // Poll for new messages every 15s
  useEffect(() => {
    const id = setInterval(loadThreads, 15000)
    return () => clearInterval(id)
  }, [loadThreads])

  async function selectThread(thread) {
    setSelectedThread(thread)
    setMobileShowThread(true)
    try {
      const msgs = await adminGetMessages(thread.id)
      setMessages(msgs)
      setError(null)
    } catch (err) {
      setMessages([])
      setError(err.message || 'Could not load this conversation.')
    }
    // Refresh threads to clear unread badge
    loadThreads()
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleReply(e) {
    e.preventDefault()
    const text = inputRef.current.trim()
    if (!text || !selectedThread || sending) return
    setSending(true)
    try {
      await adminReply(selectedThread.id, text)
      setInput('')
      const msgs = await adminGetMessages(selectedThread.id)
      setMessages(msgs)
      setError(null)
      loadThreads()
    } catch (err) {
      setError(err.message || 'Could not send reply. Your message is still in the input — try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-full flex">
      {/* Thread list — sidebar */}
      <div className={`
        w-full md:w-72 shrink-0 border-r border-ct-hairline flex flex-col bg-side
        ${mobileShowThread ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="px-4 py-3 border-b border-ct-hairline flex items-center gap-2 bg-[linear-gradient(180deg,rgba(253,246,234,0.85),rgba(244,236,219,0.4))]">
          <Inbox size={15} className="text-clay-deep" />
          <p className="text-sm font-semibold text-ink">Inbox</p>
          {threads.some(t => t.unread_count > 0) && (
            <span className="ml-auto text-[10px] font-bold bg-clay text-cream rounded-full px-1.5 py-0.5">
              {threads.reduce((s, t) => s + t.unread_count, 0)} new
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-clay" />
            </div>
          )}
          {!loading && threads.length === 0 && (
            <p className="text-sm text-ink-soft text-center py-12 px-4">No messages yet.</p>
          )}
          {threads.map(t => (
            <ThreadRow
              key={t.id}
              thread={t}
              selected={selectedThread?.id === t.id}
              onClick={() => selectThread(t)}
            />
          ))}
        </div>
      </div>

      {/* Thread view */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${!mobileShowThread ? 'hidden md:flex' : 'flex'}
      `}>
        {!selectedThread ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 space-y-3 text-ink-soft">
            <Inbox size={32} className="text-ink-muted" />
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="border-b border-ct-hairline px-4 py-3 flex items-center gap-3 bg-[linear-gradient(180deg,rgba(253,246,234,0.85),rgba(244,236,219,0.4))]">
              <button
                onClick={() => setMobileShowThread(false)}
                className="md:hidden text-ink-soft hover:text-ink transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <p className="text-sm font-semibold text-ink">{selectedThread.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <Message key={msg.id} msg={msg} />
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div className="border-t border-ct-hairline p-4 bg-[linear-gradient(0deg,rgba(253,246,234,0.85),rgba(244,236,219,0.4))]">
              {error && (
                <p className="text-xs text-clay-deep mb-2 text-center">{error}</p>
              )}
              <form onSubmit={handleReply} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Reply to ${selectedThread.email}…`}
                  className="flex-1 bg-card border border-ct-rim rounded-lg px-3 py-2 text-ink text-base sm:text-sm placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-clay focus:border-clay transition-colors duration-200"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="flex items-center gap-2 shrink-0 px-5 py-2.5 rounded-lg font-semibold text-sm bg-clay text-cream hover:brightness-105 active:brightness-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
