import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Clock, Info, AlertTriangle, Menu, X, LogIn, LogOut, User, Activity, Dumbbell, FileText, Stethoscope, UserCircle2, ChevronRight } from 'lucide-react'
import { getHealth, getMe, acceptDisclaimer } from './api'
import Landing from './components/Landing'
import Logo from './components/Logo'
import TriageTab from './components/TriageTab'
import ChatTab from './components/ChatTab'
import HistoryTab from './components/HistoryTab'
import AboutTab from './components/AboutTab'
import AuthModal from './components/AuthModal'
import TipCard from './components/TipCard'
import TrainTab from './components/TrainTab'
import RehabTab from './components/RehabTab'
import DisclaimerModal from './components/DisclaimerModal'

const TABS = [
  { id: 'triage',  label: 'Triage',  icon: Activity    },
  { id: 'rehab',   label: 'Rehab',   icon: Stethoscope },
  { id: 'train',   label: 'Train',   icon: Dumbbell    },
  { id: 'chat',    label: 'Chat',    icon: MessageSquare },
  { id: 'history', label: 'History', icon: Clock       },
  { id: 'about',   label: 'About',   icon: Info        },
]

const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export default function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [activeTab, setActiveTab] = useState('triage')
  const k = 4
  const [dbReady, setDbReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  // Disclaimer state
  const [disclaimerState, setDisclaimerState] = useState('checking') // 'checking' | 'required' | 'accepted'
  const [showTerms, setShowTerms] = useState(false) // read-only re-open

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

  const [triageKey, setTriageKey] = useState(0)

  const handleTabChange = useCallback((id) => {
    setActiveTab(id)
    setSidebarOpen(false)
    if (id === 'triage') setTriageKey((k) => k + 1)
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

  const activeTabLabel = useMemo(() => TABS.find((t) => t.id === activeTab)?.label, [activeTab])

  // Show disclaimer before anything else
  if (disclaimerState === 'checking') return null

  if (disclaimerState === 'required') {
    return <DisclaimerModal onAccept={handleDisclaimerAccept} onExit={handleDisclaimerExit} />
  }

  if (showLanding) {
    return (
      <>
        <AnimatePresence>
          <motion.div key="landing" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Landing onEnter={(tab) => { setShowLanding(false); if (tab) setActiveTab(tab) }} />
          </motion.div>
        </AnimatePresence>
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
            className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 shrink-0 flex flex-col border-r border-outline bg-panel2/95 backdrop-blur-sm
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 border-b border-outline">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-1">
              <Logo size={32} dark />
              <span className="text-lg font-bold bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
                CoreTriage
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-muted hover:text-text"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-muted leading-relaxed mt-1">
            Outdoor-inspired triage + rehab guidance
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-accent/15 text-accent border border-accent/25 shadow-glow'
                    : 'text-muted hover:text-text hover:bg-panel'
                  }`}
              >
                <Icon size={16} />
                {label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-accent"
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Coaching CTA */}
        <div className="mx-3 mb-3 rounded-xl border border-accent3/25 bg-accent3/8 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserCircle2 size={12} className="text-accent3" />
            <span className="text-[10px] font-bold text-accent3 uppercase tracking-wide">Pro Coaching</span>
          </div>
          <p className="text-[11px] text-muted leading-snug mb-2">
            Work 1:1 with a coach — personal injury review &amp; custom return-to-climb plan.
          </p>
          <button
            onClick={() => handleTabChange('chat')}
            className="flex items-center gap-1 text-[11px] font-semibold text-accent3 hover:text-accent3/80 transition-colors"
          >
            Apply for coaching <ChevronRight size={10} />
          </button>
        </div>

        {/* Tip card */}
        <TipCard />

        {/* Sidebar footer */}
        <div className="px-4 py-4 border-t border-outline space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle size={11} className="text-accent3 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted/70 leading-relaxed">
              Severe symptoms or major trauma: seek professional evaluation.
            </p>
          </div>
          <button
            onClick={() => setShowTerms(true)}
            className="flex items-center gap-1 text-[10px] text-muted/50 hover:text-muted transition-colors"
          >
            <FileText size={9} />
            View Terms &amp; Disclaimer
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 pb-16 md:pb-0">
        {/* Top bar */}
        <header className="border-b border-outline px-4 md:px-8 py-4 flex items-center justify-between bg-panel2/40 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted hover:text-text p-1"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base md:text-xl font-bold text-text">
                {activeTabLabel}
              </h1>
              <p className="text-xs text-muted hidden sm:block mt-0.5">
                Educational climbing injury guidance · Not a medical diagnosis
              </p>
            </div>
          </div>

          {/* Auth area */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted bg-panel border border-outline px-3 py-1.5 rounded-full">
                  <User size={12} className="text-accent" />
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-text bg-panel border border-outline px-3 py-1.5 rounded-full transition-colors"
                >
                  <LogOut size={12} />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </>
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

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full"
            >
              {activeTab === 'triage' && <TriageTab key={triageKey} k={k} user={user} />}
              {activeTab === 'rehab' && (
                <RehabTab
                  user={user}
                  onLoginClick={() => setShowAuth(true)}
                />
              )}
              {activeTab === 'chat' && <ChatTab k={k} user={user} onLoginClick={() => setShowAuth(true)} />}
              {activeTab === 'history' && (
                <HistoryTab
                  dbReady={dbReady}
                  user={user}
                  onLoginClick={() => setShowAuth(true)}
                />
              )}
              {activeTab === 'train' && (
                <TrainTab
                  user={user}
                  dbReady={dbReady}
                  onLoginClick={() => setShowAuth(true)}
                />
              )}
              {activeTab === 'about' && <AboutTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-panel2/95 backdrop-blur-sm border-t border-outline">
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors duration-200 ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <Icon size={18} />
                {label}
                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
