import { ChevronRight } from 'lucide-react'

/**
 * Glass card with a ranked list of differential diagnoses below the primary hero.
 *
 * Props:
 *   items:    Array<{ title: string, subtitle?: string }>
 *   severity: 'mild' | 'moderate' | 'severe'   — drives the rank pill color
 *   onSelect: (index) => void   — tap a row to drill into the bucket's detail
 */
const RANK_TONE = {
  mild:     { bg: 'rgba(20,184,166,0.15)',  fg: '#5eead4', border: 'rgba(20,184,166,0.35)' },
  moderate: { bg: 'rgba(20,184,166,0.15)',  fg: '#5eead4', border: 'rgba(20,184,166,0.35)' },
  severe:   { bg: 'rgba(251,113,133,0.15)', fg: '#fda4af', border: 'rgba(251,113,133,0.35)' },
}

export default function TriageDifferentials({ items = [], severity = 'moderate', onSelect }) {
  if (items.length === 0) return null
  const t = RANK_TONE[severity] || RANK_TONE.moderate

  return (
    <section className="bg-black/35 backdrop-blur-md rounded-2xl p-4 mb-3
                        border-[0.5px] border-white/[0.10]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.10em]
                    text-[var(--tier-light)] mb-2.5">
        Other possibilities
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect?.(i)}
              className="w-full flex items-center justify-between gap-3
                         px-3.5 py-3 rounded-xl text-left
                         bg-white/[0.03] border-[0.5px] border-white/[0.08]
                         hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center justify-center w-[22px] h-[22px]
                                 rounded-full text-[11px] font-extrabold shrink-0 border-[0.5px]"
                      style={{ background: t.bg, color: t.fg, borderColor: t.border }}>
                  {i + 2}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold leading-tight truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[10px] text-muted font-semibold mt-0.5 truncate">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={14} strokeWidth={2.4} className="text-white/25 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
