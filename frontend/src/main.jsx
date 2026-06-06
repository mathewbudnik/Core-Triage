import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import * as Sentry from '@sentry/react'
import './styles/brand-tokens.css'
import './index.css'
import App from './App.jsx'
import CrashFallback from './components/CrashFallback.jsx'

// One-time service worker reset. iOS users sometimes get stuck with a stale
// PWA bundle because VitePWA's autoUpdate flow only activates the new worker
// once every tab is closed. This kill-switch sidesteps that by force-
// unregistering any existing SW + wiping the Cache Storage API the first time
// each device runs this code. After cleanup we reload so the freshly fetched
// bundle takes over; the localStorage flag prevents subsequent visits from
// repeating the cleanup, so VitePWA's normal autoUpdate handles things from
// then on. Bump the key (v1 → v2) to force another cleanup later.
// Bump v1 → v2: old service workers from before MediaPipe shipped were
// caching the precache manifest and returning 404 for the new
// /mediapipe-wasm/* and /models/* routes. Forcing one unregister+cache
// purge gets every existing client onto the new SW cleanly.
const SW_RESET_KEY = 'ct_sw_reset_v2'
if (typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && !localStorage.getItem(SW_RESET_KEY)) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) {
      // No worker installed — just mark the reset done so we don't recheck.
      localStorage.setItem(SW_RESET_KEY, '1')
      return
    }
    Promise.all(regs.map((r) => r.unregister()))
      .then(() => ('caches' in window ? caches.keys() : []))
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => {
        localStorage.setItem(SW_RESET_KEY, '1')
        window.location.reload()
      })
      .catch(() => {
        // Best-effort: still set the flag so we don't trap users in a loop.
        localStorage.setItem(SW_RESET_KEY, '1')
      })
  }).catch(() => {})
}

// iOS Safari ignores `user-scalable=no` in the viewport meta tag for
// accessibility reasons, so pinch-zoom still fires on iPhone/iPad. These
// listeners block the proprietary `gesture*` events Safari dispatches for
// multi-touch zoom; double-tap zoom is killed separately via the CSS
// `touch-action: manipulation` rule on html/body. Android relies on the
// viewport meta alone (Chrome/Firefox honor user-scalable=no).
;['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) => {
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false })
})

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
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
