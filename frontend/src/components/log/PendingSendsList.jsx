import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { getStyleLabel } from '../../lib/styleColors'

const OUTCOME_LABEL = { flash: 'flash', redpoint: 'send', project: 'project' }

/**
 * The accumulating session list — one row per staged single-send, with a
 * remove affordance. Capped height so it never pushes the footer off the
 * peek view; overflow scrolls internally.
 *
 * Props:
 *   sends:    [{ grade, outcome, stylePrimary }]
 *   onRemove: (index) => void
 */
export default function PendingSendsList({ sends, onRemove }) {
  if (!sends.length) return null
  return (
    <div className="space-y-1 max-h-24 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      <AnimatePresence initial={false}>
        {sends.map((s, i) => (
          <motion.div
            key={`${s.grade}-${s.outcome}-${i}`}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
            className="flex items-center justify-between rounded-xl border border-ct-hairline bg-card px-3 py-1.5"
          >
            <span className="text-[12px] font-bold text-ink">
              {s.grade}
              <span className="text-ink-muted font-semibold">
                {' · '}{OUTCOME_LABEL[s.outcome] ?? s.outcome}{' · '}{getStyleLabel(s.stylePrimary)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${s.grade}`}
              className="p-1 -mr-1 rounded-full text-ink-muted hover:text-ink hover:bg-ink/[0.06] transition-colors"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
