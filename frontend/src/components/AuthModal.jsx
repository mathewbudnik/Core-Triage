import { useState, useCallback, useRef, memo } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { authLogin, authRegister } from '../api'
import Logo from './Logo'

function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Uncontrolled inputs — no state updates on each keystroke
  const emailRef    = useRef(null)
  const passwordRef = useRef(null)

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
      onAuth(data.token, data.user)
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
    if (emailRef.current)    emailRef.current.value    = ''
    if (passwordRef.current) passwordRef.current.value = ''
  }, [])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.08 }}
        className="relative w-full max-w-sm mx-4 max-h-[calc(100dvh-2rem)] overflow-y-auto bg-panel2 border border-outline rounded-2xl shadow-xl p-6 space-y-5"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <Logo size={28} dark />
          <span className="font-bold text-text">CoreTriage</span>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-outline -mx-6 px-6">
          {[
            { id: 'login', label: 'Log In' },
            { id: 'register', label: 'Create Account' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                mode === m.id
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
