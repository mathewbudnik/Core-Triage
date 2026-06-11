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
    <div className="bg-ct-terra-tint border-y border-ct-terracotta/30 px-4 md:px-8 py-2.5 flex items-center justify-center gap-3 text-xs flex-wrap">
      <div className="flex items-center gap-2 text-ct-terracotta">
        <Mail size={14} className="shrink-0" />
        <span className="font-medium">
          Verify your email
        </span>
      </div>
      <span className="text-ink-soft hidden sm:inline">
        We sent a verification link to <strong className="text-ct-cream">{user.email}</strong>.
      </span>

      {state === 'sent' ? (
        <span className="text-accent font-medium">✓ Email sent — check your inbox</span>
      ) : state === 'sending' ? (
        <span className="text-ink-soft flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" /> Sending…
        </span>
      ) : (
        <button
          onClick={handleResend}
          className="bg-ct-terracotta text-ct-cream font-semibold hover:brightness-110 transition-colors px-3 py-1 rounded-md"
        >
          Resend
        </button>
      )}

      {state === 'error' && (
        <span className="text-accent2 text-[11px]">{error}</span>
      )}

      <button
        onClick={onDismiss}
        className="ml-auto text-ink-soft hover:text-ct-cream transition-colors"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}
