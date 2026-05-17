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
    <section className="bg-black/30 border-[0.5px] border-white/[0.08]
                        rounded-2xl px-3 py-2.5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.10em] text-muted">
          Your answers
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-bold text-[var(--tier-light)] hover:underline"
        >
          Edit ›
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {answers.map((a) => (
          <div key={a.label} className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-muted font-semibold">{a.label}</span>
            <span className="text-[11px] font-bold truncate"
                  style={a.tone ? { color: a.tone } : undefined}>
              {a.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
