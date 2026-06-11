import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

// Boulder V-scale. The single-send hero logs boulder grades only (merged to
// the boulder discipline downstream); routes are entered via Bulk mode.
const BOULDER_GRADES = Array.from({ length: 18 }, (_, i) => `V${i}`)

/**
 * Horizontal snap-scroll grade picker. The selected grade scales up + takes
 * the clay accent; neighbours dim. Tap or arrow-key to choose.
 *
 * Props:
 *   value:    string | null   — selected grade
 *   onChange: (grade) => void
 *   grades:   string[]        — defaults to V0…V17
 *   ariaLabel
 */
export default function GradeScroller({ value, onChange, grades = BOULDER_GRADES, ariaLabel = 'Grade' }) {
  const tap = useReducedTransition(TRANSITIONS.chip_tap)
  const itemRefs = useRef({})

  // Centre the selected grade whenever it changes.
  useEffect(() => {
    if (!value) return
    itemRefs.current[value]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [value])

  function pick(g) {
    if (g && g !== value) { try { navigator.vibrate?.(8) } catch { /* no haptics */ } }
    onChange(g)
  }

  function onKeyDown(e) {
    const idx = grades.indexOf(value)
    if (e.key === 'ArrowRight') { e.preventDefault(); pick(grades[Math.min(grades.length - 1, idx < 0 ? 0 : idx + 1)]) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); pick(grades[Math.max(0, idx < 0 ? 0 : idx - 1)]) }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory
                 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]
                 -mx-4 px-[calc(50%-1.75rem)] py-1"
    >
      {grades.map((g) => {
        const active = g === value
        return (
          <motion.button
            key={g}
            ref={(el) => { itemRefs.current[g] = el }}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(g)}
            whileTap={{ scale: 0.9 }}
            transition={tap}
            animate={{ scale: active ? 1 : 0.82, opacity: active ? 1 : 0.5 }}
            className={[
              'snap-center shrink-0 grid place-items-center select-none',
              'w-14 h-14 rounded-2xl border text-lg font-extrabold tabular-nums',
              active
                ? 'bg-clay/15 border-clay/50 text-clay-deep shadow-[0_2px_10px_rgba(176,106,79,0.18)]'
                : 'bg-transparent border-ct-hairline text-ink-muted',
            ].join(' ')}
          >
            {g}
          </motion.button>
        )
      })}
    </div>
  )
}
