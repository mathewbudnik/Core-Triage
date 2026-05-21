import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'

/**
 * Compressed 2×2 mini-grid of the user's answers, shown above the diagnosis
 * hero. "Edit ›" navigates back to the form state. Pain value picks up a
 * severity-tinted color when one is provided.
 *
 * Props:
 *   answers:      Array<{ label: string, value: string, tone?: string }>
 *   onEdit:       () => void
 */
export default function TriageAnswersStrip({ answers = [], onEdit }) {
  if (answers.length === 0) return null

  return (
    <Surface tier="default" padding="sm" rounded="rounded-2xl" as="section" className="px-3 py-2.5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>Your answers</Eyebrow>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-bold text-ct-terra-soft hover:underline"
        >
          Edit ›
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {answers.map((a) => (
          <div key={a.label} className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-ct-cream/60 font-semibold">{a.label}</span>
            <span className="text-[11px] font-bold truncate"
                  style={a.tone ? { color: a.tone } : undefined}>
              {a.value}
            </span>
          </div>
        ))}
      </div>
    </Surface>
  )
}
