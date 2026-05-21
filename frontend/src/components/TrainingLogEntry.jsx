import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { logTraining } from '../api'
import { useTrainingBaseline } from '../hooks/useTrainingBaseline'
import { vGradeToTier, ydsToTier, V_TIERS } from '../lib/tier'
import { useRewardEngine } from '../lib/rewardEngine'
import { getActiveStyle } from '../lib/styleStore'
import DatePicker from './DatePicker'
import PlausibilityConfirmModal from './PlausibilityConfirmModal'
import LogModeToggle from './ui/LogModeToggle'
import LogSendQuick from './ui/LogSendQuick'
import LogSendDeep from './ui/LogSendDeep'
import SessionSummaryOverlay from './ui/SessionSummaryOverlay'
import { modalityFromSessionType } from '../lib/sendPreview'

// Plausibility-check thresholds. Tier diffs are computed using V_TIERS
// indices (V0..V10) — for routes the YDS grade is first mapped to a
// tier, so a 5.13a (v6) vs 5.10b (v0) is a 6-tier jump.
const SOFT_PROMPT_TIER_DIFF   = 3   // simple confirm at +3 above hardest
const STRONG_PROMPT_TIER_DIFF = 5   // confirm + required note at +5

// Walk a climbs dict and find the single highest claimed grade per
// discipline (sends only — `s > 0`). Returns { boulder, route } where
// each value is the grade string or null.
function maxGradesIn(climbs) {
  const out = { boulder: null, route: null }
  for (const discipline of ['boulder', 'route']) {
    const grades = climbs?.[discipline] || {}
    let bestTier = -1
    let bestGrade = null
    for (const [grade, counters] of Object.entries(grades)) {
      if (!counters || (counters.s || 0) <= 0) continue
      const tierId = discipline === 'boulder' ? vGradeToTier(grade) : ydsToTier(grade)
      const tierIdx = tierId ? V_TIERS.indexOf(tierId) : -1
      if (tierIdx > bestTier) {
        bestTier = tierIdx
        bestGrade = grade
      }
    }
    out[discipline] = bestGrade
  }
  return out
}

function tierIndexFor(grade, discipline) {
  if (!grade) return -1
  const tierId = discipline === 'boulder' ? vGradeToTier(grade) : ydsToTier(grade)
  return tierId ? V_TIERS.indexOf(tierId) : -1
}

// Decide whether to show a plausibility prompt for this save. Returns
// the prompt level + details, or null when the log can save directly.
function plausibilityCheck(climbs, hardest) {
  const claimed = maxGradesIn(climbs)
  let worst = null  // most extreme outlier across both disciplines
  for (const discipline of ['boulder', 'route']) {
    const newGrade = claimed[discipline]
    if (!newGrade) continue
    const hardestGrade = hardest?.[discipline]
    const newIdx = tierIndexFor(newGrade, discipline)
    const oldIdx = hardestGrade ? tierIndexFor(hardestGrade, discipline) : -1
    const diff = newIdx - oldIdx
    // Brand-new discipline (oldIdx = -1) gets a 1-tier "free pass" so
    // a real V5 climber's first log doesn't immediately prompt.
    const adjusted = oldIdx === -1 ? Math.max(0, diff - 1) : diff
    if (adjusted < SOFT_PROMPT_TIER_DIFF) continue
    if (!worst || adjusted > worst.tierDiff) {
      worst = {
        discipline,
        newGrade,
        hardestGrade: hardestGrade || null,
        tierDiff: adjusted,
        level: adjusted >= STRONG_PROMPT_TIER_DIFF ? 'strong' : 'soft',
      }
    }
  }
  return worst
}

const SESSION_TYPES = ['bouldering', 'routes', 'outdoor', 'hangboard', 'strength', 'rest']

// Session types where logging individual climbs makes sense. Hangboard /
// strength / rest are training sessions — they hide the climb section AND
// the "grades sent" free-text field, leaving only date/duration/intensity/notes.
const CLIMB_SESSION_TYPES = new Set(['bouldering', 'routes', 'outdoor'])

