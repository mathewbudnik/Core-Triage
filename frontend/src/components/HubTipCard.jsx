import { useNavigate } from 'react-router-dom'
import { Stethoscope, Flame, TrendingUp, Sunrise, ChevronRight, X } from 'lucide-react'

const TOPIC_META = {
  active_rehab:    { icon: Stethoscope, label: "Today's focus · Rehab" },
  overtraining:    { icon: Flame,       label: "Today's focus · Recovery" },
  plateau_4w:      { icon: TrendingUp,  label: "Today's focus · Plateau" },
  plateau_8w:      { icon: TrendingUp,  label: "Today's focus · Plateau" },
  return_break_7d: { icon: Sunrise,     label: "Today's focus · Welcome back" },
  return_break_14d:{ icon: Sunrise,     label: "Today's focus · Welcome back" },
  return_break_30d:{ icon: Sunrise,     label: "Today's focus · Welcome back" },
}

/**
 * Contextual coaching tip — sits between Rings and Project on Hub.
 *
 * Props:
 *   tip:        { kind, headline, body, cta_label, cta_route, color } | null
 *   onDismiss:  () => void
 */
export default function HubTipCard({ tip, onDismiss }) {
  const navigate = useNavigate()
  if (!tip) return null
  const meta = TOPIC_META[tip.kind] || { icon: Flame, label: "Today's focus" }
  const Icon = meta.icon
  const c = tip.color || '#94949f'

  return (
    <div
      className="relative rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${c}26, ${c}08)`,
        border: `0.5px solid ${c}4d`,
        boxShadow: `inset 0 0 24px ${c}10`,
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tip"
        className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-md text-muted/40 hover:text-muted hover:bg-white/5"
      >
        <X size={13} />
      </button>

      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] font-bold pr-7"
           style={{ color: c }}>
        <Icon size={11} strokeWidth={2.4} />
        {meta.label}
      </div>

      <div className="text-[15px] font-bold text-text -tracking-[0.01em] mt-1.5">
        {tip.headline}
      </div>
      <div className="text-[12px] text-text/78 leading-snug mt-1">
        {tip.body}
      </div>

      {tip.cta_label && tip.cta_route && (
        <button
          type="button"
          onClick={() => { navigate(tip.cta_route); onDismiss?.() }}
          className="inline-flex items-center gap-1 mt-3 text-[11px] font-semibold"
          style={{ color: c }}
        >
          {tip.cta_label}
          <ChevronRight size={11} />
        </button>
      )}
    </div>
  )
}
