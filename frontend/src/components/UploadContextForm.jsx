import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import FallScrubber from './FallScrubber'
import TrimScrubber from './TrimScrubber'

/**
 * Per-upload context form. Shown after the video loads its metadata,
 * before the pose-processing pipeline kicks off. The form collects the
 * five fields that have outsized impact on detection accuracy:
 *
 *   1. Wall angle    — inverts the correctness of ~⅓ of the catalog
 *   2. Discipline    — boulder / sport / top-rope changes which rules fire
 *   3. Grade         — V-scale (boulder) or YDS (sport/TR); calibrates "at limit"
 *   4. Outcome       — sent / fell; if fell, mark the fall frame on a scrubber
 *   5. Focus (opt.)  — multi-select tag, pre-biases the analysis
 *
 * The form is the gate between 'idle' and 'processing' in the analyzer
 * state machine. Submitting calls onSubmit(context).
 *
 * Props:
 *   - videoRef:    the shared <video> ref so the FallScrubber can reuse the
 *                  already-loaded media (no second download)
 *   - durationS:   clip duration in seconds (from loadedmetadata)
 *   - profile:     optional climber profile, used to default the focus tags
 *   - onSubmit:    (context) => void — called once all required fields are valid
 *   - onCancel:    () => void — back to idle (drop zone)
 */

const VENUES = [
  { value: 'indoor',  label: 'Indoor gym' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'board',   label: 'Board' },  // Kilter / Moon / Tension etc — system boards
]

const WALL_ANGLES = [
  { value: 'slab',     label: 'Slab' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'overhang', label: 'Overhang' },
  { value: 'roof',     label: 'Roof' },
]

const DISCIPLINES = [
  { value: 'boulder',  label: 'Boulder' },
  { value: 'sport',    label: 'Sport' },
  { value: 'top-rope', label: 'Top-rope' },
]

const OUTCOMES = [
  { value: 'sent', label: 'Sent', Icon: CheckCircle2 },
  { value: 'fell', label: 'Fell', Icon: XCircle },
]

const FOCUS_TAGS = [
  { value: 'general',    label: 'General' },
  { value: 'hips',       label: 'Hips' },
  { value: 'feet',       label: 'Feet' },
  { value: 'arms',       label: 'Arms' },
  { value: 'sequencing', label: 'Sequencing' },
  { value: 'dynamic',    label: 'Dynamic' },
]

// V-grade scale used by CoreTriage's tier system. Open-ended (V13+) collapsed
// to V13 for the picker; folks above that are mostly pros and probably aren't
// uploading via this flow.
const V_GRADES = Array.from({ length: 14 }, (_, i) => `V${i}`)

// YDS scale for sport / top-rope. 5.6–5.15 with letter grades on 5.10+.
const YDS_GRADES = (() => {
  const out = ['5.6', '5.7', '5.8', '5.9']
  for (let n = 10; n <= 15; n++) {
    out.push(`5.${n}a`, `5.${n}b`, `5.${n}c`, `5.${n}d`)
  }
  return out
})()

