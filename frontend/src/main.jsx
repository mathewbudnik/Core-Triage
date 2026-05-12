import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import CrashFallback from './components/CrashFallback.jsx'

// ── Sentry init ─────────────────────────────────────────────────────────────
// Catches uncaught render errors AND async/event-handler errors AND unhandled
// promise rejections. The feedback widget below is what users tap to file a
// bug report (triggered programmatically from the sidebar — see App.jsx).
//
// PII is intentionally OFF: this is a health-adjacent app and we'd rather
// surface bugs without auto-attaching IPs. Flip sendDefaultPii to true if
// you decide you want that signal.
const dsn = import.meta.env.VITE_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    release: import.meta.env.VITE_APP_VERSION || 'dev',
    sendDefaultPii: false,
    // Performance sampling — 10% of transactions. Well under free-tier limits.
    tracesSampleRate: 0.1,
    integrations: [
      // User-feedback widget. autoInject:false means no floating button —
      // we render our own trigger in the sidebar via Sentry.getFeedback().
      Sentry.feedbackIntegration({
        colorScheme: 'dark',
        autoInject: false,
        showBranding: false,
        formTitle: 'Report a bug',
        submitButtonLabel: 'Send report',
        messagePlaceholder: "What were you trying to do, and what went wrong?",
        successMessageText: 'Thanks — we got it. We may follow up at the email you provided.',
      }),
    ],
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError, eventId }) => (
        <CrashFallback error={error} resetError={resetError} eventId={eventId} />
      )}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
