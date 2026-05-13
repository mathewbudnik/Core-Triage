import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ChevronDown, Clock, Flame, RefreshCw, Target, Tag, PlayCircle } from 'lucide-react'
import TrainingLogEntry from './TrainingLogEntry'
import { buildExerciseVideoUrl } from '../data/exercises'

const TYPE_COLOR = {
  hangboard: 'text-accent border-accent/40 bg-accent/8',
  power:     'text-accent2 border-accent2/40 bg-accent2/8',
  project:   'text-accent3 border-accent3/40 bg-accent3/8',
  strength:  'text-accent border-accent/30 bg-accent/6',
  endurance: 'text-accent2 border-accent2/30 bg-accent2/6',
  technique: 'text-accent3 border-accent3/30 bg-accent3/6',
  rest:      'text-muted border-outline bg-panel',
}

const TYPE_LABEL = {
  hangboard: 'Hangboard',
  power:     'Power',
  project:   'Project',
  strength:  'Strength',
  endurance: 'Endurance',
  technique: 'Technique',
  rest:      'Rest',
}

function sessionDate(plan, session) {
  const start = new Date(plan.start_date + 'T00:00:00')
  const daysPerWeek = plan.plan_data?.days_per_week || 3
  const week = session.week - 1
  const dayInWeek = session.day_in_week - 1
  // Distribute sessions across real calendar days, spacing them out
  const dayOffset = week * 7 + Math.round(dayInWeek * (7 / daysPerWeek))
  const d = new Date(start)
  d.setDate(d.getDate() + dayOffset)
  return d
}

