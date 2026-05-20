import { useReducedMotion } from 'framer-motion'

export const DURATIONS = {
  snap:      0.16,
  glide:     0.32,
  sweep:     0.50,
  celebrate: 0.80,
}

export const EASE = {
  out:    [0.40, 0.00, 0.20, 1.00],
  spring: [0.34, 1.56, 0.64, 1.00],
  decel:  [0.00, 0.00, 0.20, 1.00],
}

export const TRANSITIONS = {
  surface_rise: { duration: DURATIONS.glide, ease: EASE.decel },
  number_count: { duration: DURATIONS.sweep, ease: EASE.out },
  bar_fill:     { duration: DURATIONS.sweep, ease: EASE.out },
  chip_tap:     { duration: DURATIONS.snap,  ease: EASE.out },
  celebrate:    { duration: DURATIONS.celebrate, ease: EASE.spring },
  route:        { duration: DURATIONS.glide, ease: EASE.decel },
}

const INSTANT = { duration: 0 }

/**
 * Returns the given transition, or { duration: 0 } when the user has
 * prefers-reduced-motion: reduce set.
 */
export function useReducedTransition(transition) {
  const shouldReduce = useReducedMotion()
  return shouldReduce ? INSTANT : transition
}
