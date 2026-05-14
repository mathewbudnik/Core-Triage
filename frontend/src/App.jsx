import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { MessageSquare, Clock, Info, AlertTriangle, Menu, X, LogIn, Activity, Dumbbell, FileText, Stethoscope, UserCircle2, ChevronRight, Bug, Loader2, Trophy, Home } from 'lucide-react'
import * as Sentry from '@sentry/react'
import { getHealth, getMe, acceptDisclaimer } from './api'
import Landing from './components/Landing'
import Logo from './components/Logo'
import AuthModal from './components/AuthModal'
import TipCard from './components/TipCard'
import DisclaimerModal from './components/DisclaimerModal'
import LegalModal from './components/LegalModal'
import EmailVerificationBanner from './components/EmailVerificationBanner'
import AccountMenu from './components/AccountMenu'
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from './data/legal'
import { openBillingPortal } from './api'
import UpgradeModal from './components/UpgradeModal'

// Lazy-loaded routes — each tab + the standalone pages download only when
// the user navigates to them. First-paint bundle drops dramatically because
// users don't pay for tabs they may never visit.
const HubTab            = lazy(() => import('./components/HubTab'))
const TriageTab         = lazy(() => import('./components/TriageTab'))
const RehabTab          = lazy(() => import('./components/RehabTab'))
const TrainTab          = lazy(() => import('./components/TrainTab'))
const ProgressTab       = lazy(() => import('./components/ProgressTab'))
const ChatTab           = lazy(() => import('./components/ChatTab'))
const HistoryTab        = lazy(() => import('./components/HistoryTab'))
const AboutTab          = lazy(() => import('./components/AboutTab'))
const VerifyEmailPage   = lazy(() => import('./components/VerifyEmailPage'))
const BillingReturnPage = lazy(() => import('./components/BillingReturnPage'))

// Tiny full-screen loader used as the Suspense fallback while a route chunk
// is fetched. Sized to match the visual weight of a real tab so the layout
// doesn't pop.
function RouteLoading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 size={20} className="text-accent animate-spin" />
    </div>
  )
}

const TABS = [
  { id: 'hub',      label: 'Hub',      icon: Home,          subtitle: 'Your climbing health dashboard' },
  { id: 'triage',   label: 'Triage',   icon: Activity,      subtitle: 'Symptom-based guidance — educational only, always seek a pro for serious injuries' },
  { id: 'rehab',    label: 'Rehab',    icon: Stethoscope,   subtitle: 'Stage-based protocols built around climbing-specific demands' },
  { id: 'train',    label: 'Train',    icon: Dumbbell,      subtitle: 'Personalised training plans tuned to your goals and history' },
  { id: 'progress', label: 'Progress', icon: Trophy,        subtitle: 'Your training stats, streaks, and how you stack up' },
  { id: 'chat',     label: 'Chat',     icon: MessageSquare, subtitle: 'Ask the climbing-trained AI about training, rehab, or beta' },
  { id: 'history',  label: 'History',  icon: Clock,         subtitle: 'Your past triage and rehab sessions' },
  { id: 'about',    label: 'About',    icon: Info,          subtitle: 'What CoreTriage is, who built it, and how it works' },
]

