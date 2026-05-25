import { AlertOctagon, RefreshCw, MessageSquare } from 'lucide-react'
import * as Sentry from '@sentry/react'
import Surface from './ui/Surface'

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
    <div className="min-h-screen bg-ct-forest-deep flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-ct-terracotta/8 rounded-full blur-3xl" />
      </div>

      <Surface tier="default" padding="xl" rounded="rounded-2xl" className="relative max-w-md w-full space-y-5 shadow-xl">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-ct-terracotta/10 border border-ct-terracotta/25 flex items-center justify-center">
            <AlertOctagon size={26} className="text-ct-terra-soft" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ct-cream">Something broke</h1>
            <p className="text-sm text-ct-cream/60 mt-1.5 leading-relaxed">
              CoreTriage hit an unexpected error and couldn't recover. Reloading
              usually clears it. If it keeps happening, send us a quick note.
            </p>
          </div>
        </div>

        <details className="bg-ct-forest border border-ct-hairline rounded-lg px-3 py-2 text-left">
          <summary className="text-[11px] text-ct-cream/50 cursor-pointer select-none">
            Technical detail
          </summary>
          <p className="text-[11px] text-ct-cream/40 mt-2 break-all font-mono leading-relaxed">
            {errorMessage}
          </p>
        </details>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={resetError}
            className="bg-ct-terracotta text-ct-cream flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg font-semibold hover:bg-ct-terracotta/90 transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
          <button
            onClick={handleReport}
            className="bg-ct-hairline text-ct-cream border border-ct-rim flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg font-semibold hover:bg-ct-rim transition-colors"
          >
            <MessageSquare size={14} />
            Report this crash
          </button>
        </div>
      </Surface>
    </div>
  )
}
