import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Full-session celebration. Renders a list of meaningful events for one save.
 *
 * Props:
 *   open:    bool
 *   onClose: () => void
 *   events:  Array<{ kind: 'send'|'levelUp'|'pr', label: string, sublabel?: string, xp?: number }>
 *   totalXP: number
 */
export default function SessionSummaryOverlay({ open, onClose, events = [], totalXP = 0 }) {
  const t = useReducedTransition(TRANSITIONS.dialog_in)
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-ct-forest-deep/70 backdrop-blur-md p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={t}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md bg-ct-forest border border-ct-hairline rounded-3xl p-5"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
            transition={t}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="ct-eyebrow">Session logged</p>
            <p className="ct-display mt-1">+{totalXP.toLocaleString()} XP</p>
            <ul className="mt-4 space-y-2">
              {events.map((e, i) => (
                <motion.li
                  key={`${e.kind}-${i}`}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ ...t, delay: 0.05 + i * 0.06 }}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-ink-soft">
                    {e.label}
                    {e.sublabel && <span className="ml-2 text-ink-muted text-xs">{e.sublabel}</span>}
                  </span>
                  {typeof e.xp === 'number' && (
                    <span className="ct-tnum text-ct-terra-soft font-bold">+{e.xp}</span>
                  )}
                </motion.li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-xl bg-ct-terracotta text-white text-sm font-bold"
            >
              Clean send
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
