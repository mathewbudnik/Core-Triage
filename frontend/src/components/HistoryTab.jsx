import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Clock, Trash2, AlertTriangle, Database, RefreshCw, Loader2, LogIn,
  Dumbbell, Activity,
} from 'lucide-react'
import { getSessions, fetchSession, deleteSession, getTrainingLogs } from '../api'

const PAIN_COLOR = (level) => {
  if (level <= 3) return 'text-accent bg-accent/10 border-accent/25'
  if (level <= 6) return 'text-accent3 bg-accent3/10 border-accent3/25'
  return 'text-accent2 bg-accent2/10 border-accent2/25'
}

// Covers session_type values produced by both PlanView (hangboard, power, …)
// and the manual logger in TrainingLogEntry (bouldering, routes, outdoor, …).
// Unknown values fall back to a title-cased label and the muted "rest" pill.
const SESSION_TYPE_LABEL = {
  hangboard:  'Hangboard',
  power:      'Power',
  project:    'Project',
  strength:   'Strength',
  endurance:  'Endurance',
  technique:  'Technique',
  rest:       'Rest',
  bouldering: 'Bouldering',
  routes:     'Routes',
  outdoor:    'Outdoor',
  other:      'Other',
}

const SESSION_TYPE_COLOR = {
  hangboard:  'text-accent  bg-accent/10  border-accent/25',
  power:      'text-accent2 bg-accent2/10 border-accent2/25',
  project:    'text-accent3 bg-accent3/10 border-accent3/25',
  strength:   'text-accent  bg-accent/10  border-accent/25',
  endurance:  'text-accent2 bg-accent2/10 border-accent2/25',
  technique:  'text-accent3 bg-accent3/10 border-accent3/25',
  rest:       'text-muted   bg-panel       border-outline',
  bouldering: 'text-accent2 bg-accent2/10 border-accent2/25',
  routes:     'text-accent  bg-accent/10  border-accent/25',
  outdoor:    'text-accent3 bg-accent3/10 border-accent3/25',
  other:      'text-muted   bg-panel       border-outline',
}

