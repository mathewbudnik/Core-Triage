import { useState } from 'react'
import { Mail, X, Loader2 } from 'lucide-react'
import { resendVerification } from '../api'

/**
 * Banner shown above the main app when a signed-in user hasn't verified their
 * email yet. Lets them resend the verification email and dismiss until reload.
 */
export default function EmailVerificationBanner({ user, onDismiss }) {
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState(null)

  const handleResend = async () => {
    setState('sending')
    setError(null)
    try {
      await resendVerification()
      setState('sent')
    } catch (err) {
      setState('error')
      setError(err.message)
    }
  }

  return (
    <div className="bg-accent3/10 border-b border-accent3/30 px-4 md:px-8 py-2.5 flex items-center justify-center gap-3 text-xs flex-wrap">
      <div className="flex items-center gap-2 text-accent3">
        <Mail size={14} className="shrink-0" />
        <span className="font-medium">
          Verify your email
        </span>
      </div>
      <span className="text-muted hidden sm:inline">
        We sent a verification link to <strong className="text-text">{user.email}</strong>.
      </span>

      {state === 'sent' ? (
        <span className="text-accent font-medium">✓ Email sent — check your inbox</span>
      ) : state === 'sending' ? (
        <span className="text-muted flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" /> Sending…
        </span>
      ) : (
        <button
          onClick={handleResend}
          className="text-accent3 font-semibold hover:text-accent3/80 transition-colors underline-offset-2 hover:underline"
        >
          Resend
        </button>
      )}

      {state === 'error' && (
        <span className="text-accent2 text-[11px]">{error}</span>
      )}

      <button
        onClick={onDismiss}
        className="ml-auto text-muted hover:text-text transition-colors"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}
