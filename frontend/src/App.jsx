import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { MessageSquare, Clock, Info, AlertTriangle, Menu, X, LogIn, Activity, Dumbbell, FileText, Stethoscope, UserCircle2, ChevronRight, Bug, Loader2, Trophy, Home } from 'lucide-react'
import * as Sentry from '@sentry/react'
import { getHealth, getMe, getPyramid, acceptDisclaimer } from './api'
import { workingTierFromHardest, TIER_TOKENS } from './lib/tier'
import { clearAll as clearDataCache } from './lib/dataCache'
import Landing from './components/Landing'
import Logo from './components/Logo'
import AuthModal from './components/AuthModal'
import TipCard from './components/TipCard'
import DisclaimerModal from './components/DisclaimerModal'
import LegalModal from './components/LegalModal'
import EmailVerificationBanner from './components/EmailVerificationBanner'
import TrialStatusBanner from './components/TrialStatusBanner'
import AccountMenu from './components/AccountMenu'
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from './data/legal'
import { openBillingPortal } from './api'
import UpgradeModal from './components/UpgradeModal'
import AwardUnlockToast from './components/AwardUnlockToast'
import TierPromotionTakeover from './components/TierPromotionTakeover'
import { TierThemeProvider } from './components/ui/TierThemeProvider'

// Routing strategy — split into "primary" (eager-loaded, in the main bundle)
// and "secondary" (still lazy). The 5 primary tabs are what users navigate
// between constantly; eager-loading means switching from Train → Progress →
// Hub is instant with no Suspense flash. Secondary surfaces stay lazy so
// they only download when actually visited.
import HubTab      from './components/HubTab'
import RecoverTab  from './components/RecoverTab'
import TrainTab    from './components/TrainTab'
import ProgressTab from './components/ProgressTab'
import ChatTab     from './components/ChatTab'

const RehabRegionRedirect  = lazy(() => import('./components/RehabRegionRedirect'))
const TriageTab            = lazy(() => import('./components/TriageTab'))
const RehabTab             = lazy(() => import('./components/RehabTab'))
const AwardsPage           = lazy(() => import('./components/AwardsPage'))
const HistoryTab           = lazy(() => import('./components/HistoryTab'))
const AboutTab             = lazy(() => import('./components/AboutTab'))
const VerifyEmailPage      = lazy(() => import('./components/VerifyEmailPage'))
const BillingReturnPage    = lazy(() => import('./components/BillingReturnPage'))
const ForgotPasswordPage   = lazy(() => import('./components/auth/ForgotPasswordPage'))
const ResetPasswordPage    = lazy(() => import('./components/auth/ResetPasswordPage'))
const DesignSystem         = import.meta.env.DEV
  ? lazy(() => import('./components/DesignSystem'))
  : null

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

// Single source of truth for every tab's metadata (label, icon, subtitle for
// the global header). Routes still exist for every entry in this list — the
// nav arrays below decide which tabs surface in which navigation chrome.
const TABS = [
  { id: 'hub',      label: 'Hub',      icon: Home,          subtitle: 'Your climbing dashboard' },
  { id: 'train',    label: 'Train',    icon: Dumbbell,      subtitle: 'Plans, stats, and how you stack up' },
  { id: 'progress', label: 'Progress', icon: Trophy,        subtitle: 'Leaderboard, grade pyramid, and your stats' },
  { id: 'recover',  label: 'Recover',  icon: Stethoscope,   subtitle: 'Screen issues + work through rehab' },
  { id: 'chat',     label: 'Chat',     icon: MessageSquare, subtitle: 'Ask the climbing-trained assistant' },
]

// Mobile bottom nav + top of desktop sidebar — 5 core tabs.
const PRIMARY_TAB_IDS = ['hub', 'train', 'progress', 'recover', 'chat']
// No secondary tabs needed with the 4-tab structure.
const SECONDARY_TAB_IDS = []
// Triage / History → still accessible via direct links / internal navigation.
// About            → reachable from the sidebar footer next to Privacy / Terms.
// Routes still exist for all of these; they just don't take up nav real estate.

