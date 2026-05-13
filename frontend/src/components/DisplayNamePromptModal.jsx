import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Loader2 } from 'lucide-react'
import { setDisplayName } from '../api'

const RULES_RE = /^[A-Za-z0-9_-]{3,20}$/

/**
 * Migration prompt for users without a display_name set yet (existing
 * accounts pre-leaderboard launch). Non-dismissible — they must pick.
 *
 * Props:
 *   - onDone(name): called with the saved display name once accepted by
 *     the server. Caller is responsible for refreshing user state.
 */
export default function DisplayNamePromptModal({ onDone }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Hint shown beneath the input as the user types — covers obvious cases
  // (empty, too short, bad chars). Final server-side validation may add
  // more (profanity, uniqueness).
  const localError = (() => {
    if (!name) return null
    if (name.length < 3) return 'Too short — at least 3 characters.'
    if (name.length > 20) return 'Too long — 20 characters max.'
    if (!RULES_RE.test(name)) return 'Letters, digits, underscore, dash only.'
    return null
  })()

  useEffect(() => {
    // Prevent body scroll while modal is open. Standard pattern.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    if (localError || !name) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await setDisplayName(name)
      onDone && onDone(res.display_name)
    } catch (err) {
      setError(err.message || 'Could not save that display name.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-bg/85 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="relative w-full max-w-sm bg-panel2 border border-outline rounded-2xl shadow-xl p-6 space-y-5"
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[rgba(247,187,81,0.15)] border border-[rgba(247,187,81,0.3)]">
            <Trophy size={22} className="text-accent3" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Pick a display name</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed max-w-[260px] mx-auto">
              Your training shows up on leaderboards alongside other climbers. This is the name they'll see — pick something you're happy with. You can change it later.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
              Display name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder="e.g. SnowyCrimper42"
              className="input-base w-full text-sm"
              disabled={submitting}
              maxLength={24}
            />
            <p className="text-[10px] text-muted/60 mt-1.5">
              3–20 characters · letters, digits, underscore, dash
            </p>
          </div>

          {(localError || error) && (
            <p className="text-xs text-accent2">{localError || error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !!localError || !name}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Saving…</>
            ) : (
              'Save & continue'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
