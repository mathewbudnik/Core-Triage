import { motion } from 'framer-motion'
import { Sparkle } from 'lucide-react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * Subtle diamond-tier shimmer overlay. Combines:
 *   - a diagonal white "shine sweep" that pulses across the surface
 *     every few seconds (like light catching a real diamond facet)
 *   - three small 4-point sparkles that fade + scale in/out on a
 *     stagger, giving the impression of tiny twinkles
 *
 * Drop into any element with `position: relative` — the overlay is
 * absolutely positioned and pointer-events: none. Border-radius is
 * inherited from the parent so it clips correctly inside rounded cards.
 *
 * On prefers-reduced-motion: reduce, animation is suppressed.
 *
 * Props:
 *   size: 'sm' | 'md' | 'lg'  — controls sparkle icon size
 *   intensity: 'soft' | 'normal'  — soft uses lower-opacity sparkles
 *                                   for use inside subtle hero cards
 */
const SPARKLE_POSITIONS = [
  { top: '15%', left: '18%', delay: 0,    dur: 2.4 },
  { top: '55%', left: '78%', delay: 0.9,  dur: 2.7 },
  { top: '78%', left: '38%', delay: 1.8,  dur: 2.2 },
]

export default function DiamondShimmer({ size = 'md', intensity = 'normal' }) {
  const reduced = usePrefersReducedMotion()
  const sparkleSize = size === 'sm' ? 9 : size === 'lg' ? 18 : 12
  const sparkleColor = intensity === 'soft' ? 'rgba(255,255,255,0.8)' : '#ffffff'
  const sweepOpacity = intensity === 'soft' ? 0.14 : 0.22

  if (reduced) {
    // Static fallback — keep the diamond feeling "different" without
    // motion. A single subtle sparkle in the top-left signals "premium"
    // even when the user has reduced-motion enabled.
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden"
           style={{ borderRadius: 'inherit' }}>
        <div className="absolute top-2 left-3 opacity-60" style={{ color: sparkleColor }}>
          <Sparkle size={sparkleSize} strokeWidth={2.5} fill="currentColor" />
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden"
         style={{ borderRadius: 'inherit' }}>
      {/* Shine sweep — a translucent white gradient that slides across
          the surface, then pauses for a few seconds before repeating.
          repeatDelay keeps it from feeling busy. */}
      <motion.div
        className="absolute inset-y-0"
        style={{
          width: '60%',
          background: `linear-gradient(110deg, transparent 0%, rgba(255,255,255,${sweepOpacity}) 50%, transparent 100%)`,
          filter: 'blur(2px)',
        }}
        initial={{ x: '-180%' }}
        animate={{ x: '300%' }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          repeatDelay: 3.6,
          ease: 'easeInOut',
        }}
      />

      {/* Sparkles — three 4-point stars on staggered fade+scale loops.
          Different durations + delays mean they rarely twinkle in sync,
          which reads more naturally than a uniform pulse. */}
      {SPARKLE_POSITIONS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: s.top, left: s.left, color: sparkleColor }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: [0, 0.9, 0],
            scale:   [0.5, 1, 0.5],
            rotate:  [-20, 20, -20],
          }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Sparkle size={sparkleSize} strokeWidth={2.4} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  )
}
