import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2, AlertTriangle, Activity } from 'lucide-react'
import { authLogin, authRegister } from '../api'

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const fn = mode === 'login' ? authLogin : authRegister
      const data = await fn({ email, password })
      localStorage.setItem('ct_token', data.token)
      onAuth(data.token, data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setError(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-sm mx-4 bg-panel2 border border-outline rounded-2xl shadow-xl p-6 space-y-5"
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
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-glow">
            <Activity size={14} className="text-bg" />
          </div>
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
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            className="btn-primary w-full flex items-center justify-center gap-2"
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
