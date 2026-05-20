import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * XP progress bar + level number + meta line.
 *
 * Props:
 *   level:        number — current Climber Level
 *   xpInLevel:    number — XP earned toward next level
 *   xpForNext:    number — XP needed for next level
 *   nextLabel:    string — text describing what's next (e.g., "unlock new quest tier")
 *   animateOnMount: bool — animate bar fill from 0 to current
 */
export default function LevelMeter({
  level,
  xpInLevel,
  xpForNext,
  nextLabel = '',
  animateOnMount = false,
  className = '',
}) {
  const pct = Math.max(0, Math.min(1, xpInLevel / xpForNext))
  const transition = useReducedTransition(TRANSITIONS.bar_fill)
  return (
    <div className={className}>
      <p className="ct-eyebrow">Flow</p>
      <p className="ct-display mt-1">{level}</p>
      <div className="relative h-[5px] bg-white/[0.07] rounded-full overflow-hidden mt-3">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-ct-terracotta to-ct-terra-soft"
          initial={animateOnMount ? { width: 0 } : { width: `${pct * 100}%` }}
          animate={{ width: `${pct * 100}%` }}
          transition={transition}
        />
      </div>
      <p className="ct-meta mt-2">
        {xpInLevel.toLocaleString()} / {xpForNext.toLocaleString()} XP{nextLabel ? ` · ${nextLabel}` : ''}
      </p>
    </div>
  )
}
