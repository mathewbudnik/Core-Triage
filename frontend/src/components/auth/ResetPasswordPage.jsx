import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import AuthShell from './AuthShell'
import { resetPassword } from '../../api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Token-missing branch -----------------------------------------------------
  if (!token) {
    return (
      <AuthShell
        eyebrow="RESET PASSWORD"
        title="Invalid reset link"
        subtitle="This link is missing a token. Request a new one."
        helper={
          <Link to="/forgot-password" className="text-ct-terracotta font-semibold border-b border-transparent hover:border-ct-terracotta">
            Request a new link
          </Link>
        }
      >
        <div />
      </AuthShell>
    )
  }

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await resetPassword(token, password)
      navigate('/login?reset=success', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      eyebrow="RESET PASSWORD"
      title={
        <>
          Set a new{' '}
          <span
            style={{
              backgroundImage: 'linear-gradient(90deg, #d97757, #f0a875)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            password
          </span>
        </>
      }
      subtitle="At least 8 characters, with a number and a symbol."
      helper={
        <span>
          Back to <Link to="/" className="text-ct-terracotta font-semibold border-b border-transparent hover:border-ct-terracotta">sign in</Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="rp-pw" className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ct-moss mb-2">
            New password
          </label>
          <input
            id="rp-pw"
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-black/30 border border-ct-hairline rounded-xl px-3.5 py-3 text-sm text-ct-cream placeholder:text-ct-cream/30 focus:border-ct-terracotta/50 focus:bg-black/40 focus:outline-none focus:ring-[3px] focus:ring-ct-terracotta/10 transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-ct-cream font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            backgroundImage: 'linear-gradient(135deg, #d97757, #f0a875)',
            boxShadow: '0 8px 24px -8px rgba(217,119,87,0.5)',
          }}
        >
          {busy ? 'Updating…' : (
            <>
              Set new password
              <ArrowRight size={14} strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}
