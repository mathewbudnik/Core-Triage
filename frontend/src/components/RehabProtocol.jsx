import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock, Repeat, Zap } from 'lucide-react'
import { getExercises } from '../data/exercises'
import UpgradeModal from './UpgradeModal'

const PHASE_LABELS = {
  1: { name: 'Phase 1', sub: 'Start here — gentle movement while healing', weeks: 'Weeks 1–2' },
  2: { name: 'Phase 2', sub: 'Build strength — when Phase 1 feels easy', weeks: 'Weeks 3–6' },
  3: { name: 'Phase 3', sub: 'Get back climbing', weeks: 'Week 7+' },
}

function canAccessPhase(phase, user) {
  if (phase === 1) return true
  return user?.tier === 'core' || user?.tier === 'pro'
}

function ExerciseCard({ exercise, index }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-panel border border-outline rounded-xl overflow-hidden"
    >
      {/* Card header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-panel2/50 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-accent">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text leading-tight">{exercise.name}</p>
          <p className="text-[11px] text-muted mt-0.5">{exercise.area}</p>
          {/* Quick stats row */}
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <Repeat size={9} className="text-accent/60" />
              {exercise.sets} sets · {exercise.reps}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <Clock size={9} className="text-accent2/60" />
              {exercise.frequency}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-muted mt-1">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-outline pt-3">
              <p className="text-xs text-muted leading-relaxed italic">{exercise.rationale}</p>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-accent uppercase tracking-wide mb-0.5">What it should feel like</p>
                    <p className="text-xs text-muted">{exercise.feel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <AlertTriangle size={12} className="text-accent2 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-accent2 uppercase tracking-wide mb-0.5">Stop if</p>
                    <p className="text-xs text-muted">{exercise.red_flags}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Zap size={12} className="text-accent3 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-accent3 uppercase tracking-wide mb-0.5">Progress when</p>
                    <p className="text-xs text-muted">{exercise.progression_trigger}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function PhaseLockGate({ onUpgrade }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
        <Lock size={20} className="text-accent" />
      </div>
      <div>
        <p className="text-sm font-semibold text-text">Pro Subscription Required</p>
        <p className="text-xs text-muted mt-1 max-w-xs">
          Phase 2 &amp; 3 progressions are part of Pro — full periodized protocols mapped to your injury, $10/mo.
        </p>
      </div>
      <button onClick={onUpgrade} className="btn-primary text-sm">
        Upgrade to Pro
      </button>
    </div>
  )
}

export default function RehabProtocol({ region, severity, user, compact = false }) {
  const [activePhase, setActivePhase] = useState(1)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const exercises = getExercises(region, activePhase)
  const hasAccess = canAccessPhase(activePhase, user)

  function handlePhaseClick(phase) {
    if (!canAccessPhase(phase, user)) {
      setShowUpgrade(true)
      return
    }
    setActivePhase(phase)
  }

  const severityNote =
    severity === 'severe'
      ? 'Your injury sounds significant — stick with Phase 1 until you can move without sharp pain. See a provider before advancing.'
      : severity === 'moderate'
      ? 'Start with Phase 1. Move to Phase 2 once all Phase 1 exercises feel comfortable and pain-free for 5 days.'
      : severity === 'mild'
      ? 'Great — you can work through Phase 1 quickly. Advance to Phase 2 as soon as Phase 1 feels easy.'
      : null

  return (
    <div className="space-y-4">
      {/* Header */}
      {!compact && (
        <div>
          <h3 className="text-sm font-bold text-text">
            Rehab Protocol — {region}
          </h3>
          {severity && (
            <p className="text-xs text-muted mt-0.5">Based on: {severity} presentation</p>
          )}
        </div>
      )}

      {/* Severity advisory */}
      {severityNote && (
        <div className="flex items-start gap-2 bg-accent3/8 border border-accent3/20 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="text-accent3 shrink-0 mt-0.5" />
          <p className="text-[11px] text-accent3/90">{severityNote}</p>
        </div>
      )}

      {/* Phase tabs */}
      <div className="flex gap-1 bg-panel rounded-xl p-1 border border-outline">
        {[1, 2, 3].map((phase) => {
          const { name, weeks } = PHASE_LABELS[phase]
          const active = activePhase === phase
          const locked = !canAccessPhase(phase, user)
          return (
            <button
              key={phase}
              onClick={() => handlePhaseClick(phase)}
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                active
                  ? 'bg-panel2 text-accent shadow border border-accent/20'
                  : locked
                  ? 'text-muted/50 hover:text-muted'
                  : 'text-muted hover:text-text'
              }`}
            >
              <span className="flex items-center gap-1">
                {locked && <Lock size={9} className="opacity-60" />}
                {name}
              </span>
              <span className="text-[9px] font-normal opacity-70">{weeks}</span>
            </button>
          )
        })}
      </div>

      {/* Phase subtitle */}
      <div>
        <p className="text-xs font-semibold text-text">{PHASE_LABELS[activePhase].sub}</p>
        <p className="text-[11px] text-muted">{PHASE_LABELS[activePhase].weeks} · {exercises.length} exercises</p>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {hasAccess ? (
          <motion.div
            key={activePhase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-2"
          >
            {exercises.map((ex, i) => (
              <ExerciseCard key={ex.name} exercise={ex} index={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PhaseLockGate onUpgrade={() => setShowUpgrade(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpgrade && (
          <UpgradeModal onClose={() => setShowUpgrade(false)} trigger="phase" />
        )}
      </AnimatePresence>
    </div>
  )
}
