/**
 * WeekDots — the "THIS WEEK" mono label plus 7 day dots for the sidebar.
 *
 * Filled days are clay; empty days are a faint ink wash. Sits above a hairline
 * divider per the Almanac sidebar mockup.
 *
 * Props:
 *   days: boolean[] of length 7 (Mon..Sun). Missing/short arrays are padded
 *         with empties so the row always renders 7 dots.
 */
const CLAY = '#c58a77'
const EMPTY = 'rgba(42,39,34,0.12)'

export default function WeekDots({ days = [] }) {
  const week = Array.from({ length: 7 }, (_, i) => Boolean(days[i]))
  return (
    <div className="pt-3 mt-3 border-t border-ct-hairline">
      <div className="font-mono text-[8px] tracking-[0.16em] uppercase text-ink-muted mb-1.5">
        This week
      </div>
      <div className="flex gap-1.5">
        {week.map((filled, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-[13px] w-[13px] rounded-full"
            style={{ background: filled ? CLAY : EMPTY }}
          />
        ))}
      </div>
    </div>
  )
}
