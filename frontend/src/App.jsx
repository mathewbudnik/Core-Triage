import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { X, LogIn, Trophy, Loader2 } from 'lucide-react'
import * as Sentry from '@sentry/react'
import { getHealth, getMe, getPyramid, getMeState, acceptDisclaimer } from './api'
import { workingTierFromHardest, TIER_TOKENS } from './lib/tier'
import { clearAll as clearDataCache } from './lib/dataCache'
import Landing from './components/Landing'
import AuthModal from './components/AuthModal'
import DisclaimerModal from './components/DisclaimerModal'
import LegalModal from './components/LegalModal'
import EmailVerificationBanner from './components/EmailVerificationBanner'
import TrialStatusBanner from './components/TrialStatusBanner'
import AccountMenu from './components/AccountMenu'
import AppShell from './components/shell/AppShell'
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from './data/legal'
import UpgradeModal from './components/UpgradeModal'
import AwardUnlockToast from './components/AwardUnlockToast'
import TierPromotionTakeover from './components/TierPromotionTakeover'
import { TierThemeProvider } from './components/ui/TierThemeProvider'
import TextureDefs from './components/ui/TextureDefs'

// Routing strategy — split into "primary" (eager-loaded, in the main bundle)
// and "secondary" (still lazy). The 5 primary tabs are what users navigate
// between constantly; eager-loading means switching from Train → Progress →
// Hub is instant with no Suspense flash. Secondary surfaces stay lazy so
// they only download when actually visited.
import HubTab      from './components/HubTab'
import RecoverTab  from './components/RecoverTab'
import TrainTab    from './components/TrainTab'
import ProgressTab from './components/ProgressTab'
import CoachTab    from './components/CoachTab'

const TriageTab            = lazy(() => import('./components/TriageTab'))
const RehabRegionRedirect  = lazy(() => import('./components/RehabRegionRedirect'))
const AwardsPage           = lazy(() => import('./components/AwardsPage'))
const HistoryTab           = lazy(() => import('./components/HistoryTab'))
const AboutTab             = lazy(() => import('./components/AboutTab'))
const VerifyEmailPage      = lazy(() => import('./components/VerifyEmailPage'))
const BillingReturnPage    = lazy(() => import('./components/BillingReturnPage'))
const ForgotPasswordPage   = lazy(() => import('./components/auth/ForgotPasswordPage'))
const ResetPasswordPage    = lazy(() => import('./components/auth/ResetPasswordPage'))
const SettingsPage         = lazy(() => import('./components/settings/SettingsPage'))
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