const PRIMARY_TABS   = TABS.filter((t) => PRIMARY_TAB_IDS.includes(t.id))
const SECONDARY_TABS = TABS.filter((t) => SECONDARY_TAB_IDS.includes(t.id))

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
  const [toast, setToast] = useState(null) // { kind: 'error'|'info'|'celebration', message: string, link?: string }
  const [awardQueue, setAwardQueue] = useState([])      // Array of unlocked-award payloads, queued FIFO
  const [promotion, setPromotion] = useState(null)      // { from, to } | null — tier promotion takeover
  // userTier drives the nav accent color. Computed from the user's hardest
  // grades on their athlete profile; null until the profile loads (nav falls
  // back to the default teal accent via the CSS variable fallback values).
  const [userTier, setUserTier] = useState(null)

  // Derive "is on landing?" and "is on a special standalone page?" from URL
  // — landing has its own full-bleed layout; verify-email + billing/* are
  // standalone pages that bypass the sidebar/header chrome.
  const isLandingRoute  = location.pathname === '/'
  const isStandalonePage = location.pathname === '/verify-email'
                        || location.pathname === '/billing/success'
                        || location.pathname === '/billing/cancel'
                        || location.pathname === '/forgot-password'
                        || location.pathname === '/reset-password'

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
    // Drop the in-memory API cache so the next user doesn't see the
    // previous user's data on first paint.
    clearDataCache()
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

  // Generic toast channel — any deep child can dispatch
  // `new CustomEvent('ct:toast', { detail: { kind, message } })` to surface
  // a toast without prop-drilling a callback through. Used for optimistic-
  // UI failure paths where the originating component may already be unmounted.
  useEffect(() => {
    const handler = (ev) => {
      const { kind = 'info', message } = ev.detail || {}
      if (message) setToast({ kind, message })
    }
    window.addEventListener('ct:toast', handler)
    return () => window.removeEventListener('ct:toast', handler)
  }, [])

  // Climb log celebration: PR toast on new hardest send. Dispatched by
  // TrainingLogEntry after a successful log when new_prs has a value.
  useEffect(() => {
    const handler = (ev) => {
      const { boulder, route } = ev.detail || {}
      const parts = []
      if (boulder) parts.push(`${boulder} boulder`)
      if (route)   parts.push(`${route} route`)
      if (parts.length === 0) return
      setToast({
        kind: 'celebration',
        message: `New PR — ${parts.join(' + ')}!`,
        link: '/progress',
      })
    }
    window.addEventListener('ct:new-pr', handler)
    return () => window.removeEventListener('ct:new-pr', handler)
  }, [])

  // Award unlock queue — multiple may unlock in one log
  useEffect(() => {
    const handler = (ev) => {
      const list = ev.detail?.awards || []
      if (list.length) setAwardQueue((q) => [...q, ...list])
    }
    window.addEventListener('ct:award-unlocked', handler)
    return () => window.removeEventListener('ct:award-unlocked', handler)
  }, [])

  // Tier promotion — show full-screen takeover, and bump the active nav tier
  // to the new id so the sidebar / bottom-nav colors update immediately
  // (no need to wait for a profile refetch).
  useEffect(() => {
    const handler = (ev) => {
      const { from, to } = ev.detail || {}
      if (from && to) setPromotion({ from, to })
      if (to) setUserTier(to)
    }
    window.addEventListener('ct:tier-promotion', handler)
    return () => window.removeEventListener('ct:tier-promotion', handler)
  }, [])

  // Fetch the rolling-30-day grade pyramid once the user is signed in and
  // derive their working tier from the hardest recent send. This is the
  // same data source the "Current Tier" widget on the Progress page uses,
  // so the nav color always matches what the user sees there — not their
  // lifetime max grade from the profile (which leads to confusing
  // "I'm V0 Frost on Progress but my nav is V10 coral" mismatches).
  // No recent sends → workingTierFromHardest falls back to 'rookie' (Quartz).
  useEffect(() => {
    if (!user) { setUserTier(null); return }
    let cancelled = false
    getPyramid({ window: 'month' })
      .then((p) => {
        if (cancelled) return
        const tier = workingTierFromHardest({
          boulder: p?.boulder?.hardest_send,
          route:   p?.route?.hardest_send,
        })
        if (tier) setUserTier(tier)
      })
      .catch(() => { /* no pyramid data yet — keep default accent */ })
    return () => { cancelled = true }
  }, [user])

  // Resolve tier color tokens. Pass these as inline CSS variables on the
  // app root so every `var(--tier-c)` etc. in the nav resolves to the
  // user's grade color. Fallbacks (#14b8a6 teal) only show pre-login.
  const tierTokens = userTier ? TIER_TOKENS[userTier] : null
  const tierVars = tierTokens ? {
    '--tier-c':     tierTokens.c,
    '--tier-light': tierTokens.light,
    '--tier-deep':  tierTokens.deep,
    // 22% alpha glow, matches the tier.js doc comment.
    '--tier-glow':  `${tierTokens.c}38`,
  } : undefined

  // Pop the head of the award queue every 5 seconds
  useEffect(() => {
    if (!awardQueue.length) return
    const t = setTimeout(() => setAwardQueue((q) => q.slice(1)), 5000)
    return () => clearTimeout(t)
  }, [awardQueue])

  // Auto-dismiss toast — 4s for celebration, 5s for others
  useEffect(() => {
    if (!toast) return
    const ms = toast.kind === 'celebration' ? 4000 : 5000
    const t = setTimeout(() => setToast(null), ms)
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
    clearDataCache()
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
  if (location.pathname === '/forgot-password') {
    return (
      <Suspense fallback={<RouteLoading />}>
        <ForgotPasswordPage />
      </Suspense>
    )
  }
  if (location.pathname === '/reset-password') {
    return (
      <Suspense fallback={<RouteLoading />}>
        <ResetPasswordPage />
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
    <div className="min-h-screen bg-bg flex" style={tierVars}>
      {/* Ambient background orbs — warm forest-on-forest with a faint
          terracotta lift up top. Replaces the legacy teal+pink+gold trio
          that was the dominant source of the cold/blue cast across the
          app. Subtle so the page surfaces (forest gradients) still read. */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-ct-terracotta/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-ct-moss/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-ct-terra-soft/6 rounded-full blur-3xl" />
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

      {/* Award unlock toasts — queue, show first */}
      <AnimatePresence>
        {awardQueue.length > 0 && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[210] max-w-sm w-[calc(100%-2rem)]">
            <AwardUnlockToast
              award={awardQueue[0]}
              onTap={() => { navigate('/progress'); setAwardQueue((q) => q.slice(1)) }}
              onClose={() => setAwardQueue((q) => q.slice(1))}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Tier promotion takeover */}
      <AnimatePresence>
        {promotion && (
          <TierPromotionTakeover
            from={promotion.from}
            to={promotion.to}
            onClose={() => setPromotion(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast (errors, session-expired notices, PR celebration) */}
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
                  : toast.kind === 'celebration'
                    ? 'cursor-pointer text-ct-cream'
                    : 'bg-ct-forest-deep border-ct-hairline text-ct-cream'
              }`}
              style={toast.kind === 'celebration' ? {
                background: 'linear-gradient(135deg, rgba(217,119,87,0.25), rgba(217,119,87,0.10))',
                border: '0.5px solid rgba(217,119,87,0.45)',
                boxShadow: '0 8px 24px rgba(217,119,87,0.30)',
              } : undefined}
              onClick={() => {
                if (toast.link) {
                  navigate(toast.link)
                  setToast(null)
                }
              }}
            >
              {toast.kind === 'celebration' ? (
                <>
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: 'rgba(217,119,87,0.28)',
                      color: '#f0a875',
                    }}
                  >
                    <Trophy size={14} />
                  </span>
                  <span className="flex-1 leading-snug">
                    {toast.message}
                    {toast.link && <span className="ml-2 text-ct-terra-soft font-semibold">Tap to view ›</span>}
                  </span>
                </>
              ) : (
                <span className="flex-1 leading-snug">
                  {toast.message}
                  {toast.link && <span className="ml-2 text-ct-terra-soft font-bold">Tap to view ›</span>}
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setToast(null) }}
                className="text-ct-cream/60 hover:text-ct-cream shrink-0"
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
        fixed md:sticky md:top-0 inset-y-0 md:inset-y-auto left-0 z-40
        md:h-screen
        w-64 shrink-0 flex flex-col border-r border-ct-hairline bg-ct-forest/95 backdrop-blur-sm
        transition-transform duration-150 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="shrink-0 px-6 pt-8 pb-6 border-b border-ct-hairline">
          <div className="flex items-center justify-between">
            <NavLink
              to="/hub"
              onClick={() => setSidebarOpen(false)}
              aria-label="Go to hub"
              className="flex items-center gap-2 mb-1 hover:opacity-90 transition-opacity"
            >
              <Logo size={32} dark />
              <span
                className="text-lg font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #3FD8A4, #d97757)' }}
              >
                CoreTriage
              </span>
            </NavLink>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-ct-cream/60 hover:text-ct-cream"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-ct-cream/60 leading-relaxed mt-1">
            Training, rehab &amp; coaching for climbers
          </p>
        </div>

        {/* Scrollable middle — nav + coaching CTA + tip card */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col">
        {/* Nav — primary climbing surfaces on top, secondary (Chat) below
            a thin divider so the hierarchy reads at a glance. */}
        <nav className="px-3 py-4 space-y-1">
          {PRIMARY_TABS.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/${id}`}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 border ${
                isActive ? '' : 'text-ct-cream/60 hover:text-ct-cream hover:bg-ct-hairline border-transparent'
              }`}
              style={({ isActive }) => isActive ? {
                background: 'rgba(217,119,87,0.12)',
                color: '#f0a875',
                borderColor: 'rgba(217,119,87,0.30)',
                boxShadow: '0 0 12px rgba(217,119,87,0.18)',
              } : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.25 : 2}
                  />
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      transition={{ duration: 0.12, ease: [0, 0, 0.2, 1] }}
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{
                        background: '#d97757',
                        boxShadow: '0 0 6px rgba(217,119,87,0.55)',
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
          {SECONDARY_TABS.length > 0 && (
            <>
              <div className="h-px bg-ct-hairline mx-3 my-3" />
              {SECONDARY_TABS.map(({ id, label, icon: Icon }) => (
                <NavLink
                  key={id}
                  to={`/${id}`}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 border ${
                    isActive ? '' : 'text-ct-cream/60 hover:text-ct-cream hover:bg-ct-hairline border-transparent'
                  }`}
                  style={({ isActive }) => isActive ? {
                    background: 'rgba(217,119,87,0.12)',
                    color: '#f0a875',
                    borderColor: 'rgba(217,119,87,0.30)',
                    boxShadow: '0 0 12px rgba(217,119,87,0.18)',
                  } : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} />
                      {label}
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          transition={{ duration: 0.12, ease: [0, 0, 0.2, 1] }}
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{
                            background: '#d97757',
                            boxShadow: '0 0 6px rgba(217,119,87,0.55)',
                          }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
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

        {/* Tip card — desktop sidebar only. On mobile the drawer is a
            transient nav surface, not a place for ambient content. */}
        <div className="hidden md:block">
          <TipCard />
        </div>

        </div>
        {/* Sidebar footer */}
        <div className="shrink-0 px-4 py-4 border-t border-ct-hairline space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle size={11} className="text-accent3 shrink-0 mt-0.5" />
            <p className="text-[10px] text-ct-cream/50 leading-relaxed">
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
              className="flex items-center gap-1 text-[10px] text-ct-cream/40 hover:text-ct-cream/80 transition-colors"
            >
              <ChevronRight size={9} />
              Manage subscription
            </button>
          ) : (
            <button
              onClick={() => { setUpgradeTrigger('feature'); setShowUpgrade(true) }}
              className="flex items-center gap-1 text-[10px] text-ct-cream/40 hover:text-ct-cream/80 transition-colors"
            >
              <ChevronRight size={9} />
              View plans &amp; pricing
            </button>
          )}
          <button
            onClick={() => navigate('/about')}
            className="flex items-center gap-1 text-[10px] text-ct-cream/40 hover:text-ct-cream/80 transition-colors"
          >
            <Info size={9} />
            About CoreTriage
          </button>
          <button
            onClick={() => setShowTerms(true)}
            className="flex items-center gap-1 text-[10px] text-ct-cream/40 hover:text-ct-cream/80 transition-colors"
          >
            <FileText size={9} />
            Medical Disclaimer
          </button>
          <button
            onClick={() => setLegalDoc(PRIVACY_POLICY)}
            className="flex items-center gap-1 text-[10px] text-ct-cream/40 hover:text-ct-cream/80 transition-colors"
          >
            <FileText size={9} />
            Privacy Policy
          </button>
          <button
            onClick={() => setLegalDoc(TERMS_OF_SERVICE)}
            className="flex items-center gap-1 text-[10px] text-ct-cream/40 hover:text-ct-cream/80 transition-colors"
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
            className="flex items-center gap-1 text-[10px] text-ct-cream/40 hover:text-red-400 transition-colors"
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
        {/* Trial countdown / post-trial paywall banner — only renders in the
            last 5 days of trial or after expiry, otherwise null. */}
        {user && (
          <TrialStatusBanner
            user={user}
            onUpgradeClick={() => { setUpgradeTrigger('feature'); setShowUpgrade(true) }}
          />
        )}

        {/* Top bar — tier-themed accent: a hairline gradient at the bottom
            edge and a small filled icon in the active tab's tier color keep
            mobile chrome from reading as flat grey. */}
        <header className="border-b border-ct-hairline px-4 md:px-8 py-4 flex items-center justify-between bg-ct-forest/40 backdrop-blur-sm sticky top-0 z-20 relative">
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 bottom-[-1px] h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #d97757 50%, transparent 100%)',
              opacity: 0.45,
            }}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-ct-cream/60 hover:text-ct-cream p-1"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              {activeTab?.icon && (
                <motion.span
                  key={activeTab.id}
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                  aria-hidden
                  className="shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(217,119,87,0.16)',
                    border: '0.5px solid rgba(217,119,87,0.30)',
                    boxShadow: '0 0 10px rgba(217,119,87,0.25)',
                    color: '#f0a875',
                  }}
                >
                  <activeTab.icon size={14} strokeWidth={2.25} />
                </motion.span>
              )}
              <div className="min-w-0">
                <h1 className="text-base md:text-xl font-bold text-text leading-tight">
                  {activeTabLabel}
                </h1>
                {activeTabSubtitle && (
                  <p className="text-xs text-ct-cream/60 hidden sm:block mt-0.5">
                    {activeTabSubtitle}
                  </p>
                )}
              </div>
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
            downloads on first navigation to it.

            AnimatePresence (mode="wait") gives every route change a soft
            fade-rise — the global "Apple-flow" transition. Keyed on the
            URL's first segment so it fires on tab switches AND cross-tab
            navigations (e.g. Body's Screen CTA → /triage) but NOT on
            in-tab navigation between sub-routes (e.g. /triage → /triage/card)
            where the route component owns its own internal motion.

            initial={false} suppresses the animation on first paint so app
            load doesn't feel artificially slow. */}
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<RouteLoading />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname.split('/')[1] || 'root'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <TierThemeProvider tier={userTier}>
                <Routes location={location}>
                  <Route path="/hub/*"         element={<HubTab user={user} />} />
                  <Route path="/recover/*"     element={<RecoverTab user={user} onLoginClick={() => setShowAuth(true)} />} />
                  {/* Legacy /body links — bookmarks, old emails, in-app cache —
                      redirect to /recover so the old path keeps working. */}
                  <Route path="/body/*"        element={<Navigate to="/recover" replace />} />
                  <Route path="/triage/*"      element={<TriageTab k={k} user={user} />} />
                  <Route path="/rehab"         element={<Navigate to="/recover" replace />} />
                  <Route path="/rehab/:region" element={<RehabRegionRedirect />} />
                  <Route path="/train"         element={<TrainTab user={user} dbReady={dbReady} onLoginClick={() => setShowAuth(true)} />} />
                  <Route path="/progress"        element={<ProgressTab user={user} onUserChange={setUser} onLoginClick={() => setShowAuth(true)} />} />
                  <Route path="/progress/awards" element={<AwardsPage user={user} />} />
                  <Route path="/chat"          element={<ChatTab k={k} user={user} onLoginClick={() => setShowAuth(true)} />} />
                  <Route path="/history/*"     element={<HistoryTab dbReady={dbReady} user={user} onLoginClick={() => setShowAuth(true)} />} />
                  <Route path="/about"         element={<AboutTab />} />
                  {import.meta.env.DEV && (
                    <Route path="/design-system" element={<DesignSystem />} />
                  )}
                  {/* Any unknown path lands the user on Hub. */}
                  <Route path="*"              element={<Navigate to="/hub" replace />} />
                </Routes>
                </TierThemeProvider>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </main>

      {/* Bottom nav — mobile only. pb-[env(safe-area-inset-bottom)] keeps
          tap targets above the iPhone home-indicator strip. */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-ct-forest/95 backdrop-blur-sm border-t border-ct-hairline pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {/* Mobile bottom nav: primary 5 only — Chat / History / About are
              reachable via the sidebar drawer (hamburger), Account menu, and
              sidebar footer respectively. Cuts clutter at typical phone widths. */}
          {PRIMARY_TABS.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/${id}`}
              className={({ isActive }) => `relative flex-1 min-w-0 flex flex-col items-center gap-1 pt-2.5 pb-3 text-[10px] sm:text-xs font-medium leading-tight transition-colors duration-100 active:scale-[0.92] [transition:transform_120ms_ease,color_100ms_ease] ${
                isActive ? '' : 'text-ct-cream/60'
              }`}
              style={({ isActive }) => isActive ? { color: '#f0a875' } : undefined}
            >
              {({ isActive }) => (
                <>
                  {/* Icon + soft tier-glow blob behind it on active. The blob
                      uses color-mix so it adapts to whatever tier color is live. */}
                  <span className="relative flex items-center justify-center w-9 h-7">
                    {isActive && (
                      <motion.span
                        layoutId="bottom-nav-blob"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'rgba(217,119,87,0.22)',
                          boxShadow: '0 0 12px rgba(217,119,87,0.35)',
                        }}
                      />
                    )}
                    <Icon
                      size={isActive ? 19 : 18}
                      strokeWidth={isActive ? 2.25 : 2}
                      className="relative z-10 transition-[font-size] duration-150"
                    />
                  </span>
                  <span className="truncate max-w-full px-0.5">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                      className="absolute bottom-0 w-10 h-1 rounded-full"
                      style={{
                        background: '#d97757',
                        boxShadow: '0 0 10px rgba(217,119,87,0.55)',
                      }}
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
