import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ArrowRight } from 'lucide-react'
import TrainingLogEntry from '../TrainingLogEntry'

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function ExerciseRow({ ex }) {
  return (
    <li className="px-3.5 py-3 rounded-2xl bg-black/35 backdrop-blur-md
                   border-[0.5px] border-white/[0.10]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-extrabold leading-tight">{ex.name}</p>
        {(ex.sets || ex.reps) && (
          <p className="text-[11px] font-bold text-text/70 tabular-nums shrink-0">
            {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join('')}
          </p>
        )}
      </div>
      {ex.notes && (
        <p className="text-[11.5px] font-semibold text-text/55 mt-1 leading-snug">
          {ex.notes}
        </p>
      )}
    </li>
  )
}

/**
 * Bottom sheet showing one session's exercise list, with a sticky CTA to
 * launch the existing TrainingLogEntry form pre-filled with the session
 * type.
 *
 * Props:
 *   open:    boolean
 *   session: object | null
 *   onClose: () => void
 *   onLogged: () => void   — fires when the user successfully logs from here
 */
export default function SessionDetailSheet({ open, session, onClose, onLogged }) {
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset to detail view whenever the sheet reopens
  useEffect(() => { if (open) setLogging(false) }, [open])

  if (!session && !open) return null

  const exercises = session?.exercises || []
  const dur = session?.duration_minutes || session?.duration_min
  const rpe = session?.rpe

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
            className="fixed bottom-0 inset-x-0 z-50
                       bg-[#0a0a0c] border-t-[0.5px] border-white/[0.10]
                       rounded-t-3xl px-4 pt-3 flex flex-col
                       max-h-[88vh]"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.22, ease: 'easeOut' }}
            drag={REDUCE_MOTION ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            role="dialog" aria-modal="true" aria-label="Session detail"
          >
            <div className="flex justify-center pb-2">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>
            <div className="flex items-start justify-between gap-3 mb-3 px-1">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--tier-light)]">
                  {session?.session_type || 'Session'}
                </p>
                <h3 className="text-[19px] font-extrabold -tracking-[0.02em] mt-0.5">
                  {session?.session_type || 'Session'} session
                </h3>
                <p className="text-[11.5px] font-bold text-muted mt-1 tabular-nums">
                  {[dur ? `${dur} min` : null, rpe ? `RPE ${rpe}` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close"
                      className="p-1.5 -mr-1 rounded-full hover:bg-white/[0.06]">
                <X size={16} className="text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
              {!logging && (
                <>
                  {exercises.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[12px] font-semibold text-muted">
                      No exercise detail captured for this session.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} />)}
                    </ul>
                  )}
                </>
              )}
              {logging && (
                <TrainingLogEntry
                  sessionType={session?.session_type?.toLowerCase() || 'bouldering'}
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
