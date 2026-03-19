import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, MessageSquare, Clock, Info, AlertTriangle, SlidersHorizontal, Menu, X, LogIn, LogOut, User } from 'lucide-react'
import { getHealth, getMe } from './api'
import Landing from './components/Landing'
import TriageTab from './components/TriageTab'
import ChatTab from './components/ChatTab'
import HistoryTab from './components/HistoryTab'
import AboutTab from './components/AboutTab'
import AuthModal from './components/AuthModal'

const TABS = [
  { id: 'triage', label: 'Triage', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'about', label: 'About', icon: Info },
]

export default function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [activeTab, setActiveTab] = useState('triage')
  const [k, setK] = useState(4)
  const [dbReady, setDbReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    getHealth()
      .then((data) => setDbReady(data.db_ready))
      .catch(() => setDbReady(false))

    // Restore session from stored token
    const token = localStorage.getItem('ct_token')
    if (token) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('ct_token')
        })
    }
  }, [])

  function handleTabChange(id) {
    setActiveTab(id)
    setSidebarOpen(false)
  }

  function handleAuth(_token, userData) {
    setUser(userData)
    setShowAuth(false)
  }

  function handleLogout() {
    localStorage.removeItem('ct_token')
    setUser(null)
  }

  if (showLanding) {
    return (
      <AnimatePresence>
        <motion.div key="landing" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Landing onEnter={() => setShowLanding(false)} />
        </motion.div>
      </AnimatePresence>
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

      {/* Sidebar — fixed on mobile, static on desktop */}
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-glow">
                <Activity size={14} className="text-bg" />
              </div>
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

        {/* Sidebar controls */}
        <div className="px-4 pb-6 space-y-4 border-t border-outline pt-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal size={13} className="text-muted" />
              <span className="text-xs text-muted uppercase tracking-wide font-medium">KB Sources</span>
              <span className="ml-auto text-xs font-bold text-accent">{k}</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
          </div>

          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            dbReady
              ? 'border-accent/25 bg-accent/10 text-accent'
              : 'border-accent2/25 bg-accent2/10 text-accent2'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dbReady ? 'bg-accent animate-pulse-slow' : 'bg-accent2'}`} />
            {dbReady ? 'Database connected' : 'Database offline'}
          </div>

          <div className="flex items-start gap-2 text-xs text-muted px-1">
            <AlertTriangle size={12} className="text-accent3 shrink-0 mt-0.5" />
            <span>Severe symptoms or major trauma: seek professional evaluation.</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 pb-16 md:pb-0">
        {/* Top bar */}
        <header className="border-b border-outline px-4 md:px-8 py-4 flex items-center justify-between bg-panel2/40 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted hover:text-text p-1"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base md:text-xl font-bold text-text">
                {TABS.find((t) => t.id === activeTab)?.label}
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
          <AnimatePresence mode="sync">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'triage' && <TriageTab k={k} />}
              {activeTab === 'chat' && <ChatTab k={k} />}
              {activeTab === 'history' && (
                <HistoryTab
                  dbReady={dbReady}
                  user={user}
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
