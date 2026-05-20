import { useState, useCallback, useRef, memo } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { authLogin, authRegister, setDisplayName } from '../api'
import Logo from './Logo'

// Same validation rules as the server / DisplayNamePromptModal — kept in sync
// by convention.
const DISPLAY_NAME_RE = /^[A-Za-z0-9_-]{3,20}$/

function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Uncontrolled inputs — no state updates on each keystroke
  const emailRef       = useRef(null)
  const passwordRef    = useRef(null)
  const displayNameRef = useRef(null)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const fn = mode === 'login' ? authLogin : authRegister
      const data = await fn({
        email:    emailRef.current.value,
        password: passwordRef.current.value,
      })
      // Store in sessionStorage only — clears when tab closes
      sessionStorage.setItem('ct_token', data.token)
      localStorage.removeItem('ct_token')

      // For new registrations, if the user picked a display name in the
      // signup form, persist it now. Failures are non-fatal — the user just
      // gets the migration prompt on the Train tab instead.
      let userOut = data.user
      if (mode === 'register' && displayNameRef.current) {
        const name = (displayNameRef.current.value || '').trim()
        if (name) {
          try {
            const res = await setDisplayName(name)
            userOut = { ...userOut, display_name: res.display_name }
          } catch (_) {
            // Swallow — they'll see the migration modal on Train.
          }
        }
      }

      onAuth(data.token, userOut)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [mode, onAuth])

  const switchMode = useCallback((m) => {
    setMode(m)
    setError(null)
    // Clear fields when switching tabs
    if (emailRef.current)       emailRef.current.value       = ''
    if (passwordRef.current)    passwordRef.current.value    = ''
    if (displayNameRef.current) displayNameRef.current.value = ''
  }, [])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    // Anchor to top on mobile (`items-start`) so when the on-screen
    // keyboard appears it pushes content up off the bottom — not off the
    // top, which is what `items-center` does on iOS (layout viewport
    // doesn't shrink for the keyboard, so a centered modal partly hides
    // behind it). Desktop stays centered.
    // Safe-area padding handles iPhone notches / home indicators.
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-bg/80 backdrop-blur-sm overflow-y-auto
                 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] sm:pt-4 sm:pb-4"
      onClick={handleOverlayClick}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.12 }}
        className="relative w-full max-w-sm mx-3 sm:mx-4 my-auto bg-panel2 border border-outline rounded-2xl shadow-xl p-5 sm:p-6 space-y-4 sm:space-y-5"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-muted hover:text-text transition-colors p-1"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <Logo size={24} dark />
          <span className="font-bold text-text text-sm">CoreTriage</span>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-outline -mx-5 sm:-mx-6 px-5 sm:px-6">
          {[
            { id: 'login', label: 'Log In' },
            { id: 'register', label: 'Create Account' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
                mode === m.id
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              ref={emailRef}
              type="email"
              defaultValue=""
              className="input-base"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              ref={passwordRef}
              type="password"
              defaultValue=""
              className="input-base"
              placeholder="••••••••"
              required
              minLength={8}
            />
            {mode === 'register' && (
              <p className="text-xs text-muted mt-1">Minimum 8 characters, include at least one symbol</p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="label">Display name <span className="text-muted/60 font-normal">(optional)</span></label>
              <input
                ref={displayNameRef}
                type="text"
                defaultValue=""
                className="input-base"
                placeholder="e.g. SnowyCrimper42"
                maxLength={20}
                pattern={DISPLAY_NAME_RE.source}
                title="3-20 characters, letters, digits, underscore, dash."
              />
              <p className="text-xs text-muted mt-1">
                Shown on the climbing-hours leaderboard. You can pick or change it later.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-accent2 text-sm bg-accent2/10 border border-accent2/30 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2
                       h-11 px-5 rounded-lg text-sm font-semibold text-bg
                       bg-gradient-to-r from-accent2 to-accent3
                       shadow-[0_0_14px_rgba(251,113,133,0.22)]
                       hover:brightness-110 active:brightness-95
                       transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-center text-muted">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-accent hover:underline"
          >
            {mode === 'login' ? 'Create one' : 'Log in'}
          </button>
        </p>

        <p className="text-xs text-center text-muted/50">
          Your history is private and only visible to you.
        </p>
      </motion.div>
    </div>
  )
}

export default memo(AuthModal)
