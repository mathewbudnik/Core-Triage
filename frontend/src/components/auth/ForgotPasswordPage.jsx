import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Info, AlertTriangle, ExternalLink, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import AuthShell from './AuthShell'
import { forgotPassword } from '../../api'

export default function ForgotPasswordPage() {
  const [params] = useSearchParams()
  const initialEmail = params.get('email') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [submittedTo, setSubmittedTo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const trimmed = email.trim()
      await forgotPassword(trimmed)
      setSubmittedTo(trimmed)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Success state ----------------------------------------------------------
  if (submittedTo) {
    const isGmail = /@gmail\.com$/i.test(submittedTo)
    return (
      <AuthShell
        eyebrow="ACCOUNT RECOVERY"
        title="Check your inbox"
        subtitle="If an account exists for that address, a reset link is on its way. It'll arrive within a minute and expires in 60."
        helper={
          <span>
            Back to <Link to="/" className="text-ct-terracotta font-semibold border-b border-transparent hover:border-ct-terracotta">sign in</Link>
          </span>
        }
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
          className="mx-auto mb-5 flex items-center justify-center w-16 h-16 rounded-2xl border border-accent/30 text-accent relative"
          style={{
            background: 'radial-gradient(circle, rgba(20,184,166,0.12), rgba(20,184,166,0.02))',
            boxShadow: '0 0 32px -8px rgba(20,184,166,0.4)',
          }}
        >
          <Mail size={28} strokeWidth={2.5} />
          <span
            aria-hidden
            className="absolute -inset-2 rounded-3xl border border-accent/15 animate-pulse-slow"
          />
        </motion.div>

        <div className="mx-auto mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/30 border border-ct-hairline text-sm font-semibold text-ct-cream w-fit">
          <Mail size={13} className="opacity-70" />
          <span>{submittedTo}</span>
        </div>

        {isGmail && (
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black/30 border border-ct-hairline text-ct-cream font-semibold text-sm hover:border-ct-terracotta/40 transition-colors"
          >
            Open Gmail
            <ExternalLink size={14} />
          </a>
        )}

        <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-black/25 border border-ct-hairline">
          <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent3/15 text-accent3 inline-flex items-center justify-center">
            <AlertTriangle size={13} />
          </span>
          <div className="text-xs text-ink-soft leading-relaxed">
            Didn't see it? Check your spam folder, or{' '}
            <button
              type="button"
              onClick={() => setSubmittedTo(null)}
              className="text-ct-terracotta font-semibold hover:underline"
            >
              try a different email
            </button>
            .
          </div>
        </div>
      </AuthShell>
    )
  }

  // Form state -------------------------------------------------------------
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title={
        <>
          Forgot your{' '}
          <span
            style={{
              backgroundImage: 'linear-gradient(90deg, #d97757, #f0a875)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            password
          </span>
          ?
        </>
      }
      subtitle="No worries. Enter the email tied to your account and we'll send a link to set a new one."
      helper={
        <span>
          Remembered it? <Link to="/" className="text-ct-terracotta font-semibold border-b border-transparent hover:border-ct-terracotta">Back to sign in</Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="fp-email" className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ct-moss mb-2">
            Email address
          </label>
          <input
            id="fp-email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-black/30 border border-ct-hairline rounded-xl px-3.5 py-3 text-sm text-ct-cream placeholder:text-ink-muted focus:border-ct-terracotta/50 focus:bg-black/40 focus:outline-none focus:ring-[3px] focus:ring-ct-terracotta/10 transition-colors"
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
          {busy ? 'Sending…' : (
            <>
              Send reset link
              <ArrowRight size={14} strokeWidth={2.5} />
            </>
          )}
        </button>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-black/25 border border-ct-hairline">
          <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/12 text-accent inline-flex items-center justify-center">
            <Info size={13} />
          </span>
          <div className="text-xs text-ink-soft leading-relaxed">
            Reset links expire in 60 minutes. They work once.
          </div>
        </div>
      </form>
    </AuthShell>
  )
}
