import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getMe } from '../api'
import Logo from './Logo'

/**
 * Landing page for the post-Checkout redirect from Stripe.
 *
 * Stripe sends two outcomes:
 *   /billing/success?session_id=cs_test_...   — user completed payment
 *   /billing/cancel                            — user backed out
 *
 * Even on success, the actual subscription state is set by the webhook (which
 * may take a couple of seconds to fire). We poll /api/auth/me up to 5 times
 * to confirm the tier flipped to 'pro' before showing the success state.
 */
export default function BillingReturnPage({ outcome, onDone }) {
  // outcome: 'success' | 'cancel'
  const [status, setStatus] = useState(outcome === 'success' ? 'verifying' : 'cancelled')

  useEffect(() => {
    if (outcome !== 'success') return

    let cancelled = false
    let attempts = 0
    const maxAttempts = 5

    async function poll() {
      attempts += 1
      try {
        const me = await getMe()
        if (cancelled) return
        if (me.tier === 'pro' || me.tier === 'core') {
          setStatus('confirmed')
          return
        }
      } catch {
        // fall through to retry
      }
      if (attempts < maxAttempts) {
        setTimeout(poll, 1500)
      } else {
        setStatus('pending')
      }
    }
    poll()

    return () => { cancelled = true }
  }, [outcome])

  const handleContinue = () => {
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
            <p className="text-sm text-muted">Confirming your subscription…</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
                <CheckCircle size={28} className="text-accent" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">You're subscribed</h1>
              <p className="text-sm text-muted mt-2">
                Pro features are unlocked. Welcome to CoreTriage.
              </p>
            </div>
            <button onClick={handleContinue} className="btn-primary w-full">
              Continue
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-accent3/15 border border-accent3/30 flex items-center justify-center">
                <CheckCircle size={28} className="text-accent3" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">Payment received</h1>
              <p className="text-sm text-muted mt-2">
                Your subscription is being activated. This usually takes a few seconds — refresh the app shortly if it hasn't unlocked yet.
              </p>
            </div>
            <button onClick={handleContinue} className="btn-primary w-full">
              Continue
            </button>
          </>
        )}

        {status === 'cancelled' && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-panel border border-outline flex items-center justify-center">
                <XCircle size={28} className="text-muted" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">Checkout cancelled</h1>
              <p className="text-sm text-muted mt-2">
                No charge was made. You can subscribe any time from the sidebar.
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
