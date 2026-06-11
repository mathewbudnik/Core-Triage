import { motion } from 'framer-motion'

const SEGMENTS = [
  { id: 'you', label: 'You' },
  { id: 'today', label: 'Today' },
  { id: 'tools', label: 'Tools' },
]

/**
 * HomeSegmentNav — the floating frosted segment switcher for the mobile Home.
 *
 * Sits above the main bottom tab bar as translucent, blurred glass. The active
 * segment slides under a clay pill with a snappy spring (shared layoutId), so
 * switching sections feels like a modern app rather than a long scroll.
 * Mobile-only — desktop lays the sections out in a grid instead.
 */
export default function HomeSegmentNav({ value, onChange }) {
  return (
    <div
      className="md:hidden fixed left-1/2 -translate-x-1/2 z-30 flex gap-0.5 p-1 rounded-full
                 border border-[rgba(42,39,34,0.12)] bg-[rgba(244,236,219,0.7)] backdrop-blur-md
                 shadow-[0_6px_20px_rgba(42,39,34,0.18)] bottom-[calc(3.9rem+env(safe-area-inset-bottom))]"
      role="tablist"
      aria-label="Home sections"
    >
      {SEGMENTS.map((s) => {
        const on = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(s.id)}
            className="relative px-4 py-1.5 rounded-full font-mono text-[10px] tracking-[0.08em] uppercase"
          >
            {on && (
              <motion.span
                layoutId="home-seg-pill"
                className="absolute inset-0 rounded-full bg-clay shadow-[0_2px_6px_rgba(176,106,79,0.4)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative ${on ? 'text-cream font-semibold' : 'text-ink-soft'}`}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
