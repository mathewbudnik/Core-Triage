import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Trash2, AlertTriangle, Database, RefreshCw, Loader2, LogIn } from 'lucide-react'
import { getSessions, fetchSession, deleteSession } from '../api'

const PAIN_COLOR = (level) => {
  if (level <= 3) return 'text-accent bg-accent/10 border-accent/25'
  if (level <= 6) return 'text-accent3 bg-accent3/10 border-accent3/25'
  return 'text-accent2 bg-accent2/10 border-accent2/25'
}

export default function HistoryTab({ dbReady, user, onLoginClick }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    if (!dbReady || !user) return
    setLoading(true)
    setError(null)
    try {
      const data = await getSessions(50)
      setSessions(data.map((s) => ({ ...s, formattedDate: new Date(s.created_at).toLocaleString() })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [dbReady, user])

  async function handleSelect(id) {
    setSelectedId(id)
    try {
      const data = await fetchSession(id)
      setSelected(data)
    } catch (err) {
      setSelected(null)
    }
  }

  async function handleDelete() {
    if (!selectedId) return
    setDeleting(true)
    try {
      await deleteSession(selectedId)
      setSelectedId(null)
      setSelected(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const selectedDate = useMemo(
    () => selected ? new Date(selected.created_at).toLocaleString() : null,
    [selected]
  )

  if (!dbReady) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent2/10 border border-accent2/25 flex items-center justify-center">
          <Database size={24} className="text-accent2" />
        </div>
        <div>
          <p className="font-semibold text-text">History temporarily unavailable</p>
          <p className="text-sm text-muted mt-1">We can't load saved sessions right now. Please try again in a moment.</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center">
          <Clock size={24} className="text-accent" />
        </div>
        <div>
          <p className="font-semibold text-text">Sign in to view your history</p>
          <p className="text-sm text-muted mt-1 max-w-xs">
            Create a free account to save triage sessions and track your injuries over time.
            Your history is private and only visible to you.
          </p>
        </div>
        <button onClick={onLoginClick} className="btn-primary flex items-center gap-2">
          <LogIn size={15} />
          Log in or create account
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-accent" />
          <span className="text-sm font-medium text-text">
            {sessions.length} saved session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-1.5 text-xs">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-accent2/10 border border-accent2/30 rounded-xl px-4 py-3 text-accent2 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Clock size={32} className="text-muted" />
          <p className="text-muted text-sm">No saved sessions yet. Generate guidance and click Save to History.</p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Session list */}
          <div className="lg:col-span-3 space-y-2">
            <AnimatePresence>
              {sessions.map((s, i) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleSelect(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                    selectedId === s.id
                      ? 'border-accent/40 bg-accent/10 shadow-glow'
                      : 'border-outline bg-panel hover:border-accent/25 hover:bg-panel/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted">#{s.id}</span>
                      <span className="text-sm font-medium text-text">{s.injury_area}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PAIN_COLOR(s.pain_level)}`}>
                        {s.pain_level}/10
                      </span>
                    </div>
                    <span className="text-xs text-muted">{s.onset}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted">{s.pain_type}</span>
                    <span className="text-xs text-muted/50">·</span>
                    <span className="text-xs text-muted">{s.formattedDate}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="card space-y-4 sticky top-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text">Session #{selected.id}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PAIN_COLOR(selected.pain_level)}`}>
                      Pain {selected.pain_level}/10
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      ['Injury area', selected.injury_area],
                      ['Pain type', selected.pain_type],
                      ['Onset', selected.onset],
                      ['Saved', selectedDate],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted">{label}</span>
                        <span className="text-text font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn-danger w-full flex items-center justify-center gap-2"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deleting ? 'Deleting...' : 'Delete Session'}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-32 text-center text-muted text-sm border border-outline rounded-xl border-dashed"
                >
                  Select a session to view details
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