const INTENSITY_LABELS = {
  1: 'Very easy', 2: 'Easy', 3: 'Easy-moderate',
  4: 'Moderate', 5: 'Moderate', 6: 'Moderate-hard',
  7: 'Hard', 8: 'Very hard', 9: 'Maximal', 10: 'Absolute max',
}

// Matches the triage pain slider: teal (≤3) → amber (4-6) → coral (≥7).
// Same three anchors drive the gradient track + the value label so the bar
// and the number recolor in lockstep.
const INTENSITY_HEX = (val) => {
  if (val <= 3) return '#14b8a6'  // teal (accent)
  if (val <= 6) return '#fbbf24'  // amber (accent3)
  return '#fb7185'                 // coral (accent2)
}

const INTENSITY_GRADIENT = 'linear-gradient(90deg, #14b8a6 0%, #fbbf24 50%, #fb7185 100%)'
const TEAL_GRADIENT      = 'linear-gradient(90deg, #14b8a6 0%, #7dd3c0 100%)'

/**
 * Shared range slider with a custom gradient track + visible draggable pill.
 *
 * The native `<input type="range">` sits on top fully transparent (still
 * catches drag/tap), and we render the fill bar + thumb as separate divs so
 * we can fully control their look without fighting per-browser thumb pseudo-
 * elements.
 *
 * Props:
 *   value, min, max, step, onChange — standard range controls
 *   gradient       — CSS background for the fill bar
 *   thumbRingColor — CSS color for the thumb's outer ring (defaults to muted)
 *   ariaLabel      — accessible label for the native input
 */
