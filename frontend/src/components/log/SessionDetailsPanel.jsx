import GradientSlider from '../ui/GradientSlider'
import DatePicker from '../DatePicker'
import { SESSION_TYPES } from '../../hooks/useSessionLog'

const INTENSITY_LABELS = {
  1: 'Very easy', 2: 'Easy', 3: 'Easy-moderate',
  4: 'Moderate', 5: 'Moderate', 6: 'Moderate-hard',
  7: 'Hard', 8: 'Very hard', 9: 'Maximal', 10: 'Absolute max',
}

// Severity ramp on the Almanac palette: sage (≤3) → ochre (4-6) → clay (≥7).
const INTENSITY_HEX = (val) => {
  if (val <= 3) return '#97a886'
  if (val <= 6) return '#d7ac5b'
  return '#b06a4f'
}
const INTENSITY_GRADIENT = 'linear-gradient(90deg, #97a886 0%, #d7ac5b 50%, #b06a4f 100%)'
const SAGE_GRADIENT      = 'linear-gradient(90deg, #5f7a4e 0%, #97a886 100%)'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/**
 * Session-level metadata: date, type, duration, intensity, notes. Lives behind
 * the "Session details" expander (climb sessions) or shown directly for
 * training sessions. Reuses the shared GradientSlider + DatePicker.
 *
 * Props:
 *   form: the useSessionLog form state
 *   set:  (key, value) => void
 */
export default function SessionDetailsPanel({ form, set }) {
  return (
    <div className="space-y-4">
      {/* Date + type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="ct-eyebrow mb-1">Date</p>
          <DatePicker value={form.date} onChange={(v) => set('date', v)} />
        </div>
        <div>
          <p className="ct-eyebrow mb-1">Session type</p>
          <select
            value={form.session_type}
            onChange={(e) => set('session_type', e.target.value)}
            className="w-full bg-card border border-ct-rim rounded-lg px-3 py-1.5 text-base sm:text-sm text-ink outline-none focus:border-clay capitalize"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>{cap(t)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Duration — sage gradient track */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="ct-eyebrow">Duration</p>
          <p className="text-lg font-extrabold text-clay-deep">
            {form.duration_min}<span className="text-xs font-bold text-ink-muted"> min</span>
          </p>
        </div>
        <GradientSlider
          value={form.duration_min}
          min={15}
          max={240}
          step={15}
          onChange={(v) => set('duration_min', v)}
          gradient={SAGE_GRADIENT}
          thumbRingColor="rgba(151,168,134,0.5)"
          ariaLabel="Duration in minutes"
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-ink-muted">15 min</span>
          <span className="text-[10px] text-ink-muted">4 hr</span>
        </div>
      </div>

      {/* Intensity — severity-graded gradient (sage → ochre → clay) */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="ct-eyebrow">Intensity (RPE)</p>
          <p className="text-lg font-extrabold" style={{ color: INTENSITY_HEX(form.intensity) }}>
            {form.intensity}<span className="text-xs font-bold text-ink-muted">/10</span>
          </p>
        </div>
        <GradientSlider
          value={form.intensity}
          min={1}
          max={10}
          onChange={(v) => set('intensity', v)}
          gradient={INTENSITY_GRADIENT}
          thumbRingColor={`${INTENSITY_HEX(form.intensity)}66`}
          ariaLabel="Intensity (RPE)"
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-ink-muted">Easy</span>
          <span className="text-[10px] font-semibold" style={{ color: INTENSITY_HEX(form.intensity) }}>
            {INTENSITY_LABELS[form.intensity]}
          </span>
          <span className="text-[10px] text-ink-muted">Max</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="ct-eyebrow mb-1">Notes (optional)</p>
        <textarea
          rows={2}
          placeholder="How did it feel? Any breakthroughs or setbacks?"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="w-full bg-card border border-ct-rim rounded-lg px-3 py-1.5 text-base sm:text-sm text-ink placeholder:text-ink-muted/60 outline-none focus:border-clay resize-none"
        />
      </div>
    </div>
  )
}