export default function UploadContextForm({ videoRef, durationS, maxTrimS = 60, profile, onSubmit, onCancel }) {
  const [venue, setVenue] = useState(null)
  const [wallAngle, setWallAngle] = useState(null)
  const [discipline, setDiscipline] = useState(null)
  const [grade, setGrade] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const [fallTimeMs, setFallTimeMs] = useState(null)
  const [focus, setFocus] = useState(profile?.climbingFocus ?? [])

  // Trim window defaults to the first min(maxTrimS, duration) seconds. The
  // scrubber clamps further edits so end - start <= maxTrimS.
  const [trim, setTrim] = useState(() => ({
    startMs: 0,
    endMs: Math.round(Math.min(durationS, maxTrimS) * 1000),
  }))

  // When duration arrives late (loadedmetadata races React state), re-seed
  // the trim so we don't get stuck at endMs=0.
  useEffect(() => {
    if (durationS > 0 && trim.endMs === 0) {
      setTrim({ startMs: 0, endMs: Math.round(Math.min(durationS, maxTrimS) * 1000) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationS])

  // If the user marked a fall outside the current trim window, clear it
  // so they re-mark inside the analyzed range.
  useEffect(() => {
    if (fallTimeMs == null) return
    if (fallTimeMs < trim.startMs || fallTimeMs > trim.endMs) setFallTimeMs(null)
  }, [trim.startMs, trim.endMs, fallTimeMs])

  // Reset grade if discipline switches between boulder and not (different scales)
  useEffect(() => {
    setGrade(null)
  }, [discipline])

  const gradeOptions = discipline === 'boulder' ? V_GRADES : YDS_GRADES
  const gradeSystem  = discipline === 'boulder' ? 'V' : 'YDS'

  const trimWindowS = (trim.endMs - trim.startMs) / 1000
  const trimOk = trimWindowS >= 0.5 && trimWindowS <= maxTrimS + 0.05

  const requiredOk = useMemo(() => {
    if (!venue || !wallAngle || !discipline || !grade || !outcome) return false
    if (outcome === 'fell' && fallTimeMs == null) return false
    if (!trimOk) return false
    return true
  }, [venue, wallAngle, discipline, grade, outcome, fallTimeMs, trimOk])

  const toggleFocus = (tag) => {
    setFocus((prev) => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const handleSubmit = () => {
    if (!requiredOk) return
    onSubmit({
      venue,
      wallAngle,
      discipline,
      grade: { system: gradeSystem, value: grade },
      outcome,
      fallTimeMs: outcome === 'fell' ? fallTimeMs : null,
      focus,
      trimStartMs: trim.startMs,
      trimEndMs: trim.endMs,
    })
  }

  return (
    <div className="rounded-2xl bg-ct-forest-deep border border-ct-hairline p-5 md:p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-base font-bold text-ct-cream">About this climb</h3>
        <p className="text-xs text-ct-cream/55 mt-1 leading-snug">
          A few quick questions before we analyze — they make the feedback much more accurate.
        </p>
      </div>

      {/* Trim — pick which portion of the clip to analyze. Shorter, focused
          windows give cleaner reads; cap is enforced by TrimScrubber. */}
      <Field
        label="Trim"
        hint={`Drag the handles to pick the section you want analyzed (up to ${maxTrimS} s). Shorter clips give the cleanest reads.`}
      >
        <TrimScrubber
          videoRef={videoRef}
          durationS={durationS}
          startMs={trim.startMs}
          endMs={trim.endMs}
          maxWindowS={maxTrimS}
          onChange={setTrim}
        />
      </Field>

      {/* Venue */}
      <Field label="Where" hint="Board = Kilter, Moon, Tension or other system board. Analysis is tuned for the bigger movement style.">
        <PillGroup options={VENUES} value={venue} onChange={setVenue} />
      </Field>

      {/* Wall angle */}
      <Field label="Wall angle">
        <PillGroup options={WALL_ANGLES} value={wallAngle} onChange={setWallAngle} />
      </Field>

      {/* Discipline */}
      <Field label="Discipline">
        <PillGroup options={DISCIPLINES} value={discipline} onChange={setDiscipline} />
      </Field>

      {/* Grade — only enabled once discipline is set */}
      <Field
        label={`Grade${discipline ? ` (${gradeSystem === 'V' ? 'V-scale' : 'YDS'})` : ''}`}
        hint={!discipline ? 'Pick a discipline first.' : null}
      >
        {discipline && (
          <ScrollPillGroup
            options={gradeOptions.map(v => ({ value: v, label: v }))}
            value={grade}
            onChange={setGrade}
          />
        )}
      </Field>

      {/* Outcome */}
      <Field label="Outcome">
        <div className="flex gap-2">
          {OUTCOMES.map((opt) => {
            const selected = outcome === opt.value
            const Icon = opt.Icon
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setOutcome(opt.value)
                  if (opt.value !== 'fell') setFallTimeMs(null)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  selected
                    ? 'bg-ct-terracotta border-ct-terracotta text-ct-cream'
                    : 'bg-ct-hairline border-ct-rim text-ct-cream/70 hover:border-ct-terracotta/50'
                }`}
              >
                <Icon size={14} strokeWidth={2.2} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </Field>

      {/* Fall scrubber — appears only when outcome === 'fell' */}
      {outcome === 'fell' && (
        <Field
          label="Mark the fall"
          hint="Scrub to the moment you came off — analysis weights errors here."
          required
        >
          <FallScrubber
            videoRef={videoRef}
            durationS={durationS}
            minS={trim.startMs / 1000}
            maxS={trim.endMs / 1000}
            value={fallTimeMs}
            onChange={setFallTimeMs}
          />
        </Field>
      )}

      {/* Focus tags (optional, multi-select) */}
      <Field label="Focus" hint="Optional — pre-biases what the analyzer pays attention to.">
        <div className="flex flex-wrap gap-2">
          {FOCUS_TAGS.map((tag) => {
            const selected = focus.includes(tag.value)
            return (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleFocus(tag.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selected
                    ? 'bg-ct-terra-tint border-ct-terracotta/60 text-ct-terra-soft'
                    : 'bg-ct-hairline border-ct-rim text-ct-cream/60 hover:border-ct-terracotta/40'
                }`}
              >
                {selected && <CheckCircle2 size={11} />}
                {tag.label}
              </button>
            )
          })}
        </div>
      </Field>

      {/* Validation hint when fields are missing */}
      {!requiredOk && (
        <div className="flex items-start gap-2 text-[11px] text-ct-cream/45 px-0.5">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            {!venue && 'Where, '}
            {!wallAngle && 'wall angle, '}
            {!discipline && 'discipline, '}
            {!grade && 'grade, '}
            {!outcome && 'outcome, '}
            {outcome === 'fell' && fallTimeMs == null && 'fall frame, '}
            {!trimOk && `trim window (max ${maxTrimS}s), `}
            <span className="text-ct-cream/35">— required.</span>
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-ct-cream/60 hover:text-ct-cream px-3 py-2 rounded-lg transition-colors"
        >
          Cancel upload
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!requiredOk}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
        >
          Analyze
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Field wrapper ────────────────────────────────────────────────────

function Field({ label, hint, required, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ct-cream/55">
          {label}
        </span>
        {required && <span className="text-[10px] text-ct-terracotta">required</span>}
      </div>
      {children}
      {hint && <p className="text-[11px] text-ct-cream/40 leading-snug">{hint}</p>}
    </div>
  )
}

// ── Pill group (single-select) ───────────────────────────────────────

function PillGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors ${
              selected
                ? 'bg-ct-terracotta border-ct-terracotta text-ct-cream'
                : 'bg-ct-hairline border-ct-rim text-ct-cream/70 hover:border-ct-terracotta/50'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Scrollable pill group (single-select; for many options like grades) ─

function ScrollPillGroup({ options, value, onChange }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1 scrollbar-thin">
      <div className="flex gap-2 pb-1">
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ct-tnum ${
                selected
                  ? 'bg-ct-terracotta border-ct-terracotta text-ct-cream'
                  : 'bg-ct-hairline border-ct-rim text-ct-cream/70 hover:border-ct-terracotta/50'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
