import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ArrowRight, Sparkles, Timer, Snowflake, PlayCircle, ExternalLink } from 'lucide-react'
import TrainingLogEntry from '../TrainingLogEntry'
import ExerciseTimer from './ExerciseTimer'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { getSessionTypeLabel } from '../../lib/sessionType'
import { buildExerciseVideoUrl } from '../../data/exercises'

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * One exercise block from session.main. Backend shape:
 *   { exercise, detail, sets, reps, rest_seconds, effort_note, benchmark, ... }
 */
function MainExerciseCard({ block, index }) {
  const [timerOpen, setTimerOpen] = useState(false)
  const sets = block.sets
  const reps = block.reps
  const rest = block.rest_seconds
  const videoUrl = buildExerciseVideoUrl(block)
  const canTime = !!(sets && rest)  // need both to drive the rest timer

  return (
    <li className="px-4 py-3.5 rounded-2xl bg-black/35 backdrop-blur-md
                   border-[0.5px] border-white/[0.10]">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="text-[13.5px] font-extrabold leading-tight">
          <span className="text-text/40 tabular-nums mr-1.5">{index + 1}.</span>
          {block.exercise || 'Exercise'}
        </p>
        {(sets || reps) && (
          <p className="text-[11px] font-bold text-[var(--tier-light)] tabular-nums shrink-0">
            {[sets ? `${sets}×` : null, reps].filter(Boolean).join(' ')}
          </p>
        )}
      </div>
      {block.detail && (
        <p className="text-[11.5px] font-semibold text-text/65 leading-snug mb-1.5">
          {block.detail}
        </p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
        {rest != null && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-muted tabular-nums">
            <Timer size={11} strokeWidth={2.4} />
            {rest >= 60 ? `${Math.round(rest / 60)} min rest` : `${rest}s rest`}
          </span>
        )}
      </div>
      {block.effort_note && (
        <p className="text-[11px] font-semibold text-text/50 italic leading-snug mt-2">
          {block.effort_note}
        </p>
      )}
      {block.benchmark && (
        <p className="text-[10.5px] font-semibold text-text/40 leading-snug mt-1.5
                      pt-1.5 border-t-[0.5px] border-white/[0.06]">
          {block.benchmark}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {canTime && !timerOpen && (
          <button
            type="button"
            onClick={() => setTimerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       text-[10.5px] font-extrabold uppercase tracking-[0.06em]
                       bg-[color:color-mix(in_srgb,var(--tier-c)_12%,transparent)]
                       border-[0.5px] border-[color:color-mix(in_srgb,var(--tier-c)_32%,transparent)]"
            style={{ color: 'var(--tier-light)' }}
          >
            <Timer size={11} strokeWidth={2.6} />
            Timer
          </button>
        )}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       text-[10.5px] font-extrabold uppercase tracking-[0.06em]
                       bg-white/[0.04] border-[0.5px] border-white/[0.10]
                       text-text/85 hover:text-text hover:bg-white/[0.06] transition-colors"
          >
            <PlayCircle size={11} strokeWidth={2.6} />
            Watch demo
            <ExternalLink size={9} strokeWidth={2.4} className="opacity-60" />
          </a>
        )}
      </div>

      {canTime && timerOpen && (
        <ExerciseTimer
          totalSets={sets}
          restSeconds={rest}
          onClose={() => setTimerOpen(false)}
        />
      )}
    </li>
  )
}

function PhaseList({ title, items, icon: Icon }) {
  if (!items?.length) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 px-1">
        {Icon && <Icon size={12} strokeWidth={2.4} className="text-text/45" />}
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-text/45">
          {title}
        </p>
      </div>
      <ul className="space-y-1 px-1 mb-1">
        {items.map((line, i) => (
          <li key={i} className="text-[11.5px] font-semibold text-text/70 leading-snug flex gap-2">
            <span className="text-text/30 shrink-0">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Bottom sheet (mobile) / centered modal (desktop) showing one session's
 * structured plan: coach note → warm-up → main work → cool-down. Sticky
 * "Log this session" CTA at the bottom; tap to swap to the log form.
 *
 * Props:
 *   open:    boolean
 *   session: object | null
 *   onClose: () => void
 *   onLogged: () => void   — fires when the user successfully logs from here
 */
export default function SessionDetailSheet({ open, session, onClose, onLogged }) {
  const [logging, setLogging] = useState(false)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset to detail view whenever the sheet reopens
  useEffect(() => { if (open) setLogging(false) }, [open])

  if (!session && !open) return null

  const rawType = session?.type || session?.session_type
  const typeLabel = getSessionTypeLabel(rawType) || 'Session'
  const dur = session?.duration_min || session?.duration_minutes
  const main = session?.main || []
  const warmUp = session?.warm_up || []
  const coolDown = session?.cool_down || []
  const coachNote = session?.coach_note

  const sheetClass = isDesktop
    ? `fixed top-[6vh] left-1/2 -translate-x-1/2 z-50
       w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden
       bg-[#0a0a0c] border-[0.5px] border-white/[0.10]
       rounded-3xl px-4 pt-3`
    : `fixed bottom-0 inset-x-0 z-50
       bg-[#0a0a0c] border-t-[0.5px] border-white/[0.10]
       rounded-t-3xl px-4 pt-3 flex flex-col
       max-h-[88vh]`
  const enter = isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }
  const exit  = isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }
  const init  = isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }
  const enableDrag = !isDesktop && !REDUCE_MOTION

  const hasAnyDetail = main.length > 0 || warmUp.length > 0 || coolDown.length > 0 || !!coachNote

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.18 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className={sheetClass}
            initial={init}
            animate={enter}
            exit={exit}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.22, ease: 'easeOut' }}
            drag={enableDrag ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            role="dialog" aria-modal="true" aria-label="Session detail"
          >
            {!isDesktop && (
              <div className="flex justify-center pb-2">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>
            )}
            <div className="flex items-start justify-between gap-3 mb-3 px-1">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--tier-light)]">
                  {typeLabel}
                </p>
                <h3 className="text-[19px] font-extrabold -tracking-[0.02em] mt-0.5">
                  {typeLabel} session
                </h3>
                {dur && (
                  <p className="text-[11.5px] font-bold text-muted mt-1 tabular-nums">
                    {dur} min
                  </p>
                )}
              </div>
              <button onClick={onClose} aria-label="Close"
                      className="p-1.5 -mr-1 rounded-full hover:bg-white/[0.06]">
                <X size={16} className="text-muted" />
              </button>
            </div>

            <div className={`flex-1 overflow-auto ${
              logging
                ? 'pb-[env(safe-area-inset-bottom)]'
                : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
            }`}>
              {!logging && (
                <div className="space-y-5">
                  {coachNote && (
                    <div className="px-3.5 py-3 rounded-2xl
                                    bg-[color:color-mix(in_srgb,var(--tier-c)_8%,transparent)]
                                    border-[0.5px] border-[color:color-mix(in_srgb,var(--tier-c)_22%,transparent)]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles size={11} strokeWidth={2.4} className="text-[var(--tier-light)]" />
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--tier-light)]">
                          Coach note
                        </p>
                      </div>
                      <p className="text-[12px] font-semibold text-text/85 leading-snug">
                        {coachNote}
                      </p>
                    </div>
                  )}

                  <PhaseList title="Warm-up" items={warmUp} icon={Sparkles} />

                  {main.length > 0 && (
                    <div>
                      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-text/45 mb-2 px-1">
                        Main work
                      </p>
                      <ul className="space-y-1.5">
                        {main.map((block, i) => (
                          <MainExerciseCard key={i} block={block} index={i} />
                        ))}
                      </ul>
                    </div>
                  )}

                  <PhaseList title="Cool-down" items={coolDown} icon={Snowflake} />

                  {!hasAnyDetail && (
                    <p className="px-1 py-6 text-center text-[12px] font-semibold text-muted">
                      No exercise detail captured for this session.
                    </p>
                  )}
                </div>
              )}
              {logging && (
                <TrainingLogEntry
                  sessionType={(rawType || 'bouldering').toString().toLowerCase()}
                  onSave={() => { setLogging(false); onLogged?.(); onClose() }}
                  onCancel={() => setLogging(false)}
                />
              )}
            </div>

            {!logging && (
              <div className="sticky bottom-0 inset-x-0 -mx-4 px-4 pt-3
                              pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                              bg-[#0a0a0c]/95 backdrop-blur-md
                              border-t-[0.5px] border-white/[0.08]">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setLogging(true)}
                  className="w-full inline-flex items-center justify-center gap-2
                             px-5 py-3.5 rounded-2xl
                             font-extrabold text-[13px] -tracking-[0.01em]"
                  style={{ background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }}
                >
                  Log this session
                  <ArrowRight size={14} strokeWidth={2.4} />
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
