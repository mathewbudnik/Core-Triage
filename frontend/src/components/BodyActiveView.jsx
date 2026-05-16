import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { EXERCISES } from '../data/exercises'
import { rehabProgress } from '../lib/rehabHeuristic'
import BodyStatusPills from './BodyStatusPills'
import BodyExerciseCard from './BodyExerciseCard'

/**
 * Renders when the user has an active triage. Sticky header with greeting +
 * status pills + today's progress bar, scrollable exercise list, sticky
 * bottom off-ramp for "something new hurts?".
 *
 * Props:
 *   triage:    { id, injury_area, created_at }
 *   checked:   Set<string>                — exercise_keys checked today
 *   onToggle:  (exerciseKey, region, phase) => void
 */
export default function BodyActiveView({ triage, checked, onToggle }) {
  const navigate = useNavigate()
  const region = triage.injury_area
  const rp = rehabProgress(triage.created_at)
  const phase = rp?.phase ?? 1

  // The exercise list for the user's current phase. Composite key per exercise:
  // "<region>:<phase>:<name>" — same shape stored in rehab_progress.
  const exercises = useMemo(() => {
    const list = EXERCISES[region]?.[phase] || []
    return list.map((ex) => ({
      ...ex,
      _key: `${region}:${phase}:${ex.name}`,
    }))
  }, [region, phase])

  const doneCount = exercises.filter((e) => checked.has(e._key)).length
  const totalCount = exercises.length || 1
  const pctDone = doneCount / totalCount

  const pills = [
    { key: 'active',   label: 'Active',                  tone: 'coral', live: true },
    { key: 'phase',    label: `Phase ${phase} · D${rp?.dayInPhase ?? 1}`, tone: 'teal' },
    { key: 'progress', label: `${doneCount} / ${exercises.length} today`, tone: 'gold' },
  ]
  if (phase === 1 && rp) {
    pills.push({ key: 'left', label: `${Math.max(0, rp.phaseLength - rp.dayInPhase)} days left`, tone: 'muted' })
  }

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mt-px
                      bg-[linear-gradient(180deg,rgba(11,18,32,1)_0%,rgba(11,18,32,0.96)_70%,rgba(11,18,32,0.85)_100%)]
                      backdrop-blur-md border-b border-outline/60 px-4 pt-5 pb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-accent mb-1">Body</p>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight mb-1">
          {region} · Phase {phase}
        </h1>
        <p className="text-xs text-muted mb-3">
          Day {rp?.dayInPhase ?? 1} of {rp?.phaseLength ?? 14} · pain at or below 3/10.
        </p>

        <BodyStatusPills pills={pills} />

        <div className="mt-3 px-3 py-2.5 rounded-xl bg-panel2/60 border border-outline/60">
          <div className="flex justify-between text-[11px] text-muted mb-1.5">
            <span>Today's progress</span>
            <strong className="text-text font-bold">{doneCount} / {exercises.length}</strong>
          </div>
          <div className="w-full h-[5px] rounded-full bg-text/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(pctDone * 100)}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-accent to-[#7dd3c0]
                         shadow-[0_0_12px_rgba(20,184,166,0.6)]"
            />
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="px-4 pt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted mb-2.5">
          Today · resets at midnight
        </p>
        <div className="space-y-2">
          {exercises.map((ex) => (
            <BodyExerciseCard
              key={ex._key}
              exercise={ex}
              checked={checked.has(ex._key)}
              onToggle={() => onToggle(ex._key, region, phase)}
            />
          ))}
        </div>

        {exercises.length === 0 && (
          <p className="text-center text-sm text-muted py-8">
            No exercises configured for {region} · Phase {phase} yet.
          </p>
        )}
      </div>

      {/* Sticky off-ramp at the bottom. Offsets:
            - mobile (<md): bottom-16 clears the mobile bottom-nav (h-16)
            - desktop (md+): bottom-3 — no bottom-nav, sit close to the edge
            - md:left-64 accounts for the w-64 sidebar so the bar centers in
              the main-content column, not the full viewport */}
      <div className="fixed bottom-16 md:bottom-3 left-0 md:left-64 right-0 z-20 px-4
                      pb-[calc(0.5rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate('/triage')}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl
                       bg-accent2/[0.10] border border-accent2/30 backdrop-blur-md
                       hover:bg-accent2/[0.14] transition text-left"
          >
            <span>
              <span className="block text-[13px] font-bold text-text">Something new hurts?</span>
              <span className="block text-[11px] text-muted mt-0.5">
                Quick screen — keeps your current plan.
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-accent2 shrink-0">
              Screen <ArrowRight size={13} strokeWidth={2.6} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
