import { Zap, Grip, Wind, Compass, StretchHorizontal } from 'lucide-react'
import { STYLE_ORDER, STYLE_COLOR, getStyleLabel } from '../lib/styleColors'

const STYLE_ICON = {
  powerful:  Zap,
  crimpy:    Grip,
  dynamic:   Wind,
  technical: Compass,
  mobility:  StretchHorizontal,
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
                    bg-[#0a0a0c]/85 backdrop-blur-md
                    border-b-[0.5px] border-white/[0.06]">
      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em]
                    text-text/45 mb-2 px-0.5">
        Style of these climbs
      </p>
      <div className="grid grid-cols-5 gap-1">
        {STYLE_ORDER.map((s) => {
          const Icon = STYLE_ICON[s]
          const active = s === value
          const tone = STYLE_COLOR[s]
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
                    background: `color-mix(in srgb, ${tone.c} 18%, transparent)`,
                    borderColor: `color-mix(in srgb, ${tone.c} 45%, transparent)`,
                    color: tone.light,
                  }
                : {
                    background: 'transparent',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.55)',
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
