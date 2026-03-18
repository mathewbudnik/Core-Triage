import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, MessageSquare, Clock, Info, AlertTriangle, SlidersHorizontal } from 'lucide-react'
import { getHealth } from './api'
import TriageTab from './components/TriageTab'
import ChatTab from './components/ChatTab'
import HistoryTab from './components/HistoryTab'
import AboutTab from './components/AboutTab'

const TABS = [
  { id: 'triage', label: 'Triage', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'about', label: 'About', icon: Info },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('triage')
  const [k, setK] = useState(4)
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    getHealth()
      .then((data) => setDbReady(data.db_ready))
      .catch(() => setDbReady(false))
  }, [])

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-accent2/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-accent3/6 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-outline bg-panel2/60 backdrop-blur-sm relative z-10">
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 border-b border-outline">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-glow">
              <Activity size={14} className="text-bg" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
              CoreTriage
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
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
                onClick={() => setActiveTab(id)}
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
          {/* KB slider */}
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

          {/* DB status */}
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            dbReady
              ? 'border-accent/25 bg-accent/10 text-accent'
              : 'border-accent2/25 bg-accent2/10 text-accent2'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dbReady ? 'bg-accent animate-pulse-slow' : 'bg-accent2'}`} />
            {dbReady ? 'Database connected' : 'Database offline'}
          </div>

          {/* Safety notice */}
          <div className="flex items-start gap-2 text-xs text-muted px-1">
            <AlertTriangle size={12} className="text-accent3 shrink-0 mt-0.5" />
            <span>Severe symptoms or major trauma: seek professional evaluation.</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top bar */}
        <header className="border-b border-outline px-8 py-4 flex items-center justify-between bg-panel2/40 backdrop-blur-sm">
          <div>
            <h1 className="text-xl font-bold text-text">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-muted mt-0.5">Educational climbing injury guidance · Not a medical diagnosis</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted bg-panel border border-outline px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
            Educational only
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'triage' && <TriageTab k={k} />}
              {activeTab === 'chat' && <ChatTab k={k} />}
              {activeTab === 'history' && <HistoryTab dbReady={dbReady} />}
              {activeTab === 'about' && <AboutTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
