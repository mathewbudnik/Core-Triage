import { motion } from 'framer-motion'

/**
 * SegmentNav — a generic floating frosted segmented pill switcher.
 *
 * Mobile-only (md:hidden), fixed and horizontally centered above the bottom
 * tab bar as translucent, blurred glass. The active segment slides under a clay
 * pill with a snappy spring (shared layoutId), so switching sections feels like
 * a modern app rather than a long scroll. Desktop lays sections out in a grid
 * instead, so this is hidden there.
 *
 * Props:
 *  - segments: array of { id, label }
 *  - value: id of the active segment
 *  - onChange: (id) => void
 *  - layoutId: shared layout id for the sliding pill (default "seg-pill").
 *      Use a unique id per mounted instance so multiple navs don't share motion.
 *  - className: extra classes to override positioning (e.g. a different bottom
 *      offset). Defaults to bottom-[calc(3.9rem+env(safe-area-inset-bottom))].
 */
export default function SegmentNav({
  segments,
  value,
  onChange,
  layoutId = 'seg-pill',
  className = '',
}) {
  return (
    <div
      className={`md:hidden fixed left-1/2 -translate-x-1/2 z-30 flex gap-0.5 p-1 rounded-full
                 border border-[rgba(42,39,34,0.12)] bg-[rgba(244,236,219,0.7)] backdrop-blur-md
                 shadow-[0_6px_20px_rgba(42,39,34,0.18)] bottom-[calc(3.9rem+env(safe-area-inset-bottom))] ${className}`}
      role="tablist"
    >
      {segments.map((s) => {
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
                layoutId={layoutId}
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
