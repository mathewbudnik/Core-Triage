/**
 * Small region card at the top of the wizard.
 *
 *   ● Wrist                            Change ›
 *
 * Props:
 *   region:          string         — display name ("Wrist", "Lower Back")
 *   onChangeRegion:  () => void     — invoked when the user taps "Change ›"
 */
export default function TriageRegionPill({ region, onChangeRegion }) {
  return (
    <div className="flex items-center justify-between
                    bg-black/30 border-[0.5px] border-white/[0.08]
                    rounded-2xl px-3.5 py-2.5 mx-0 mb-2.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--tier-c)]
                         shadow-[0_0_6px_rgba(20,184,166,0.7)]" />
        <span className="text-sm font-extrabold tracking-tight">{region}</span>
      </div>
      <button
        type="button"
        onClick={onChangeRegion}
        className="text-[11px] font-semibold text-muted hover:text-text transition-colors"
      >
        Change ›
      </button>
    </div>
  )
}
