import { Zap, Grip, Wind, Compass, StretchHorizontal } from 'lucide-react'
import { STYLE_ORDER, getStyleLabel } from '../lib/styleColors'
import { skillColor } from '../lib/skills'

const STYLE_ICON = {
  powerful:  Zap,
  crimpy:    Grip,
  dynamic:   Wind,
  technical: Compass,
  mobility:  StretchHorizontal,
}

// Map the five climb-style keys to the canonical skill keys in lib/skills.js
// so chips read from the single source of truth for skill colors.
const STYLE_TO_SKILL = {
  powerful:  'power',
  crimpy:    'crimp',
  dynamic:   'dynamic',
  technical: 'technique',
  mobility:  'mobility',
}

/**
 * Sticky 4-chip style selector. One chip is always active; tapping a
 * different chip changes the active style. Subsequent +/- increments in the
 * climb-log section will attribute to whichever style is active here.
 *
 * Props:
 *   value:     'powerful' | 'crimpy' | 'dynamic' | 'technical' | 'mobility'
 *   onChange:  (next: string) => void
 */
export default function StyleChipStrip({ value, onChange }) {
  return (
    <div className="sticky top-0 z-10 -mx-3 px-3 py-2
                    bg-side/90 backdrop-blur-md
                    border-b-[0.5px] border-ct-rim">
      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em]
                    text-ink-muted mb-2 px-0.5">
        Style of these climbs
      </p>
      <div className="grid grid-cols-5 gap-1">
        {STYLE_ORDER.map((s) => {
          const Icon = STYLE_ICON[s]
          const active = s === value
          const tone = skillColor(STYLE_TO_SKILL[s])
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              className="flex flex-col items-center justify-center gap-1
                         py-2 rounded-2xl border-[0.5px] min-h-[52px]
                         transition-colors"
              style={active
                ? {
                    background: `color-mix(in srgb, ${tone} 18%, transparent)`,
                    borderColor: `color-mix(in srgb, ${tone} 55%, transparent)`,
                    color: tone,
                  }
                : {
                    background: 'transparent',
                    borderColor: 'rgba(42,39,34,0.14)',
                    color: '#8d8472',
                  }
              }
            >
              <Icon size={14} strokeWidth={2.4} />
              <span className="text-[10.5px] font-extrabold uppercase tracking-[0.04em]">
                {getStyleLabel(s)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
