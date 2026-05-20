import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Daily quest card with title, multiplier callout, progress bar, and "why this matters" line.
 *
 * Props:
 *   title:       string — quest title
 *   why:         string — short "why this matters" coaching copy
 *   xp:          number — XP reward for completion
 *   multiplier:  string — multiplier label (e.g., "MOBILITY ×1.5")
 *   progress:    { current: number, target: number }
 *   label:       string — top label (default: "TODAY'S QUEST")
 *   className:   extra classes
 */
export default function QuestCard({
  title,
  why,
  xp,
  multiplier,
  progress,
  label = "TODAY'S QUEST",
  className = '',
}) {
  const pct = progress
    ? Math.max(0, Math.min(1, progress.current / Math.max(1, progress.target)))
    : 0
  const transition = useReducedTransition(TRANSITIONS.bar_fill)
  return (
    <div
      className={[
        'rounded-lg border p-4',
        'bg-gradient-to-b from-ct-forest-deep to-ct-forest-soft',
        'border-[rgba(217,119,87,0.20)]',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div className="flex justify-between items-center mb-2">
        <p className="text-[10px] tracking-[0.22em] uppercase text-ct-terra-soft font-extrabold">{label}</p>
        <p className="text-[11px] text-ct-moss font-bold tracking-[0.04em]">
          +{xp} XP{multiplier ? ` · ${multiplier}` : ''}
        </p>
      </div>
      <p className="text-[15px] font-bold text-ct-cream leading-tight tracking-[-0.01em]">{title}</p>
      {why && <p className="text-[11px] text-ct-moss mt-1.5 leading-snug">{why}</p>}
      {progress && (
        <div className="mt-3">
          <div className="relative h-[5px] bg-white/[0.07] rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-ct-terracotta to-ct-terra-soft"
              initial={{ width: `${pct * 100}%` }}
              animate={{ width: `${pct * 100}%` }}
              transition={transition}
            />
          </div>
          <div className="flex justify-between text-[11px] mt-1.5">
            <span className="text-ct-cream font-bold ct-tnum">{progress.current} of {progress.target}</span>
            <span className="text-ct-moss tracking-[0.05em]">{Math.round(pct * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
