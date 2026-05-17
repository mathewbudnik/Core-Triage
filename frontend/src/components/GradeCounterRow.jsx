import { Minus, Plus } from 'lucide-react'

/**
 * One grade's three counters: Sends · Flashes · Projects.
 * Buttons are 36×36px on mobile, 44×44px on larger screens.
 * The grid uses minmax(0, 1fr) so cells can shrink below their content
 * width — prevents horizontal overflow on narrow phones.
 *
 * Props:
 *   grade:    string                                — e.g. "V5" or "5.11a"
 *   counters: { s: number, f: number, p: number }   — current state
 *   onChange: (next) => void                        — receives the full updated counters object
 */
export default function GradeCounterRow({ grade, counters, onChange }) {
  const { s, f, p } = counters

  function bump(key, delta) {
    let nextS = s, nextF = f, nextP = p
    if (key === 's') nextS = Math.max(0, s + delta)
    if (key === 'f') nextF = Math.max(0, f + delta)
    if (key === 'p') nextP = Math.max(0, p + delta)
    // Invariant: flashes <= sends. If sends drops below flashes, clamp flashes.
    if (nextF > nextS) nextF = nextS
    onChange({ s: nextS, f: nextF, p: nextP })
  }

  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 sm:gap-2 py-1.5">
      <span className="text-sm font-bold text-text">{grade}</span>
      {[['s', s, 'sends'], ['f', f, 'flashes'], ['p', p, 'projects']].map(([k, val, label]) => (
        <div key={k} className="flex items-center justify-center gap-0.5 sm:gap-1 min-w-0">
          <button
            type="button"
            onClick={() => bump(k, -1)}
            disabled={val === 0}
            aria-label={`decrement ${label} for ${grade}`}
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 inline-flex items-center justify-center rounded-lg
                       border border-outline text-muted hover:text-text
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-bold text-text tabular-nums w-5 sm:w-6 text-center">
            {val}
          </span>
          <button
            type="button"
            onClick={() => bump(k, +1)}
            aria-label={`increment ${label} for ${grade}`}
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 inline-flex items-center justify-center rounded-lg
                       border border-outline text-muted hover:text-text"
          >
            <Plus size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