const typeLabel = (t) =>
  SESSION_TYPE_LABEL[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Session')

const typeColor = (t) => SESSION_TYPE_COLOR[t] || SESSION_TYPE_COLOR.rest

const INTENSITY_COLOR = (n) => {
  if (n == null) return 'text-muted'
  if (n <= 4) return 'text-accent'
  if (n <= 7) return 'text-accent3'
  return 'text-accent2'
}

export default function HistoryTab({ dbReady, user, onLoginClick }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Sub-tab — which list is showing.
  const [view, setView] = useState('triage') // 'triage' | 'training'

  // Selected triage id is URL-driven so /history/42 deep-links cleanly.
  // Training entries don't have a permalink (no detail endpoint), so they
  // expand inline via local state instead.
  const urlIdSeg = location.pathname.replace(/^\/history\/?/, '').split('/')[0]
  const selectedId = urlIdSeg ? Number(urlIdSeg) || null : null

  // ── Triage state ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ── Training state ────────────────────────────────────────────────────────
  const [trainingLogs, setTrainingLogs] = useState([])
  const [loadingTraining, setLoadingTraining] = useState(false)
  const [selectedTrainingId, setSelectedTrainingId] = useState(null)

  async function loadTriage() {
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

  async function loadTraining() {
    if (!dbReady || !user) return
    setLoadingTraining(true)
    setError(null)
    try {
      const data = await getTrainingLogs(50)
      setTrainingLogs(data.map((l) => ({ ...l, formattedDate: new Date(l.created_at).toLocaleString() })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingTraining(false)
    }
  }

  // Triage loads on mount and on auth/db change.
  useEffect(() => { loadTriage() }, [dbReady, user])

  // Training loads on first switch to the training tab and on auth/db change.
  useEffect(() => {
    if (view === 'training') loadTraining()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dbReady, user])

  // Fetch the selected triage record when /history/:id changes.
  useEffect(() => {
    if (!selectedId || !user) {
      setSelected(null)
      return
    }
    let cancelled = false
    fetchSession(selectedId)
      .then((data) => { if (!cancelled) setSelected(data) })
      .catch(() => { if (!cancelled) setSelected(null) })
    return () => { cancelled = true }
  }, [selectedId, user])

  function setActiveView(next) {
    if (next === view) return
    setView(next)
    // Switching away from triage — strip any selected-id from the URL so the
    // user lands on a clean list when they come back.
    if (next === 'training' && selectedId) {
      navigate('/history')
    }
    if (next === 'triage') {
      setSelectedTrainingId(null)
    }
  }

  function handleSelectTriage(id) {
    navigate(`/history/${id}`)
  }

  function handleSelectTraining(id) {
    setSelectedTrainingId((cur) => (cur === id ? null : id))
  }

  async function handleDelete() {
    if (!selectedId) return
    setDeleting(true)
    try {
      await deleteSession(selectedId)
      navigate('/history')
      await loadTriage()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  function handleRefresh() {
    if (view === 'training') loadTraining()
    else loadTriage()
  }

  const selectedDate = useMemo(
    () => selected ? new Date(selected.created_at).toLocaleString() : null,
    [selected]
  )

  const selectedTraining = useMemo(
    () => selectedTrainingId ? trainingLogs.find((l) => l.id === selectedTrainingId) : null,
    [selectedTrainingId, trainingLogs]
  )

  // ── Top-level empty states ────────────────────────────────────────────────
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

  const isTraining = view === 'training'
  const activeLoading = isTraining ? loadingTraining : loading
  const activeCount = isTraining ? trainingLogs.length : sessions.length
  const activeNoun = isTraining ? 'training log' : 'triage session'

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Sub-tab toggle */}
      <div role="tablist" className="grid grid-cols-2 gap-1 bg-panel border border-outline rounded-xl p-1 max-w-sm">
        <button
          role="tab"
          aria-selected={!isTraining}
          onClick={() => setActiveView('triage')}
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${
            !isTraining ? 'bg-panel2 text-accent shadow' : 'text-muted hover:text-text'
          }`}
        >
          <Activity size={13} />
          Triage
        </button>
        <button
          role="tab"
          aria-selected={isTraining}
          onClick={() => setActiveView('training')}
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${
            isTraining ? 'bg-panel2 text-accent shadow' : 'text-muted hover:text-text'
          }`}
        >
          <Dumbbell size={13} />
          Training
        </button>
      </div>

      {/* Count + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isTraining
            ? <Dumbbell size={16} className="text-accent" />
            : <Clock size={16} className="text-accent" />}
          <span className="text-sm font-medium text-text">
            {activeCount} {activeNoun}{activeCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={handleRefresh} disabled={activeLoading} className="btn-secondary flex items-center gap-1.5 text-xs">
          <RefreshCw size={13} className={activeLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-accent2/10 border border-accent2/30 rounded-xl px-4 py-3 text-accent2 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {activeLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      )}

      {/* Empty states per view */}
      {!activeLoading && !isTraining && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Clock size={32} className="text-muted" />
          <p className="text-muted text-sm">No saved triage sessions yet. Generate guidance and click Save to History.</p>
        </div>
      )}

      {!activeLoading && isTraining && trainingLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Dumbbell size={32} className="text-muted" />
          <p className="text-muted text-sm">
            No training logs yet. Log a session from your plan in the Train tab.
          </p>
        </div>
      )}

      {/* ── Triage list + detail ─────────────────────────────────────────── */}
      {!activeLoading && !isTraining && sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-2">
            <AnimatePresence>
              {sessions.map((s, i) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleSelectTriage(s.id)}
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
                      ['Pain type',   selected.pain_type],
                      ['Onset',       selected.onset],
                      ['Saved',       selectedDate],
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

      {/* ── Training list + detail ───────────────────────────────────────── */}
      {!activeLoading && isTraining && trainingLogs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-2">
            <AnimatePresence>
              {trainingLogs.map((l, i) => {
                const color = typeColor(l.session_type)
                const isSel = selectedTrainingId === l.id
                return (
                  <motion.button
                    key={l.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleSelectTraining(l.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                      isSel
                        ? 'border-accent/40 bg-accent/10 shadow-glow'
                        : 'border-outline bg-panel hover:border-accent/25 hover:bg-panel/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-muted">#{l.id}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color} truncate`}>
                          {typeLabel(l.session_type)}
                        </span>
                        <span className="text-sm text-text whitespace-nowrap">{l.duration_min} min</span>
                      </div>
                      <span className={`text-xs font-medium shrink-0 ${INTENSITY_COLOR(l.intensity)}`}>
                        Intensity {l.intensity}/10
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {l.grades_sent && (
                        <>
                          <span className="text-xs text-muted">Grades: {l.grades_sent}</span>
                          <span className="text-xs text-muted/50">·</span>
                        </>
                      )}
                      <span className="text-xs text-muted">{l.date}</span>
                      <span className="text-xs text-muted/50">·</span>
                      <span className="text-xs text-muted">{l.formattedDate}</span>
                    </div>
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedTraining ? (
                <motion.div
                  key={selectedTraining.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="card space-y-4 sticky top-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text">Log #{selectedTraining.id}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeColor(selectedTraining.session_type)}`}>
                      {typeLabel(selectedTraining.session_type)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      ['Date',        selectedTraining.date],
                      ['Duration',    `${selectedTraining.duration_min} min`],
                      ['Intensity',   `${selectedTraining.intensity}/10`],
                      ['Grades sent', selectedTraining.grades_sent || '—'],
                      ['Logged',      selectedTraining.formattedDate],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm gap-3">
                        <span className="text-muted shrink-0">{label}</span>
                        <span className="text-text font-medium text-right">{value}</span>
                      </div>
                    ))}
                  </div>

                  {selectedTraining.notes && (
                    <div className="pt-3 border-t border-outline">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Notes</p>
                      <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{selectedTraining.notes}</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-32 text-center text-muted text-sm border border-outline rounded-xl border-dashed"
                >
                  Select a log to view details
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
