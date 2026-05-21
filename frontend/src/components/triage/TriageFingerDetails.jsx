import ChipGroup from './ChipGroup'

/**
 * Finger-specific context block — only rendered when region === 'Finger'.
 * Three chip groups in one card so we keep the single-page wizard feel,
 * but capture the structured fields the classifier needs to grade pulley
 * level (A2 vs A4) and identify collateral / flexor tendon patterns.
 *
 * Auto-advance fires only once all three values are present; until then
 * the card stays focused. The user can also tap "Skip" if they don't know.
 *
 * Props:
 *   whichFingerOptions:    string[]
 *   fingerLocationOptions: Array<{ key, label }>
 *   gripModeOptions:       Array<{ key, label }>
 *   whichFinger:           string
 *   fingerLocation:        string
 *   gripMode:              string
 *   onChange:              (key, value) => void   — same shape as TriageWizard.set
 *   onSkip:                () => void              — advances to Pain without scoring this section
 */
export default function TriageFingerDetails({
  whichFingerOptions, fingerLocationOptions, gripModeOptions,
  whichFinger, fingerLocation, gripMode,
  onChange, onSkip,
}) {
  // ChipGroup needs { value, label } — adapt the legacy shapes inline.
  const fingerChips = whichFingerOptions.map((f) => ({ value: f, label: f }))
  const locationChips = fingerLocationOptions.map((o) => ({ value: o.key, label: o.label }))
  const gripChips = gripModeOptions.map((o) => ({ value: o.key, label: o.label }))

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-ct-cream/60 mb-1.5">Which finger?</p>
        <ChipGroup
          options={fingerChips}
          value={whichFinger}
          onChange={(v) => onChange('which_finger', v)}
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-ct-cream/60 mb-1">Where on the finger?</p>
        <p className="text-[11px] text-ct-cream/50 mb-2 leading-snug">
          Press lightly along your finger to find the tender spot — pick the area closest to it.
        </p>
        <ChipGroup
          options={locationChips}
          value={fingerLocation}
          onChange={(v) => onChange('finger_location', v)}
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-ct-cream/60 mb-1.5">Grip at injury</p>
        <ChipGroup
          options={gripChips}
          value={gripMode}
          onChange={(v) => onChange('grip_mode', v)}
        />
      </div>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="text-[11px] font-semibold text-ct-cream/60 hover:text-ct-cream transition-colors"
        >
          Skip this — not sure ›
        </button>
      )}
    </div>
  )
}