const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const k = 4
  const [dbReady, setDbReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  // Disclaimer state
  const [disclaimerState, setDisclaimerState] = useState('checking') // 'checking' | 'required' | 'accepted'
  const [showTerms, setShowTerms] = useState(false) // read-only re-open
  const [legalDoc, setLegalDoc] = useState(null)    // PRIVACY_POLICY | TERMS_OF_SERVICE | null
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeTrigger, setUpgradeTrigger] = useState('coaching')
  const [toast, setToast] = useState(null) // { kind: 'error'|'info', message: string }

  // Derive "is on landing?" and "is on a special standalone page?" from URL
  // — landing has its own full-bleed layout; verify-email + billing/* are
  // standalone pages that bypass the sidebar/header chrome.
  const isLandingRoute  = location.pathname === '/'
  const isStandalonePage = location.pathname === '/verify-email'
                        || location.pathname === '/billing/success'
                        || location.pathname === '/billing/cancel'

  // Sidebar nav still uses these labels — derive activeTabLabel from the URL.
  const activeTabId = useMemo(() => {
    const seg = location.pathname.split('/')[1] || ''
    return TABS.find((t) => t.id === seg)?.id || null
  }, [location.pathname])
  const activeTab = useMemo(
    () => TABS.find((t) => t.id === activeTabId) || null,
    [activeTabId],
  )
  const activeTabLabel    = activeTab?.label    || ''
  const activeTabSubtitle = activeTab?.subtitle || ''

  // Session timeout
  const timeoutRef = useRef(null)

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('ct_token')
    localStorage.removeItem('ct_token')
    setUser(null)
  }, [])

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(clearSession, SESSION_TIMEOUT_MS)
  }, [clearSession])

  // Track activity to reset the inactivity timeout
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetTimeout, { passive: true }))
    resetTimeout()
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimeout))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [resetTimeout])

  // Server-side token expiry: api.js dispatches this when any request returns 401.
  useEffect(() => {
    const handler = () => {
      setUser(null)
      setToast({ kind: 'info', message: 'Your session expired. Please sign in again.' })
      setShowAuth(true)
    }
    window.addEventListener('ct:auth-expired', handler)
    return () => window.removeEventListener('ct:auth-expired', handler)
  }, [])

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    getHealth()
      .then((data) => setDbReady(data.db_ready))
      .catch(() => setDbReady(false))

    // Restore session — sessionStorage first (current tab), fall back to legacy localStorage
    const token = sessionStorage.getItem('ct_token') ?? localStorage.getItem('ct_token')
    if (token) {
      getMe()
        .then((u) => {
          setUser(u)
          // Migrate localStorage token to sessionStorage
          if (localStorage.getItem('ct_token')) {
            sessionStorage.setItem('ct_token', localStorage.getItem('ct_token'))
            localStorage.removeItem('ct_token')
          }
          // If DB says disclaimer not accepted, force modal even if localStorage flag set
          if (!u.disclaimer_accepted) {
            setDisclaimerState('required')
          } else {
            setDisclaimerState('accepted')
          }
        })
        .catch(() => {
          sessionStorage.removeItem('ct_token')
          localStorage.removeItem('ct_token')
          checkDisclaimerLocally()
        })
    } else {
      checkDisclaimerLocally()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function checkDisclaimerLocally() {
    const accepted = localStorage.getItem('ct_disclaimer_accepted')
    setDisclaimerState(accepted ? 'accepted' : 'required')
  }

  const handleDisclaimerAccept = useCallback(() => {
    localStorage.setItem('ct_disclaimer_accepted', JSON.stringify({ accepted: true, ts: Date.now() }))
    setDisclaimerState('accepted')
    if (user) {
      acceptDisclaimer().catch(() => {}) // best-effort; don't block UI
    }
  }, [user])

  const handleDisclaimerExit = useCallback(() => {
    // Close the tab / navigate away — best we can do in a browser
    window.close()
    // Fallback: clear everything and show a blank state
    window.location.href = 'about:blank'
  }, [])

  const handleAuth = useCallback((_token, userData) => {
    setUser(userData)
    setShowAuth(false)
    // After login, check if user has accepted disclaimer in DB
    if (!userData.disclaimer_accepted) {
      setDisclaimerState('required')
    }
  }, [])

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('ct_token')
    localStorage.removeItem('ct_token')
    setUser(null)
  }, [])

  // Standalone routes (verify-email, billing/*) bypass sidebar/disclaimer chrome
  // entirely — user got here from an external link and shouldn't see the rest.
  if (location.pathname === '/verify-email') {
    return (
      <Suspense fallback={<RouteLoading />}>
        <VerifyEmailPage onDone={() => navigate('/')} />
      </Suspense>
    )
  }
  if (location.pathname === '/billing/success') {
    return (
      <Suspense fallback={<RouteLoading />}>
        <BillingReturnPage outcome="success" onDone={() => navigate('/')} />
      </Suspense>
    )
  }
  if (location.pathname === '/billing/cancel') {
    return (
      <Suspense fallback={<RouteLoading />}>
        <BillingReturnPage outcome="cancel" onDone={() => navigate('/')} />
      </Suspense>
    )
  }

  // Show disclaimer before anything else.
  // While checking, render the route-loading spinner so users on slow
  // connections see feedback rather than a blank white screen.
  if (disclaimerState === 'checking') return <RouteLoading />

  if (disclaimerState === 'required') {
    return <DisclaimerModal onAccept={handleDisclaimerAccept} onExit={handleDisclaimerExit} />
  }

  // Landing has its own full-bleed layout — no sidebar.
  if (isLandingRoute) {
    // Signed-in users land on the Hub, not the marketing page.
    if (user) {
      return <Navigate to="/hub" replace />
    }
    return (
      <>
        <Landing onEnter={(tab) => navigate(tab ? `/${tab}` : '/hub')} />
        {showTerms && (
          <DisclaimerModal readOnly onExit={() => setShowTerms(false)} />
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-accent2/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-accent3/6 rounded-full blur-3xl" />
      </div>

      {/* Disclaimer (read-only terms view) */}
      {showTerms && (
        <DisclaimerModal readOnly onExit={() => setShowTerms(false)} />
      )}

      {/* Privacy Policy / Terms of Service */}
      {legalDoc && (
        <LegalModal document={legalDoc} onClose={() => setLegalDoc(null)} />
      )}

      {/* Plans / upgrade modal */}
      <AnimatePresence>
        {showUpgrade && (
          <UpgradeModal onClose={() => setShowUpgrade(false)} trigger={upgradeTrigger} user={user} onSignInClick={() => { setShowUpgrade(false); setShowAuth(true) }} />
        )}
      </AnimatePresence>

      {/* Toast (errors, session-expired notices) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-[calc(100%-2rem)]"
          >
            <div
              role="alert"
              className={`rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm flex items-start gap-3 ${
                toast.kind === 'error'
                  ? 'bg-accent3/10 border-accent3/30 text-accent3'
                  : 'bg-panel2 border-outline text-text'
              }`}
            >
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="text-muted hover:text-text shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth modal */}
      <AnimatePresence>
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuth={handleAuth}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 shrink-0 flex flex-col border-r border-outline bg-panel2/95 backdrop-blur-sm
        transition-transform duration-150 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="shrink-0 px-6 pt-8 pb-6 border-b border-outline">
          <div className="flex items-center justify-between">
            <NavLink
              to="/hub"
              onClick={() => setSidebarOpen(false)}
              aria-label="Go to hub"
              className="flex items-center gap-2 mb-1 hover:opacity-90 transition-opacity"
            >
              <Logo size={32} dark />
              <span className="text-lg font-bold bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
                CoreTriage
              </span>
            </NavLink>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-muted hover:text-text"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-muted leading-relaxed mt-1">
            Training, rehab &amp; coaching for climbers
          </p>
        </div>

        {/* Scrollable middle — nav + coaching CTA + tip card */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col">
        {/* Nav */}
        <nav className="px-3 py-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/${id}`}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100
                ${isActive
                  ? 'bg-accent/15 text-accent border border-accent/25 shadow-glow'
                  : 'text-muted hover:text-text hover:bg-panel'
                }`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} />
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-accent"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Coaching CTA */}
        <div className="mt-auto mx-3 mb-3 rounded-xl border border-accent3/25 bg-accent3/8 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserCircle2 size={12} className="text-accent3" />
            <span className="text-[10px] font-bold text-accent3 uppercase tracking-wide">1:1 Coaching</span>
          </div>
          <p className="text-[11px] text-muted leading-snug mb-2">
            $89/mo · application only. Personal injury review &amp; custom return-to-climb plan.
          </p>
          <button
            onClick={() => {
              setUpgradeTrigger('coaching')
              setShowUpgrade(true)
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-accent3 hover:text-accent3/80 transition-colors"
          >
            Apply for coaching <ChevronRight size={10} />
          </button>
        </div>

        {/* Tip card */}
        <TipCard />

        </div>
        {/* Sidebar footer */}
        <div className="shrink-0 px-4 py-4 border-t border-outline space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle size={11} className="text-accent3 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted/70 leading-relaxed">
              Severe symptoms or major trauma: seek professional evaluation.
            </p>
          </div>
          {user && user.tier && user.tier !== 'free' ? (
            <button
              onClick={async () => {
                try {
                  const { url } = await openBillingPortal()
                  window.location.href = url
                } catch (err) {
                  setToast({ kind: 'error', message: err.message || 'Could not open billing portal.' })
                }
              }}
              className="flex items-center gap-1 text-[10px] text-muted/50 hover:text-accent transition-colors"
            >
              <ChevronRight size={9} />
              Manage subscription
            </button>
          ) : (
            <button
              onClick={() => { setUpgradeTrigger('feature'); setShowUpgrade(true) }}
              className="flex items-center gap-1 text-[10px] text-muted/50 hover:text-accent transition-colors"
            >
              <ChevronRight size={9} />
              View plans &amp; pricing
            </button>
          )}
          <button
            onClick={() => setShowTerms(true)}
            className="flex items-center gap-1 text-[10px] text-muted/50 hover:text-muted transition-colors"
          >
            <FileText size={9} />
            Medical Disclaimer
          </button>
          <button
            onClick={() => setLegalDoc(PRIVACY_POLICY)}
            className="flex items-center gap-1 text-[10px] text-muted/50 hover:text-muted transition-colors"
          >
            <FileText size={9} />
            Privacy Policy
          </button>
          <button
            onClick={() => setLegalDoc(TERMS_OF_SERVICE)}
            className="flex items-center gap-1 text-[10px] text-muted/50 hover:text-muted transition-colors"
          >
            <FileText size={9} />
            Terms of Service
          </button>
          <button
            onClick={() => {
              const feedback = Sentry.getFeedback()
              if (feedback) {
                feedback.createForm().then((form) => form.appendToDom() && form.open())
              } else {
                // Sentry not initialised (no DSN set). Fall back to email.
                window.location.href = 'mailto:mathewbudnik@gmail.com?subject=CoreTriage%20bug%20report'
              }
            }}
            className="flex items-center gap-1 text-[10px] text-muted/50 hover:text-accent2 transition-colors"
          >
            <Bug size={9} />
            Report a bug
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* Email verification banner — shown when user is signed in but unverified */}
        {user && user.email_verified === false && !bannerDismissed && (
          <EmailVerificationBanner user={user} onDismiss={() => setBannerDismissed(true)} />
        )}

        {/* Top bar */}
        <header className="border-b border-outline px-4 md:px-8 py-4 flex items-center justify-between bg-panel2/40 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted hover:text-text p-1"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base md:text-xl font-bold text-text">
                {activeTabLabel}
              </h1>
              {activeTabSubtitle && (
                <p className="text-xs text-muted hidden sm:block mt-0.5">
                  {activeTabSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Auth area */}
          <div className="flex items-center gap-2">
            {user ? (
              <AccountMenu
                user={user}
                onUserChange={setUser}
                onLogout={handleLogout}
                onUpgradeClick={() => { setUpgradeTrigger('feature'); setShowUpgrade(true) }}
                onToast={setToast}
              />
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 text-xs btn-secondary"
              >
                <LogIn size={13} />
                Log in
              </button>
            )}
          </div>
        </header>

        {/* Tab content — driven by URL routes. Each tab handles its own
            internal navigation (e.g. /triage/onset, /rehab/finger). The
            Suspense wrapper covers the lazy-load gap as a route's chunk
            downloads on first navigation to it. */}
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/hub/*"     element={<HubTab user={user} />} />
              <Route path="/triage/*"  element={<TriageTab k={k} user={user} />} />
              <Route path="/rehab/*"   element={<RehabTab user={user} onLoginClick={() => setShowAuth(true)} />} />
              <Route path="/train"     element={<TrainTab user={user} dbReady={dbReady} onLoginClick={() => setShowAuth(true)} />} />
              <Route path="/progress"  element={<ProgressTab user={user} onLoginClick={() => setShowAuth(true)} />} />
              <Route path="/chat"      element={<ChatTab k={k} user={user} onLoginClick={() => setShowAuth(true)} />} />
              <Route path="/history/*" element={<HistoryTab dbReady={dbReady} user={user} onLoginClick={() => setShowAuth(true)} />} />
              <Route path="/about"     element={<AboutTab />} />
              {/* Any unknown path lands the user on Hub. */}
              <Route path="*"          element={<Navigate to="/hub" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      {/* Bottom nav — mobile only. pb-[env(safe-area-inset-bottom)] keeps
          tap targets above the iPhone home-indicator strip. */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-panel2/95 backdrop-blur-sm border-t border-outline pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/${id}`}
              className={({ isActive }) => `flex-1 min-w-0 flex flex-col items-center gap-1 py-3 text-[10px] sm:text-xs font-medium leading-tight transition-colors duration-100 ${
                isActive ? 'text-accent' : 'text-muted'
              }`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} />
                  <span className="truncate max-w-full px-0.5">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-full"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
