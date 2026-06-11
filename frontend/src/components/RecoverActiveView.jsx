import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'
import Eyebrow from './ui/Eyebrow'
import SegmentNav from './shell/SegmentNav'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { EXERCISES } from '../data/exercises'
import { rehabProgress } from '../lib/rehabHeuristic'
import RecoverStatusPills from './RecoverStatusPills'
import RecoverExerciseCard from './RecoverExerciseCard'
import TriageDiagnosis from './TriageDiagnosis'
import SavedToHistoryBanner from './SavedToHistoryBanner'

const SEG_TRANSITION = { duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }

/**
 * Renders when the user has an active triage. A framed compact hero card
 * (region + phase + stat strip) stays pinned; below it the plan, exercise
 * list, and progress lay out as Almanac field-cards.
 *
 * Layout adapts to two real states:
 *   - Has structured rehab exercises: shows progress bar + checklist
 *   - No exercises configured for this region/phase: hides progress
 *     scaffolding and lets the diagnosis + action plan stand alone
 *
 * On mobile, when there are exercises, a frosted SegmentNav swaps between
 * compact sections (Plan / Exercises / Progress); on desktop the sections
 * lay out in a 2-column grid. The rehab phase / check-in / completion logic
 * and data are unchanged.
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
  const isDesktop = useIsDesktop()
  const [seg, setSeg] = useState('plan')
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
    { key: 'active', label: 'Active', tone: 'sage', live: true },
    { key: 'phase',  label: `Phase ${phase} · D${rp?.dayInPhase ?? 1}`, tone: 'clay' },
  ]
  if (hasExercises) {
    pills.push({ key: 'progress', label: `${doneCount} / ${exercises.length} today`, tone: 'ochre' })
  }
  if (phase === 1 && rp) {
    pills.push({ key: 'left', label: `${Math.max(0, rp.phaseLength - rp.dayInPhase)} days left`, tone: 'muted' })
  }

  // Hero: framed compact card with region + phase + stat strip.
  const hero = (
    <section className="ct-surface-hero rounded-2xl p-4 md:p-5 mb-4">
      <Eyebrow className="mb-1">Recover</Eyebrow>
      <h1 className="text-[24px] md:text-[26px] font-serif font-semibold leading-tight tracking-tight mb-1 text-ink">
        {region}{hasExercises ? ` · Phase ${phase}` : ''}
      </h1>
      <p className="text-xs text-ink-soft mb-3">
        {hasExercises
          ? `Day ${rp?.dayInPhase ?? 1} of ${rp?.phaseLength ?? 14} · pain at or below 3/10.`
          : 'Read your guidance below and follow the action plan.'}
      </p>

      <RecoverStatusPills pills={pills} />

      {hasExercises && (
        <div className="mt-3 px-3 py-2.5 rounded-xl bg-paper border border-ct-hairline">
          <div className="flex justify-between text-[11px] text-ink-soft mb-1.5">
            <span>Today's progress</span>
            <strong className="text-ink font-bold">{doneCount} / {exercises.length}</strong>
          </div>
          <div className="w-full h-[6px] rounded-full bg-[rgba(42,39,34,0.12)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(pctDone * 100)}%` }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-clay to-ochre"
            />
          </div>
        </div>
      )}
    </section>
  )

  // Plan section: diagnosis guidance + save/sign-in affordances.
  const planSection = diagnosis ? (
    <div className="space-y-3">
      <Eyebrow>Your guidance</Eyebrow>
      <TriageDiagnosis result={diagnosis} form={diagnosisForm} />

      {/* Saved-to-history confirmation with Undo. Renders only for
          signed-in users with a saved row id; anonymous users get the
          sign-in nudge below instead. */}
      {signedIn && savedSessionId && (
        <SavedToHistoryBanner sessionId={savedSessionId} />
      )}

      {/* Sign-in nudge — only when we have a result the user could lose */}
      {!signedIn && onLoginClick && (
        <button
          type="button"
          onClick={onLoginClick}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl
                     ct-surface hover:border-clay/50 transition-colors text-left"
        >
          <span className="flex items-start gap-2.5 min-w-0">
            <LogIn size={14} className="text-clay-deep shrink-0 mt-0.5" strokeWidth={2.4} />
            <span className="min-w-0">
              <span className="block text-[12px] font-bold text-ink">Save this plan</span>
              <span className="block text-[11px] text-ink-soft mt-0.5 leading-snug">
                Sign in to track progress, daily check-offs, and history.
              </span>
            </span>
          </span>
          <ArrowRight size={13} className="text-clay-deep shrink-0" strokeWidth={2.6} />
        </button>
      )}
    </div>
  ) : null

  // Exercises section: staggered list of field-cards.
  const exercisesSection = hasExercises ? (
    <div className="space-y-2.5">
      <Eyebrow>Today · resets at midnight</Eyebrow>
      <motion.div
        className="space-y-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden:  {},
          visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
        }}
      >
        {exercises.map((ex) => (
          <motion.div
            key={ex._key}
            variants={{
              hidden:  { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.16, ease: [0.2, 0.7, 0.2, 1] } },
            }}
          >
            <RecoverExerciseCard
              exercise={ex}
              checked={checked.has(ex._key)}
              onToggle={() => onToggle(ex._key, region, phase)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  ) : null

  // Progress section: phase / day / completion summary.
  const progressSection = hasExercises ? (
    <div className="space-y-2.5">
      <Eyebrow>Where you are</Eyebrow>
      <div className="ct-surface rounded-2xl p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-ink-soft">Phase</span>
          <span className="text-sm font-semibold text-ink">Phase {phase} · Day {rp?.dayInPhase ?? 1}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-ink-soft">Today</span>
          <span className="text-sm font-semibold text-ink">{doneCount} / {exercises.length} done</span>
        </div>
        {phase === 1 && rp && (
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-ink-soft">Phase 1 ends in</span>
            <span className="text-sm font-semibold text-ink">{Math.max(0, rp.phaseLength - rp.dayInPhase)} days</span>
          </div>
        )}
        <div className="pt-1">
          <div className="w-full h-[6px] rounded-full bg-[rgba(42,39,34,0.12)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(pctDone * 100)}%` }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-clay to-ochre"
            />
          </div>
        </div>
      </div>
    </div>
  ) : null

  // Segments only make sense on mobile when there's enough to split. Without
  // exercises the page is short (plan only), so we skip the nav entirely.
  const showSegNav = hasExercises && !!diagnosis

  return (
    <div className="p-4 md:p-6 max-w-md md:max-w-4xl mx-auto text-ink pb-36">
      {hero}

      {isDesktop ? (
        <div className="grid grid-cols-2 gap-4">
          {planSection && <div className="col-span-2">{planSection}</div>}
          {exercisesSection && <div>{exercisesSection}</div>}
          {progressSection && <div>{progressSection}</div>}
        </div>
      ) : showSegNav ? (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={seg}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SEG_TRANSITION}
            >
              {seg === 'plan' && planSection}
              {seg === 'exercises' && exercisesSection}
              {seg === 'progress' && progressSection}
            </motion.div>
          </AnimatePresence>
          <SegmentNav
            segments={[
              { id: 'plan', label: 'Plan' },
              { id: 'exercises', label: 'Exercises' },
              { id: 'progress', label: 'Progress' },
            ]}
            value={seg}
            onChange={setSeg}
            layoutId="recover-seg-pill"
            className="bottom-[calc(8.25rem+env(safe-area-inset-bottom))]"
          />
        </>
      ) : (
        <div className="space-y-4">
          {planSection}
          {exercisesSection}
          {progressSection}
        </div>
      )}

      {/* Off-ramp at the bottom. Offsets:
            - mobile (<md): bottom-16 clears the mobile bottom-nav (h-16)
            - desktop (md+): bottom-3 — no bottom-nav, sit close to the edge
            - md:left-64 accounts for the w-64 sidebar so the bar centers in
              the main-content column, not the full viewport */}
      <div className="fixed bottom-16 md:bottom-3 left-0 md:left-64 right-0 z-20 px-4
                      pb-[calc(0.5rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div className="max-w-md md:max-w-2xl mx-auto pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate('/triage')}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl
                       bg-[rgba(244,236,219,0.7)] border border-ct-rim backdrop-blur-md
                       shadow-[0_6px_20px_rgba(42,39,34,0.18)]
                       hover:border-clay/50 transition-colors text-left"
          >
            <span>
              <span className="block text-[13px] font-bold text-ink">Something new hurts?</span>
              <span className="block text-[11px] text-ink-soft mt-0.5">
                Quick screen — keeps your current plan.
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-clay-deep shrink-0">
              Screen <ArrowRight size={13} strokeWidth={2.6} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
