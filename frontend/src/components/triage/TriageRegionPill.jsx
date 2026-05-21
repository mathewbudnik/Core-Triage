import Surface from '../ui/Surface'

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
    <Surface tier="flat" padding="sm" rounded="rounded-2xl" className="flex items-center justify-between px-3.5 py-2.5 mx-0 mb-2.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-ct-terracotta
                         shadow-[0_0_6px_rgba(217,119,87,0.6)]" />
        <span className="text-sm font-extrabold tracking-tight text-ct-cream">{region}</span>
      </div>
      <button
        type="button"
        onClick={onChangeRegion}
        className="text-[11px] font-semibold text-ct-cream/60 hover:text-ct-cream transition-colors"
      >
        Change ›
      </button>
    </Surface>
  )
}
