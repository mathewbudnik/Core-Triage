import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Circle, X } from 'lucide-react'
import { useIsDesktop } from '../../hooks/useIsDesktop'

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function isoFromWeekStart(startIso, weekIndex0) {
  const d = new Date(startIso + 'T00:00:00')
  d.setDate(d.getDate() + weekIndex0 * 7)
  return d.toISOString().slice(0, 10)
}

function weekStatus(plan, weekIndex0, todayIso) {
  if (!plan?.start_date) return 'future'
  const weekStart = isoFromWeekStart(plan.start_date, weekIndex0)
  const weekEnd   = isoFromWeekStart(plan.start_date, weekIndex0 + 1)
  if (todayIso >= weekEnd)   return 'past'
  if (todayIso >= weekStart) return 'current'
  return 'future'
}

/**
 * Bottom sheet listing the plan's weeks. Tap a week to call onSelectWeek
 * with the Monday-ISO of that week.
 *
 * Props:
 *   open:          boolean
 *   plan:          object | null
 *   onClose:       () => void
 *   onSelectWeek:  (mondayIso: string) => void
 */
export default function PlanArcSheet({ open, plan, onClose, onSelectWeek }) {
  const isDesktop = useIsDesktop()
  // Escape closes the sheet
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const totalWeeks = plan?.duration_weeks || 0
  const todayIso = new Date().toISOString().slice(0, 10)

  // Mobile = bottom-anchored sheet that slides up. Desktop = top-aligned
  // modal card (sits ~6vh from top so it lands in the natural reading area
  // instead of dead-centering with empty space above).
  const sheetClass = isDesktop
    ? `fixed top-[6vh] left-1/2 -translate-x-1/2 z-50
       w-full max-w-md max-h-[88vh] overflow-auto overscroll-contain
       bg-[#0a0a0c] border-[0.5px] border-white/[0.10]
       rounded-3xl px-4 pt-3 pb-5`
    : `fixed bottom-0 inset-x-0 z-50
       bg-[#0a0a0c] border-t-[0.5px] border-white/[0.10]
       rounded-t-3xl px-4 pt-3
       pb-[calc(1.5rem+env(safe-area-inset-bottom))]
       max-h-[88vh] overflow-auto`
  const enter = isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }
  const exit  = isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }
  const init  = isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }
  const enableDrag = !isDesktop && !REDUCE_MOTION

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
            role="dialog" aria-modal="true" aria-label="Plan weeks"
          >
            {!isDesktop && (
              <div className="flex justify-center pb-2">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>
            )}
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[15px] font-extrabold -tracking-[0.01em] text-ct-cream">Your plan</h3>
              <button onClick={onClose} aria-label="Close" className="p-1.5 -mr-1 rounded-full hover:bg-white/[0.06]">
                <X size={16} className="text-ct-cream/60" />
              </button>
            </div>
            {plan?.phase && (
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-ct-cream/60 mb-3 px-1">
                {plan.duration_weeks}-week {plan.phase} phase
              </p>
            )}
            <ul className="space-y-1.5">
              {Array.from({ length: totalWeeks }, (_, i) => i).map((wi) => {
                const status = weekStatus(plan, wi, todayIso)
                const weekStartIso = isoFromWeekStart(plan.start_date, wi)
                const icon = status === 'past'
                  ? <Check size={14} strokeWidth={2.8} className="text-ct-moss" />
                  : status === 'current'
                    ? <span className="w-2.5 h-2.5 rounded-full bg-ct-terracotta"
                            style={{ boxShadow: '0 0 8px rgba(217,119,87,0.60)' }} />
                    : <Circle size={12} strokeWidth={2.2} className="text-ct-cream/30" />
                const isDeload = (wi + 1) === totalWeeks
                return (
                  <li key={wi}>
                    <button
                      type="button"
                      onClick={() => { onSelectWeek(weekStartIso); onClose() }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl
                                  bg-black/35 backdrop-blur-md border-[0.5px] border-white/[0.08]
                                  hover:bg-white/[0.04] transition-colors text-left ${status === 'current' ? 'ring-1 ring-ct-terracotta/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-6 h-6">{icon}</span>
                        <div>
                          <p className="text-[13.5px] font-extrabold leading-tight text-ct-cream">Week {wi + 1}</p>
                          <p className="text-[10.5px] font-bold text-ct-cream/60 mt-0.5 uppercase tracking-[0.08em]">
                            {isDeload ? 'Deload week' : status === 'current' ? 'This week' : status === 'past' ? 'Complete' : 'Upcoming'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold text-ct-cream/60 tabular-nums">
                        {new Date(weekStartIso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
