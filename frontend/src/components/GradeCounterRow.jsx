import { Minus, Plus } from 'lucide-react'
import { STYLE_ORDER } from '../lib/styleColors'

const EMPTY_STYLES = { power: 0, dynamic: 0, technical: 0, endurance: 0 }

function normalizeStyles(styles) {
  if (!styles || typeof styles !== 'object') return { ...EMPTY_STYLES }
  return STYLE_ORDER.reduce((acc, s) => {
    acc[s] = Math.max(0, Number(styles[s] || 0))
    return acc
  }, {})
}

/**
 * One grade's three counters: Sends · Flashes · Projects.
 * Each +/- also bumps the active style under a sibling `styles` map.
 *
 * Props:
 *   grade:        string
 *   counters:     { s: number, f: number, p: number, styles?: {...} }
 *   activeStyle:  'powerful' | 'crimpy' | 'dynamic' | 'technical' | 'mobility'
 *   onChange:     (next) => void  — receives { s, f, p, styles }
 */
export default function GradeCounterRow({ grade, counters, activeStyle, onChange }) {
  const { s, f, p } = counters
  const styles = normalizeStyles(counters.styles)

  function bump(key, delta) {
    let nextS = s, nextF = f, nextP = p
    if (key === 's') nextS = Math.max(0, s + delta)
    if (key === 'f') nextF = Math.max(0, f + delta)
    if (key === 'p') nextP = Math.max(0, p + delta)
    // Invariant: flashes <= sends. If sends drops below flashes, clamp flashes.
    if (nextF > nextS) nextF = nextS

    // Style attribution: only when active style is one of the 4 known keys.
    // Decrement (delta < 0) attempts to remove from the active style first;
    // if that style has 0, fall through to whichever style has the largest
    // count so the styles map stays in sync with the totals.
    const nextStyles = { ...styles }
    const totalNext = nextS + nextF + nextP
    const totalPrev = s + f + p
    const styleDelta = totalNext - totalPrev
    if (styleDelta > 0 && STYLE_ORDER.includes(activeStyle)) {
      nextStyles[activeStyle] = (nextStyles[activeStyle] || 0) + styleDelta
    } else if (styleDelta < 0) {
      let remaining = -styleDelta
      // Try active style first
      const tryDrain = (key) => {
        const have = nextStyles[key] || 0
        const take = Math.min(have, remaining)
        nextStyles[key] = have - take
        remaining -= take
      }
      if (STYLE_ORDER.includes(activeStyle)) tryDrain(activeStyle)
      // Drain remaining from the largest bucket so the invariant holds
      while (remaining > 0) {
        let largestKey = STYLE_ORDER[0]
        for (const s of STYLE_ORDER) {
          if ((nextStyles[s] || 0) > (nextStyles[largestKey] || 0)) largestKey = s
        }
        if ((nextStyles[largestKey] || 0) === 0) break  // nothing left to drain
        tryDrain(largestKey)
      }
    }

    onChange({ s: nextS, f: nextF, p: nextP, styles: nextStyles })
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