function GradientSlider({
  value, min, max, step = 1, onChange,
  gradient, thumbRingColor = 'rgba(255,255,255,0.35)', ariaLabel,
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="relative h-2.5 rounded-full bg-panel/70 overflow-visible">
      {/* Track fill */}
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct}%`, background: gradient }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      />
      {/* Visible draggable pill — non-interactive; the input below catches drags */}
      <motion.div
        className="absolute top-1/2 w-5 h-5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.45)]
                   ring-2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
        style={{ left: `${pct}%`, '--tw-ring-color': thumbRingColor }}
        animate={{ left: `${pct}%` }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
      />
    </div>
  )
}

export default function TrainingLogEntry({ user, sessionType: prefillType, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    session_type: prefillType || 'bouldering',
    duration_min: 90,
    intensity: 7,
    grades_sent: '',
    notes: '',
    climbs: {},
  })
  const [logMode, setLogMode] = useState('quick')  // 'quick' | 'deep'
  const [quickSends, setQuickSends] = useState([]) // [{ grade, outcome, stylePrimary }]
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState({ totalXP: 0, events: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { logSends, state: engineState } = useRewardEngine()

  // Plausibility check state. When `pending` is set, a modal blocks the
  // save until the user confirms or edits the grade. The baseline hook
  // re-fetches on `refresh()` after a successful save so the threshold
  // moves with the climber.
  const baseline = useTrainingBaseline(user)
  const [pending, setPending] = useState(null)

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  // Save the session. The modal stays open while the API call is in flight
  // (1–3 s) so the SessionSummaryOverlay can render on the mounted component.
  // onSave?.() is called from exactly two places:
  //   1. The overlay's onClose (after the user dismisses the celebration).
  //   2. Early-return paths (no sends to celebrate, non-climb sessions, errors).
  function performSave(extraNote) {
    setPending(null)
    setError(null)
    // Snapshot form + quickSends now before any async work.
    const payload = extraNote
      ? { ...form, notes: form.notes ? `${form.notes}\n${extraNote}` : extraNote }
      : form

    // --- Critical fix 2: merge Quick sends into the API payload so the
    // backend sees them. Quick mode is V-grades only (boulder discipline).
    const mergedClimbs = JSON.parse(JSON.stringify(payload.climbs || {}))
    for (const s of quickSends) {
      const discipline = 'boulder'
      mergedClimbs[discipline] = mergedClimbs[discipline] || {}
      const counters = mergedClimbs[discipline][s.grade] || { s: 0, f: 0, p: 0 }
      if (s.outcome === 'flash')        counters.f += 1
      else if (s.outcome === 'project') counters.p += 1
      else                              counters.s += 1
      mergedClimbs[discipline][s.grade] = counters
    }
    const apiPayload = { ...payload, climbs: mergedClimbs }

    // Fire the network call. We stay mounted so setSummaryOpen(true) reaches
    // the overlay that's already rendered inside our JSX tree.
    return (async () => {
      try {
        const res = await logTraining(apiPayload)
        if (res?.new_prs && (res.new_prs.boulder || res.new_prs.route)) {
          window.dispatchEvent(new CustomEvent('ct:new-pr', { detail: res.new_prs }))
        }
        if (Array.isArray(res?.new_awards) && res.new_awards.length) {
          window.dispatchEvent(new CustomEvent('ct:award-unlocked', { detail: { awards: res.new_awards } }))
        }
        if (res?.tier_change && res.tier_change.from !== res.tier_change.to) {
          window.dispatchEvent(new CustomEvent('ct:tier-promotion', { detail: res.tier_change }))
        }
        baseline.refresh()

        const defaultStyle = getActiveStyle()
        const modality = modalityFromSessionType(form.session_type)

        // For non-climb sessions (hangboard/strength/rest) there are no sends
        // to celebrate — close immediately after the API resolves.
        if (!CLIMB_SESSION_TYPES.has(form.session_type)) {
          onSave?.()
          return
        }

        // Engine walk: Quick sends (isDeepLog: false) + Deep sends from
        // form.climbs only (isDeepLog: true). Do NOT walk mergedClimbs here
        // to avoid double-counting Quick sends that were merged for the API.
        const allSends = []
        const now = Date.now()
        for (const s of quickSends) {
          allSends.push({
            grade: s.grade, modality, outcome: s.outcome,
            stylePrimary: s.stylePrimary, isDeepLog: false, ts: now,
          })
        }
        for (const discipline of ['boulder', 'route']) {
          const gradeMap = payload.climbs?.[discipline] || {}
          for (const [grade, counters] of Object.entries(gradeMap)) {
            if (!counters) continue
            for (let i = 0; i < (counters.s || 0); i++) {
              allSends.push({ grade, modality, outcome: 'redpoint', stylePrimary: defaultStyle, isDeepLog: true, ts: now })
            }
            for (let i = 0; i < (counters.f || 0); i++) {
              allSends.push({ grade, modality, outcome: 'flash', stylePrimary: defaultStyle, isDeepLog: true, ts: now })
            }
          }
        }

        if (allSends.length === 0) {
          // Nothing to celebrate — close the drawer now.
          setQuickSends([])
          onSave?.()
          return
        }

        const allEvents = logSends(allSends)
        const summaryEvents = []
        let totalXP = 0
        for (let i = 0; i < allEvents.length; i++) {
          const ev = allEvents[i]
          const send = allSends[i]
          if (ev.xpEarned > 0) {
            summaryEvents.push({
              kind: 'send',
              label: `${send.grade} ${send.outcome}`,
              sublabel: send.stylePrimary,
              xp: ev.xpEarned,
            })
            totalXP += ev.xpEarned
          }
          if (ev.isPersonalRecord) {
            summaryEvents.push({ kind: 'pr', label: `New ${send.stylePrimary} PR · ${send.grade}` })
          }
          if (ev.leveledUp) {
            summaryEvents.push({ kind: 'levelUp', label: `Reached Lv ${ev.level}` })
          }
        }
        setSummary({ totalXP, events: summaryEvents })
        setSummaryOpen(true)
        setQuickSends([])
      } catch (err) {
        // Surface the failure via the global toast channel and close the drawer.
        window.dispatchEvent(new CustomEvent('ct:toast', {
          detail: { kind: 'error', message: err?.message || 'Could not log your session. Try again.' },
        }))
        onSave?.()
      }
    })()
  }

  function handleSave() {
    // Skip plausibility checks during the calibration window — a real
    // V8 climber needs to establish their baseline without artificial
    // friction. After 5 sessions logged, the check kicks in.
    if (!baseline.isCalibrated) {
      performSave()
      return
    }
    const flag = plausibilityCheck(form.climbs, baseline.hardestAlltime)
    if (flag) {
      setPending(flag)
      return
    }
    performSave()
  }

  const showClimbSection = CLIMB_SESSION_TYPES.has(form.session_type)

  return (
    <>
      <SessionSummaryOverlay
        open={summaryOpen}
        onClose={() => { setSummaryOpen(false); onSave?.() }}
        events={summary.events}
        totalXP={summary.totalXP}
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-4"
      >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text">Log this session</p>
        {onCancel && (
          <button onClick={onCancel} className="text-muted hover:text-text">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Date + type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted mb-1">Date</p>
          <DatePicker value={form.date} onChange={(v) => set('date', v)} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Session type</p>
          <select
            value={form.session_type}
            onChange={(e) => set('session_type', e.target.value)}
            className="w-full bg-panel border border-outline rounded-lg px-3 py-1.5 text-base sm:text-sm text-text outline-none focus:border-accent capitalize"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Duration — teal gradient track; matches Intensity structure */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs text-muted">Duration</p>
          <p className="text-lg font-extrabold text-accent">
            {form.duration_min}<span className="text-xs font-bold text-muted"> min</span>
          </p>
        </div>
        <GradientSlider
          value={form.duration_min}
          min={15}
          max={240}
          step={15}
          onChange={(v) => set('duration_min', v)}
          gradient={TEAL_GRADIENT}
          thumbRingColor="rgba(20,184,166,0.4)"
          ariaLabel="Duration in minutes"
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted">15 min</span>
          <span className="text-[10px] text-muted">4 hr</span>
        </div>
      </div>

      {/* Intensity — severity-graded gradient (teal → amber → coral) */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs text-muted">Intensity (RPE)</p>
          <p className="text-lg font-extrabold" style={{ color: INTENSITY_HEX(form.intensity) }}>
            {form.intensity}<span className="text-xs font-bold text-muted">/10</span>
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
          <span className="text-[10px] text-muted">Easy</span>
          <span className="text-[10px] font-semibold" style={{ color: INTENSITY_HEX(form.intensity) }}>
            {INTENSITY_LABELS[form.intensity]}
          </span>
          <span className="text-[10px] text-muted">Max</span>
        </div>
      </div>

      {/* Climbing-only fields: free-text grades + structured climb counters.
          Hidden entirely for training sessions (hangboard/strength/rest). */}
      {showClimbSection && (
        <div className="space-y-3">
          <LogModeToggle value={logMode} onChange={setLogMode} />
          {logMode === 'quick' && (
            <>
              <LogSendQuick
                sessionType={form.session_type}
                engineState={engineState}
                onCommit={(s) => setQuickSends((prev) => [...prev, s])}
              />
              {quickSends.length > 0 && (
                <div className="rounded-xl border border-ct-hairline p-3 space-y-1">
                  <p className="ct-eyebrow">Pending</p>
                  {quickSends.map((s, i) => (
                    <p key={i} className="text-xs text-ct-cream/80 flex justify-between">
                      <span>{s.grade} · {s.outcome} · {s.stylePrimary}</span>
                      <button
                        type="button"
                        onClick={() => setQuickSends((prev) => prev.filter((_, j) => j !== i))}
                        className="text-ct-cream/40 hover:text-ct-cream"
                      >×</button>
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
          {logMode === 'deep' && (
            <LogSendDeep
              value={form.climbs}
              onChange={(next) => set('climbs', next)}
              sessionType={form.session_type}
              engineState={engineState}
              defaultTab={form.session_type === 'routes' ? 'route' : 'boulder'}
            />
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <p className="text-xs text-muted mb-1">Notes (optional)</p>
        <textarea
          rows={2}
          placeholder="How did it feel? Any breakthroughs or setbacks?"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="w-full bg-panel border border-outline rounded-lg px-3 py-1.5 text-base sm:text-sm text-text placeholder:text-muted/50 outline-none focus:border-accent resize-none"
        />
      </div>

      {error && <p className="text-xs text-accent2">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? 'Saving…' : <><Check size={14} /> Save session</>}
      </button>

      {pending && (
        <PlausibilityConfirmModal
          level={pending.level}
          newGrade={pending.newGrade}
          hardestGrade={pending.hardestGrade}
          tierDiff={pending.tierDiff}
          onConfirm={(note) => performSave(note)}
          onEdit={() => setPending(null)}
        />
      )}
    </motion.div>
    </>
  )
}
