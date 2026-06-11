import { Check } from 'lucide-react'

/**
 * The compressed one-line form for a passed section.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ ✓  ONSET     Gradual                Edit ›  │
 *   └─────────────────────────────────────────────┘
 *
 * Props:
 *   label:     uppercase eyebrow ("Onset", "Mechanism")
 *   value:     the chosen value, displayed as the main text
 *   valueTone: optional inline color override (e.g. severity tone for Pain)
 *   onEdit:    () => void   — invoked when the user taps the pill or "Edit ›"
 */
export default function TriageSummaryPill({ label, value, valueTone, onEdit }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full flex items-center justify-between gap-3
                 bg-ct-terra-tint border border-ct-terracotta/30
                 rounded-2xl px-3.5 py-2.5 mb-2.5
                 hover:bg-ct-terracotta/10 transition-colors text-left"
      aria-label={`Edit ${label}, currently ${value}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                         bg-ct-terracotta text-ct-cream shrink-0">
          <Check size={11} strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.10em] text-ink-soft leading-tight">
            {label}
          </p>
          <p className="text-[13px] font-bold leading-tight mt-0.5 truncate"
             style={valueTone ? { color: valueTone } : undefined}>
            {value}
          </p>
        </div>
      </div>
      <span className="text-[11px] font-bold text-ct-terra-soft shrink-0">Edit</span>
    </button>
  )
}