// Per-route header copy — drives AppShell's pageTitle + pageDateline. The 5
// primary tabs (ids match the AppShell nav routes) plus the secondary routes
// that still render inside the shell (Triage / History / Settings / About).
// The first path segment is looked up here; unknown segments fall back to the
// Home copy.
const TAB_META = {
  home:     { title: 'Home',     dateline: 'your dashboard' },
  train:    { title: 'Train',    dateline: 'plans + log' },
  progress: { title: 'Progress', dateline: 'the record' },
  coach:    { title: 'Coach',    dateline: 'ask + analyze' },
  recover:  { title: 'Recover',  dateline: 'screen + rehab' },
  triage:   { title: 'Triage',   dateline: 'screen a symptom' },
  history:  { title: 'History',  dateline: 'your log' },
  settings: { title: 'Settings', dateline: 'account + plan' },
  about:    { title: 'About',    dateline: 'CoreTriage' },
}
const DEFAULT_TAB_META = TAB_META.home

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
  // Current streak shown in the Header — sourced from me-state, the same
  // payload the Hub reads. 0 hides the Header flame.
  const [streakDays, setStreakDays] = useState(0)

  // Derive "is on landing?" and "is on a special standalone page?" from URL
  // — landing has its own full-bleed layout; verify-email + billing/* are
  // standalone pages that bypass the sidebar/header chrome.
  const isLandingRoute  = location.pathname === '/'
  const isStandalonePage = location.pathname === '/verify-email'
                        || location.pathname === '/billing/success'
                        || location.pathname === '/billing/cancel'
                        || location.pathname === '/forgot-password'
                        || location.pathname === '/reset-password'

  // Active tab id = first path segment. Drives AppShell's activeTabId prop and
  // the per-route header copy lookup.
  const activeTabId = useMemo(
    () => location.pathname.split('/')[1] || 'home',
    [location.pathname],
  )
  const tabMeta = TAB_META[activeTabId] || DEFAULT_TAB_META

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
    if (!user) { setUserTier(null); setStreakDays(0); return }
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
    // Streak for the Header flame — me-state is the same payload the Hub reads.
    getMeState()
      .then((s) => { if (!cancelled) setStreakDays(s?.streak_days_current ?? 0) })
      .catch(() => { /* no me-state yet — leave streak hidden */ })
    return () => { cancelled = true }
  }, [user])

  // Resolve tier color tokens. Pass these as inline CSS variables on the
  // app root so every `var(--tier-c)` etc. in the nav resolves to the
  // user's grade color. Fallbacks (clay) only show pre-login.
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
    // Signed-in users land on Home, not the marketing page.
    if (user) {
      return <Navigate to="/home" replace />
    }
    return (
      <>
        <Landing onEnter={(tab) => navigate(tab ? `/${tab}` : '/home')} />
        {showTerms && (
          <DisclaimerModal readOnly onExit={() => setShowTerms(false)} />
        )}
      </>
    )
  }

  return (
    <div style={tierVars}>
      {/* Off-screen SVG defs (hatch patterns, foil gradient, ink-blot symbol)
          mounted once so any descendant can reference via fill="url(#ct-foil)"
          etc. */}
      <TextureDefs />

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
                background: 'linear-gradient(135deg, rgba(197,138,119,0.25), rgba(197,138,119,0.10))',
                border: '0.5px solid rgba(197,138,119,0.45)',
                boxShadow: '0 8px 24px rgba(197,138,119,0.30)',
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
                      background: 'rgba(197,138,119,0.28)',
                      color: '#b06a4f',
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
                className="text-ink-soft hover:text-ct-cream shrink-0"
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

      {/* Almanac shell — sidebar + header + bottom nav. The routed page
          content (Routes, wrapped in TierThemeProvider + the global fade-rise
          motion div) is passed as children. The banners ride at the top of
          the content area, above the page, exactly as before. */}
      <AppShell
        user={user}
        activeTabId={activeTabId}
        pageTitle={tabMeta.title}
        pageDateline={tabMeta.dateline}
        streak={streakDays}
        onLogClick={() => navigate('/train')}
        accountSlot={
          user ? (
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
          )
        }
        weekDays={[]}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={setSidebarOpen}
        onCoachingClick={() => { setUpgradeTrigger('coaching'); setShowUpgrade(true) }}
        onFooterClick={(key) => {
          if (key === 'about') navigate('/about')
          else if (key === 'privacy') setLegalDoc(PRIVACY_POLICY)
          else if (key === 'terms') setLegalDoc(TERMS_OF_SERVICE)
          else if (key === 'disclaimer') setShowTerms(true)
          else if (key === 'bug') {
            const feedback = Sentry.getFeedback?.()
            if (feedback) feedback.createForm().then((form) => form.appendToDom() && form.open())
            else window.location.href = 'mailto:mathewbudnik@gmail.com?subject=CoreTriage%20bug%20report'
          }
        }}
      >
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

        {/* Tab content — driven by URL routes. Each tab handles its own
            internal navigation (e.g. /triage/onset). The Suspense wrapper
            covers the lazy-load gap as a route's chunk downloads on first
            navigation to it.

            AnimatePresence (mode="wait") gives every route change a soft
            fade-rise — the global "Apple-flow" transition. Keyed on the
            URL's first segment so it fires on tab switches AND cross-tab
            navigations (e.g. Body's Screen CTA → /triage) but NOT on
            in-tab navigation between sub-routes (e.g. /triage → /triage/card)
            where the route component owns its own internal motion.

            initial={false} suppresses the animation on first paint so app
            load doesn't feel artificially slow. */}
        <div className="flex-1">
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
                  <Route path="/home/*"        element={<HubTab user={user} />} />
                  {/* Back-compat: old /hub links redirect to /home. */}
                  <Route path="/hub/*"         element={<Navigate to="/home" replace />} />
                  <Route path="/recover/*"     element={<RecoverTab user={user} onLoginClick={() => setShowAuth(true)} />} />
                  {/* Legacy /body links — bookmarks, old emails, in-app cache —
                      redirect to /recover so the old path keeps working. */}
                  <Route path="/body/*"        element={<Navigate to="/recover" replace />} />
                  {/* Back-compat: old /rehab links redirect to /recover; /rehab/:region keeps the region. */}
                  <Route path="/rehab"         element={<Navigate to="/recover" replace />} />
                  <Route path="/rehab/:region" element={<RehabRegionRedirect />} />
                  <Route path="/triage/*"      element={<TriageTab k={k} user={user} />} />
                  <Route path="/train"         element={<TrainTab user={user} dbReady={dbReady} onLoginClick={() => setShowAuth(true)} />} />
                  <Route path="/progress"        element={<ProgressTab user={user} onUserChange={setUser} onLoginClick={() => setShowAuth(true)} />} />
                  <Route path="/progress/awards" element={<AwardsPage user={user} />} />
                  <Route path="/settings" element={<SettingsPage user={user} onUserChange={setUser} onLogout={handleLogout} onToast={setToast} onUpgradeClick={() => { setUpgradeTrigger('feature'); setShowUpgrade(true) }} />} />
                  <Route path="/coach"         element={<CoachTab k={k} user={user} onLoginClick={() => setShowAuth(true)} />} />
                  {/* Back-compat: old /chat links redirect to /coach. */}
                  <Route path="/chat"          element={<Navigate to="/coach" replace />} />
                  <Route path="/history/*"     element={<HistoryTab dbReady={dbReady} user={user} onLoginClick={() => setShowAuth(true)} />} />
                  <Route path="/about"         element={<AboutTab />} />
                  {import.meta.env.DEV && (
                    <Route path="/design-system" element={<DesignSystem />} />
                  )}
                  {/* Any unknown path lands the user on Home. */}
                  <Route path="*"              element={<Navigate to="/home" replace />} />
                </Routes>
                </TierThemeProvider>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </AppShell>
    </div>
  )
}
