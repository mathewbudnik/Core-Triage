import { motion } from 'framer-motion'
import AwardMedal from './AwardMedal'
import { AWARD_META } from '../lib/awardCatalog'

/**
 * Slide-in toast for a newly-unlocked award.
 *
 * Props:
 *   award:    { kind, label, category }  — from POST /api/training new_awards
 *   onTap:    () => void
 *   onClose:  () => void
 */
export default function AwardUnlockToast({ award, onTap, onClose }) {
  const meta = AWARD_META[award.kind] || { name: award.label || award.kind }

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
      role="button"
      onClick={onTap}
      className="rounded-xl px-3 py-3 flex items-center gap-3 cursor-pointer bg-ct-forest-deep border border-ct-terracotta/40"
      style={{
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      }}>
      <AwardMedal size="sm"
        light={meta.light} mid={meta.c} deep={meta.deep}
        icon={meta.icon} label={null} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-ct-cream -tracking-[0.01em] flex items-baseline gap-1.5">
          {meta.name}
          <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-[1px] rounded"
                style={{ color: meta.c, border: `0.5px solid ${meta.c}66` }}>
            Earned
          </span>
        </div>
        <div className="text-[11px] text-ink-soft mt-0.5">
          {meta.sub} · tap to view
        </div>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onClose() }}
              className="text-ink-muted hover:text-ink-soft text-sm transition-colors">×</button>
    </motion.div>
  )
}
