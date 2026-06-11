import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'
import Eyebrow from './ui/Eyebrow'
import { EXERCISES } from '../data/exercises'
import { rehabProgress } from '../lib/rehabHeuristic'
import RecoverStatusPills from './RecoverStatusPills'
import RecoverExerciseCard from './RecoverExerciseCard'
import TriageDiagnosis from './TriageDiagnosis'
import SavedToHistoryBanner from './SavedToHistoryBanner'

/**
 * Renders when the user has an active triage. Sticky header with greeting +
 * status pills + today's progress bar, scrollable diagnosis + exercise list,
 * sticky bottom off-ramp for "something new hurts?".
 *
 * Layout adapts to two real states:
 *   - Has structured rehab exercises: shows progress bar + checklist
 *   - No exercises configured for this region/phase: hides progress
 *     scaffolding and lets the diagnosis + action plan stand alone
 *
 * Props:
 *   triage:         { id, injury_area, created_at }
 *   diagnosis:      optional rich triage result (matches_if, buckets, plan)
 *   diagnosisForm:  { region, severity, onset } context for the hero pills
 *   savedSessionId: optional id of the just-written /api/sessions row —
 *                   drives the "Saved to history. Undo?" banner.
 *   signedIn:       boolean — gates the "sign in to save" nudge
 *   checked:        Set<string> — exercise_keys checked today
 *   onToggle:       (exerciseKey, region, phase) => void
 */
export default function RecoverActiveView({
  triage,
  diagnosis,
  diagnosisForm,
  savedSessionId = null,
  signedIn,
  onLoginClick,
  checked,
  onToggle,
}) {
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

  const hasExercises = exercises.length > 0
  const doneCount = exercises.filter((e) => checked.has(e._key)).length
  const pctDone = hasExercises ? doneCount / exercises.length : 0

  const pills = [
    { key: 'active', label: 'Active', tone: 'coral', live: true },
    { key: 'phase',  label: `Phase ${phase} · D${rp?.dayInPhase ?? 1}`, tone: 'teal' },
  ]
  if (hasExercises) {
    pills.push({ key: 'progress', label: `${doneCount} / ${exercises.length} today`, tone: 'gold' })
  }
  if (phase === 1 && rp) {
    pills.push({ key: 'left', label: `${Math.max(0, rp.phaseLength - rp.dayInPhase)} days left`, tone: 'muted' })
  }

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mt-px
                      bg-[linear-gradient(180deg,rgba(11,18,32,1)_0%,rgba(11,18,32,0.96)_70%,rgba(11,18,32,0.85)_100%)]
                      backdrop-blur-md border-b border-outline/60 px-4 pt-5 pb-3">
        <Eyebrow className="mb-1">Recover</Eyebrow>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight mb-1 text-ct-cream">
          {region}{hasExercises ? ` · Phase ${phase}` : ''}
        </h1>
        <p className="text-xs text-ink-soft mb-3">
          {hasExercises
            ? `Day ${rp?.dayInPhase ?? 1} of ${rp?.phaseLength ?? 14} · pain at or below 3/10.`
            : 'Read your guidance below and follow the action plan.'}
        </p>

        <RecoverStatusPills pills={pills} />

        {hasExercises && (
          <div className="mt-3 px-3 py-2.5 rounded-xl bg-panel2/60 border border-outline/60">
            <div className="flex justify-between text-[11px] text-ink-soft mb-1.5">
              <span>Today's progress</span>
              <strong className="text-ct-cream font-bold">{doneCount} / {exercises.length}</strong>
            </div>
            <div className="w-full h-[5px] rounded-full bg-text/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(pctDone * 100)}%` }}
                transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-accent to-[#7dd3c0]
                           shadow-[0_0_12px_rgba(20,184,166,0.6)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Diagnosis (present after a fresh submit, persisted via sessionStorage) */}
      {diagnosis && (
        <div className="px-4 pt-4">
          <Eyebrow className="mb-2.5">Your guidance</Eyebrow>
          <TriageDiagnosis result={diagnosis} form={diagnosisForm} />

          {/* Saved-to-history confirmation with Undo. Renders only for
              signed-in users with a saved row id; anonymous users get the
              sign-in nudge below instead. */}
          {signedIn && savedSessionId && (
            <div className="mt-3">
              <SavedToHistoryBanner sessionId={savedSessionId} />
            </div>
          )}

          {/* Sign-in nudge — only when we have a result the user could lose */}
          {!signedIn && onLoginClick && (
            <button
              type="button"
              onClick={onLoginClick}
              className="mt-3 w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl
                         bg-accent/8 border border-accent/30 hover:bg-accent/12 transition text-left"
            >
              <span className="flex items-start gap-2.5 min-w-0">
                <LogIn size={14} className="text-accent shrink-0 mt-0.5" strokeWidth={2.4} />
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold text-ct-cream">Save this plan</span>
                  <span className="block text-[11px] text-ink-soft mt-0.5 leading-snug">
                    Sign in to track progress, daily check-offs, and history.
                  </span>
                </span>
              </span>
              <ArrowRight size={13} className="text-accent shrink-0" strokeWidth={2.6} />
            </button>
          )}
        </div>
      )}

      {/* Exercise list — only when we have something to list */}
      {hasExercises && (
        <div className="px-4 pt-4">
          <Eyebrow className="mb-2.5">Today · resets at midnight</Eyebrow>
          <div className="space-y-2">
            {exercises.map((ex) => (
              <RecoverExerciseCard
                key={ex._key}
                exercise={ex}
                checked={checked.has(ex._key)}
                onToggle={() => onToggle(ex._key, region, phase)}
              />
            ))}
          </div>
        </div>
      )}

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
              <span className="block text-[13px] font-bold text-ct-cream">Something new hurts?</span>
              <span className="block text-[11px] text-ink-soft mt-0.5">
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
