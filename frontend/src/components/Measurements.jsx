import { useEffect, useState } from 'react'

/**
 * Shared body-measurement primitives — used by the ProfileSetup wizard
 * AND the MovementAnalyzer calibration panel so the cm/in toggle and
 * input behavior stay identical across both surfaces. Canonical storage
 * is centimeters everywhere; display is unit-aware.
 */

export const CM_TO_IN = 0.3937007874
export const IN_TO_CM = 2.54

/**
 * US locale defaults to inches; everywhere else gets cm. Climbers can
 * flip via the toggle either way.
 */
export function defaultUnit() {
  if (typeof navigator === 'undefined') return 'cm'
  const lang = navigator.language || ''
  return lang.startsWith('en-US') ? 'in' : 'cm'
}

/**
 * MediaRecorder + getUserMedia support detection. iOS pre-14.5 and
 * older Android browsers won't have full support — callers can hide
 * the "Record now" affordance accordingly.
 */
export function canRecordVideo() {
  if (typeof window === 'undefined') return false
  if (typeof MediaRecorder === 'undefined') return false
  if (!navigator?.mediaDevices?.getUserMedia) return false
  return true
}

/**
 * Segmented cm / in toggle. Stateless; parent owns the unit value.
 */
export function UnitToggle({ unit, onChange }) {
  return (
    <div className="inline-flex bg-ct-hairline rounded-md p-0.5 border border-ct-rim">
      {['cm', 'in'].map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
            unit === u
              ? 'bg-ct-forest text-ct-cream'
              : 'text-ink-soft hover:text-ct-cream'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  )
}

/**
 * Unit-aware measurement input. Canonical storage is cm; the input
 * displays in whichever unit is selected and converts on commit. Local
 * state tracks the typed string so user input isn't clobbered mid-typing
 * by re-renders.
 *
 * Props:
 *   - label: visible field label (caller supplies unit suffix if desired)
 *   - hint: optional hint line below the input
 *   - unit: 'cm' | 'in'
 *   - valueCm: canonical value in centimeters (or null)
 *   - placeholder
 *   - onCommitCm: (number|null) => void — fires on blur / enter
 *   - allowNegative: ape-index can be negative; height cannot
 */
export function MeasurementField({
  label, hint, unit, valueCm, placeholder, onCommitCm, allowNegative = false,
}) {
  const valueInUnit = (cm) => {
    if (cm == null) return ''
    return unit === 'in' ? String(Math.round(cm * CM_TO_IN * 10) / 10) : String(cm)
  }
  const [local, setLocal] = useState(() => valueInUnit(valueCm))

  // Resync when external value or unit changes.
  useEffect(() => {
    setLocal(valueInUnit(valueCm))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueCm, unit])

  const commit = () => {
    if (local === '') {
      onCommitCm(null)
      return
    }
    const n = Number(local)
    if (!Number.isFinite(n)) return
    if (!allowNegative && n < 0) return
    const cm = unit === 'in' ? n * IN_TO_CM : n
    onCommitCm(Math.round(cm))
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
        className="px-2.5 py-1.5 rounded-lg bg-ct-hairline border border-ct-rim text-sm text-ct-cream placeholder:text-ink-muted focus:outline-none focus:border-ct-terracotta/60 ct-tnum"
      />
      {hint && <span className="text-[10px] text-ink-muted leading-snug">{hint}</span>}
    </label>
  )
}
