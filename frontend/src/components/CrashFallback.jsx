import { AlertOctagon, RefreshCw, MessageSquare } from 'lucide-react'
import * as Sentry from '@sentry/react'

/**
 * Rendered by Sentry.ErrorBoundary when a React render-time error escapes.
 * Sentry has already captured the exception by the time we get here — eventId
 * lets us tie the user's optional bug-report description to the same event.
 */
export default function CrashFallback({ error, resetError, eventId }) {
  const errorMessage = error?.message || String(error || 'Unknown error')

  const handleReport = () => {
    if (eventId) {
      Sentry.showReportDialog({ eventId })
    } else {
      // No eventId means Sentry isn't initialised (no DSN). Fall back to
      // mailto so the user still has a way to tell us what broke.
      window.location.href = `mailto:mathewbudnik@gmail.com?subject=${encodeURIComponent('CoreTriage crash')}&body=${encodeURIComponent(errorMessage)}`
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent2/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-md w-full bg-panel2 border border-outline rounded-2xl p-8 space-y-5 shadow-xl">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-accent2/10 border border-accent2/25 flex items-center justify-center">
            <AlertOctagon size={26} className="text-accent2" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">Something broke</h1>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">
              CoreTriage hit an unexpected error and couldn't recover. Reloading
              usually clears it. If it keeps happening, send us a quick note.
            </p>
          </div>
        </div>

        <details className="bg-panel border border-outline rounded-lg px-3 py-2 text-left">
          <summary className="text-[11px] text-muted/70 cursor-pointer select-none">
            Technical detail
          </summary>
          <p className="text-[11px] text-muted/60 mt-2 break-all font-mono leading-relaxed">
            {errorMessage}
          </p>
        </details>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={resetError}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <button
            onClick={handleReport}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            <MessageSquare size={14} />
            Report this crash
          </button>
        </div>
      </div>
    </div>
  )
}
