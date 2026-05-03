import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { verifyEmail } from '../api'
import Logo from './Logo'

/**
 * Standalone landing page rendered when the user clicks the verification link
 * from their email. Reads the token from the URL, calls the API, and shows
 * success or failure. Pass `onDone` to return the user to the main app.
 */
export default function VerifyEmailPage({ onDone }) {
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      setStatus('error')
      setError('No verification token in the link.')
      return
    }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setError(err.message)
      })
  }, [])

  const handleContinue = () => {
    // Clear the verification URL so a refresh doesn't re-trigger this page
    window.history.replaceState({}, '', '/')
    onDone()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-panel2 border border-outline rounded-2xl shadow-xl p-8 text-center space-y-5">
        <div className="flex justify-center">
          <Logo />
        </div>

        {status === 'verifying' && (
          <>
            <div className="flex justify-center">
              <Loader2 size={32} className="text-accent animate-spin" />
            </div>
            <p className="text-sm text-muted">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
                <CheckCircle size={28} className="text-accent" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">Email verified</h1>
              <p className="text-sm text-muted mt-2">
                You're all set. Your account is now fully activated.
              </p>
            </div>
            <button onClick={handleContinue} className="btn-primary w-full">
              Continue to CoreTriage
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-accent2/15 border border-accent2/30 flex items-center justify-center">
                <XCircle size={28} className="text-accent2" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">Verification failed</h1>
              <p className="text-sm text-muted mt-2">
                {error || 'This link is invalid or has already been used.'}
              </p>
              <p className="text-xs text-muted/70 mt-2">
                Sign in to your account and request a new verification email.
              </p>
            </div>
            <button onClick={handleContinue} className="btn-secondary w-full">
              Back to CoreTriage
            </button>
          </>
        )}
      </div>
    </div>
  )
}
