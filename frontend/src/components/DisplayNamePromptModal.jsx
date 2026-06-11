import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Loader2 } from 'lucide-react'
import { setDisplayName } from '../api'
import { TRANSITIONS } from '../lib/motion'

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
    // Top-anchored on mobile (`items-start`) so the soft keyboard doesn't
    // push a centered modal off-screen. Same pattern as AuthModal.
    <div
      className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center bg-bg/85 backdrop-blur-sm overflow-y-auto
                 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] px-3 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={TRANSITIONS.dialog_in}
        className="relative w-full max-w-sm my-auto bg-ct-forest-deep border border-ct-hairline rounded-2xl shadow-xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-ct-terracotta/10 border border-ct-terracotta/25">
            <Trophy size={22} className="text-ct-terracotta" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ct-cream">Pick a display name</h2>
            <p className="text-xs text-ink-soft mt-1 leading-relaxed max-w-[260px] mx-auto">
              Your training shows up on leaderboards alongside other climbers. This is the name they'll see — pick something you're happy with. You can change it later.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-ct-moss uppercase tracking-wider block mb-1.5">
              Display name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder="e.g. SnowyCrimper42"
              className="w-full bg-ct-forest-deep border border-ct-hairline text-ct-cream placeholder:text-ink-muted focus:border-ct-terracotta/50 rounded-lg px-3 py-2 text-base sm:text-sm outline-none transition-colors"
              disabled={submitting}
              maxLength={24}
            />
            <p className="text-[10px] text-ink-muted mt-1.5">
              3–20 characters · letters, digits, underscore, dash
            </p>
          </div>

          {(localError || error) && (
            <p className="text-xs text-red-400">{localError || error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !!localError || !name}
            className="w-full flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold bg-ct-terracotta text-ct-cream hover:brightness-110 active:brightness-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
