import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { STYLE_ORDER, STYLE_COLOR, getStyleLabel } from '../lib/styleColors'
import { useIsDesktop } from '../hooks/useIsDesktop'

const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Drill-down sheet for the Hub style-mix card.
 *
 * Props:
 *   open:    boolean
 *   profile: { pct, counts, total, dominant, weakest, confidence }
 *   onClose: () => void
 */
export default function StyleMixSheet({ open, profile, onClose }) {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const sheetClass = isDesktop
    ? `fixed top-[6vh] left-1/2 -translate-x-1/2 z-50
       w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden
       bg-[#0a0a0c] border-[0.5px] border-white/[0.10] rounded-3xl px-4 pt-3`
    : `fixed bottom-0 inset-x-0 z-50
       bg-[#0a0a0c] border-t-[0.5px] border-white/[0.10]
       rounded-t-3xl px-4 pt-3 flex flex-col max-h-[88vh]`
  const enter = isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }
  const exit  = isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }
  const init  = isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }
  const enableDrag = !isDesktop && !REDUCE_MOTION

  if (!profile && !open) return null

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
            initial={init} animate={enter} exit={exit}
            transition={{ duration: REDUCE_MOTION ? 0 : 0.22, ease: 'easeOut' }}
            drag={enableDrag ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
            role="dialog" aria-modal="true" aria-label="Style mix detail"
          >
            {!isDesktop && (
              <div className="flex justify-center pb-2">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>
            )}
            <div className="flex items-start justify-between gap-3 mb-3 px-1">
              <div>
                <p className="ct-eyebrow" style={{ color: 'var(--tier-light)' }}>Style mix</p>
                <h3 className="ct-display mt-0.5">Last 30 days</h3>
                <p className="text-[11.5px] font-bold text-muted mt-1 tabular-nums">
                  {profile?.total || 0} tagged climb{(profile?.total || 0) === 1 ? '' : 's'}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close"
                      className="p-1.5 -mr-1 rounded-full hover:bg-white/[0.06]">
                <X size={16} className="text-muted" />
              </button>
            </div>

            {/* Bottom padding clears the mobile bottom nav (h-16 = 4rem)
                plus the iPhone home-indicator safe-area inset, so the
                last list item (Endurance) isn't hidden behind the nav.
                Desktop keeps the original pb-4 since there's no bottom
                nav on md+. */}
            <div className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-4">
              <div className="flex h-5 rounded-full overflow-hidden bg-white/[0.04] mb-5">
                {STYLE_ORDER.map((s) => (
                  <div key={s} className="h-full"
                       style={{ width: `${profile?.pct[s] || 0}%`, background: STYLE_COLOR[s].c }} />
                ))}
              </div>

              <ul className="space-y-1.5">
                {STYLE_ORDER.map((s) => {
                  const tone = STYLE_COLOR[s]
                  return (
                    <li key={s}
                        className="ct-surface-flat flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: tone.c }} />
                        <span className="text-[13.5px] font-extrabold leading-tight"
                              style={{ color: tone.light }}>
                          {getStyleLabel(s)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[13.5px] font-extrabold tabular-nums">
                          {profile?.pct[s] || 0}%
                        </p>
                        <p className="text-[10px] font-bold text-muted tabular-nums">
                          {profile?.counts[s] || 0} climb{(profile?.counts[s] || 0) === 1 ? '' : 's'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