function isToday(d) {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

function isPast(d) {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return d < t
}

function ExerciseCard({ ex }) {
  return (
    <div className="rounded-lg border border-outline bg-panel p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-text">{ex.exercise}</p>
        <span className="text-xs text-muted shrink-0">{ex.sets}× {ex.reps}</span>
      </div>
      <p className="text-xs text-muted">{ex.detail}</p>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-accent3">Rest {ex.rest_seconds}s</span>
        <span className="text-muted">· {ex.effort_note}</span>
      </div>
      <a
        href={buildExerciseVideoUrl(ex)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/20 hover:border-accent/50 transition-colors"
      >
        <PlayCircle size={14} />
        Watch demo
      </a>
      {ex.benchmark && (
        <p className="text-xs text-muted/70 italic border-t border-outline pt-1.5 mt-1">{ex.benchmark}</p>
      )}
    </div>
  )
}

function SessionDetail({ session, plan, onLogSaved }) {
  const [logOpen, setLogOpen] = useState(false)
  const d = sessionDate(plan, session)
  const past = isPast(d)
  const today = isToday(d)
  const color = TYPE_COLOR[session.type] || TYPE_COLOR.rest

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${color} p-4 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wide ${color.split(' ')[0]}`}>
              {TYPE_LABEL[session.type] || session.type}
            </span>
            {today && (
              <span className="text-xs bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 rounded-full font-medium">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            Week {session.week} · {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Clock size={12} />
          {session.duration_min} min
        </div>
      </div>

      {/* Coach note */}
      {session.coach_note && (
        <p className="text-xs text-muted/80 italic border-l-2 border-accent/30 pl-3">{session.coach_note}</p>
      )}

      {/* Warm-up */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Warm-up</p>
        <ul className="space-y-1">
          {session.warm_up.map((w, i) => (
            <li key={i} className="text-xs text-muted flex gap-2">
              <span className="text-accent/50 shrink-0">·</span>{w}
            </li>
          ))}
        </ul>
      </div>

      {/* Main blocks */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Main session</p>
        <div className="space-y-2">
          {session.main.map((ex, i) => (
            <ExerciseCard key={i} ex={ex} />
          ))}
        </div>
      </div>

      {/* Cool-down */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Cool-down</p>
        <ul className="space-y-1">
          {session.cool_down.map((c, i) => (
            <li key={i} className="text-xs text-muted flex gap-2">
              <span className="text-accent/50 shrink-0">·</span>{c}
            </li>
          ))}
        </ul>
      </div>

      {/* Log button */}
      {!logOpen ? (
        <button
          onClick={() => setLogOpen(true)}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          <Flame size={14} />
          Log this session
        </button>
      ) : (
        <TrainingLogEntry
          sessionType={session.type}
          onSave={() => { setLogOpen(false); onLogSaved?.() }}
          onCancel={() => setLogOpen(false)}
        />
      )}
    </motion.div>
  )
}

function SessionCard({ session, plan, isSelected, onClick }) {
  const d = sessionDate(plan, session)
  const today = isToday(d)
  const past = isPast(d)
  const color = TYPE_COLOR[session.type] || TYPE_COLOR.rest

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-3 py-3 transition-all duration-200 ${
        isSelected
          ? color
          : today
          ? 'border-accent/40 bg-accent/5'
          : 'border-outline bg-panel hover:border-outline/80'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-semibold truncate ${isSelected ? color.split(' ')[0] : today ? 'text-accent' : 'text-text/70'}`}>
            {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            {today && <span className="ml-2 text-accent font-bold">· Today</span>}
          </p>
          <p className="text-xs text-muted mt-0.5">{TYPE_LABEL[session.type] || session.type} · {session.duration_min} min</p>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform ${isSelected ? 'rotate-180' : ''}`}
        />
      </div>
    </button>
  )
}

const WEEK_ACCENT = ['text-accent border-accent/30 bg-accent/8', 'text-accent2 border-accent2/30 bg-accent2/8', 'text-accent3 border-accent3/30 bg-accent3/8', 'text-accent border-accent/20 bg-accent/5']

function WeekSummary({ meta, week, weekSessions }) {
  if (!meta) return null
  const totalMin = weekSessions.reduce((sum, s) => sum + (s.duration_min || 0), 0)
  const accent = WEEK_ACCENT[(week - 1) % WEEK_ACCENT.length]
  const accentColor = accent.split(' ')[0]
  const isDeload = week === 4

  return (
    <motion.div
      key={week}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border p-4 space-y-3 ${accent}`}
    >
      {/* Week goal line */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target size={14} className={accentColor} />
          <p className={`text-sm font-bold ${accentColor}`}>{meta.goal}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted shrink-0">
          <span className="flex items-center gap-1"><Clock size={11} />{totalMin} min total</span>
          <span>{weekSessions.length} session{weekSessions.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted leading-relaxed">{meta.desc}</p>

      {/* Focus tags */}
      {meta.focus_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {meta.focus_tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-outline bg-panel text-muted"
            >
              <Tag size={8} />
              {tag}
            </span>
          ))}
          {isDeload && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-accent3/30 bg-accent3/10 text-accent3">
              Deload week
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function PlanView({ plan, onRefresh, onSessionLogged }) {
  const sessions = plan?.plan_data?.sessions || []
  const totalWeeks = plan?.duration_weeks || 4
  const weekMeta = plan?.plan_data?.week_meta || []

  const [currentWeek, setCurrentWeek] = useState(() => {
    // Default to the week that contains today
    const start = new Date(plan.start_date + 'T00:00:00')
    const now = new Date()
    const diffDays = Math.floor((now - start) / 86400000)
    const week = Math.max(1, Math.min(totalWeeks, Math.floor(diffDays / 7) + 1))
    return week
  })
  const [selectedIdx, setSelectedIdx] = useState(null)

  const weekSessions = useMemo(
    () => sessions.filter((s) => s.week === currentWeek),
    [sessions, currentWeek]
  )

  const selectedSession = selectedIdx !== null ? weekSessions[selectedIdx] : null

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <div className="rounded-xl border border-outline bg-panel px-4 py-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-text">{plan.name}</p>
          <p className="text-xs text-muted mt-0.5">
            {plan.duration_weeks}-week {plan.phase} phase · Started {new Date(plan.start_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          {plan.plan_data?.injury_note && (
            <p className="text-xs text-accent3 mt-1">{plan.plan_data.injury_note}</p>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="text-muted hover:text-text shrink-0 mt-0.5"
          title="Refresh plan"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCurrentWeek((w) => Math.max(1, w - 1)); setSelectedIdx(null) }}
          disabled={currentWeek === 1}
          className="p-1.5 rounded-lg border border-outline text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-text">Week {currentWeek}</p>
          <p className="text-xs text-muted">of {totalWeeks} {currentWeek === totalWeeks ? '· Deload week' : ''}</p>
        </div>
        <button
          onClick={() => { setCurrentWeek((w) => Math.min(totalWeeks, w + 1)); setSelectedIdx(null) }}
          disabled={currentWeek === totalWeeks}
          className="p-1.5 rounded-lg border border-outline text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week summary */}
      <AnimatePresence mode="wait">
        <WeekSummary
          key={currentWeek}
          meta={weekMeta[currentWeek - 1]}
          week={currentWeek}
          weekSessions={weekSessions}
        />
      </AnimatePresence>

      {/* Sessions list */}
      <div className="space-y-2">
        {weekSessions.map((session, idx) => (
          <div key={session.session_index}>
            <SessionCard
              session={session}
              plan={plan}
              isSelected={selectedIdx === idx}
              onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
            />
            <AnimatePresence>
              {selectedIdx === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <SessionDetail
                      session={session}
                      plan={plan}
                      onLogSaved={() => {
                        setSelectedIdx(null)
                        onSessionLogged?.()
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {weekSessions.length === 0 && (
          <p className="text-sm text-muted text-center py-8">No sessions planned for this week.</p>
        )}
      </div>
    </div>
  )
}
