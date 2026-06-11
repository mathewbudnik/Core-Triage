import { useMemo, useState } from 'react'
import { logTraining } from '../api'
import { useTrainingBaseline } from './useTrainingBaseline'
import { vGradeToTier, ydsToTier, V_TIERS } from '../lib/tier'
import { useRewardEngine } from '../lib/rewardEngine'
import { getActiveStyle } from '../lib/styleStore'
import { modalityFromSessionType, previewSendXP } from '../lib/sendPreview'

// Plausibility-check thresholds. Tier diffs are computed using V_TIERS
// indices (V0..V10) — for routes the YDS grade is first mapped to a
// tier, so a 5.13a (v6) vs 5.10b (v0) is a 6-tier jump.
const SOFT_PROMPT_TIER_DIFF   = 3   // simple confirm at +3 above hardest
const STRONG_PROMPT_TIER_DIFF = 5   // confirm + required note at +5

export const SESSION_TYPES = ['bouldering', 'routes', 'outdoor', 'hangboard', 'strength', 'rest']

// Session types where logging individual climbs makes sense. Hangboard /
// strength / rest are training sessions — they hide the climb section AND
// the "grades sent" free-text field, leaving only date/duration/intensity/notes.
const CLIMB_SESSION_TYPES = new Set(['bouldering', 'routes', 'outdoor'])

// Plan templates emit types like 'power', 'project', 'endurance' that aren't
// in SESSION_TYPES. Map them to the closest real session_type so the form
// defaults sensibly and the climbs section actually renders.
const PREFILL_TO_SESSION_TYPE = {
  bouldering: 'bouldering',
  routes:     'routes',
  outdoor:    'outdoor',
  hangboard:  'hangboard',
  strength:   'strength',
  rest:       'rest',
  power:      'bouldering',
  limit:      'bouldering',
  project:    'bouldering',
  technique:  'bouldering',
  endurance:  'routes',
  mobility:   'rest',
}

export function normalizeSessionType(input) {
  if (!input) return 'bouldering'
  return PREFILL_TO_SESSION_TYPE[input.toString().toLowerCase()] ?? 'bouldering'
}

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

// Merge the staged Quick sends into a climbs dict (V-grades → boulder
// discipline) using s/f/p counters, returning a fresh object.
function mergeQuickSends(baseClimbs, quickSends) {
  const merged = JSON.parse(JSON.stringify(baseClimbs || {}))
  for (const s of quickSends) {
    const discipline = 'boulder'
    merged[discipline] = merged[discipline] || {}
    const counters = merged[discipline][s.grade] || { s: 0, f: 0, p: 0 }
    if (s.outcome === 'flash')        counters.f += 1
    else if (s.outcome === 'project') counters.p += 1
    else                              counters.s += 1
    merged[discipline][s.grade] = counters
  }
  return merged
}

function hasAnyBulkClimb(climbs) {
  for (const discipline of ['boulder', 'route']) {
    const gradeMap = climbs?.[discipline] || {}
    for (const counters of Object.values(gradeMap)) {
      if (counters && ((counters.s || 0) + (counters.f || 0) + (counters.p || 0)) > 0) return true
    }
  }
  return false
}

/**
 * Logging logic for a climb/training session — extracted verbatim from the
 * legacy TrainingLogEntry so the new drawer UI can reuse it untouched.
 *
 * The save path (merge Quick sends → POST /api/training → dispatch
 * ct:new-pr / ct:award-unlocked / ct:tier-promotion → reward-engine walk →
 * SessionSummaryOverlay) is byte-for-byte equivalent to the old component;
 * only the surrounding presentation changes.
 *
 * Params:
 *   user        — current user (for the plausibility baseline; null = anon)
 *   prefill     — { sessionType?, duration_min? } seeded from a planned session
 *   onClose     — called to dismiss the host drawer/sheet after a log resolves
 */
export function useSessionLog({ user, prefill = {}, onClose } = {}) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState(() => ({
    date: today,
    session_type: normalizeSessionType(prefill.sessionType),
    duration_min: Number.isFinite(prefill.duration_min) ? prefill.duration_min : 90,
    intensity: 7,
    grades_sent: '',
    notes: '',
    climbs: {},
  }))
  const [bulkMode, setBulkMode] = useState(false)          // single-send vs grade-counter grid
  const [quickSends, setQuickSends] = useState([])         // [{ grade, outcome, stylePrimary }]
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

  const showClimbSection = CLIMB_SESSION_TYPES.has(form.session_type)

  function addSend(s) {
    setQuickSends((prev) => [...prev, s])
  }
  function removeSend(i) {
    setQuickSends((prev) => prev.filter((_, j) => j !== i))
  }

  // Live session total for the footer: staged Quick sends (isDeepLog:false)
  // + bulk grade-counter sends (isDeepLog:true), priced with previewSendXP.
  const sessionTotal = useMemo(() => {
    let xp = 0
    let count = 0
    const defaultStyle = getActiveStyle()
    for (const s of quickSends) {
      xp += previewSendXP({ grade: s.grade, outcome: s.outcome, stylePrimary: s.stylePrimary, sessionType: form.session_type, isDeepLog: false }, engineState).xp
      count += 1
    }
    for (const discipline of ['boulder', 'route']) {
      const gradeMap = form.climbs?.[discipline] || {}
      for (const [grade, counters] of Object.entries(gradeMap)) {
        if (!counters) continue
        for (let i = 0; i < (counters.s || 0); i++) { xp += previewSendXP({ grade, outcome: 'redpoint', stylePrimary: defaultStyle, sessionType: form.session_type, isDeepLog: true }, engineState).xp; count += 1 }
        for (let i = 0; i < (counters.f || 0); i++) { xp += previewSendXP({ grade, outcome: 'flash', stylePrimary: defaultStyle, sessionType: form.session_type, isDeepLog: true }, engineState).xp; count += 1 }
      }
    }
    return { xp, count }
  }, [quickSends, form.climbs, form.session_type, engineState])

  // Non-climb sessions are always saveable (no climbs needed). Climb
  // sessions require at least one staged send before the CTA enables —
  // mirrors the old per-mode gating.
  const canSave = !showClimbSection || quickSends.length > 0 || hasAnyBulkClimb(form.climbs)

  // Save the session. The host stays mounted while the API call is in flight
  // (1–3 s) so the SessionSummaryOverlay can render. onClose?.() fires from:
  //   1. The overlay's onClose (after the user dismisses the celebration).
  //   2. Early-return paths (no sends to celebrate, non-climb sessions, errors).
  function performSave(extraNote) {
    setPending(null)
    setError(null)
    setSaving(true)
    // Snapshot form + quickSends now before any async work.
    const payload = extraNote
      ? { ...form, notes: form.notes ? `${form.notes}\n${extraNote}` : extraNote }
      : form

    // Merge Quick sends into the API payload so the backend sees them.
    // Quick mode is V-grades only (boulder discipline).
    const apiPayload = { ...payload, climbs: mergeQuickSends(payload.climbs, quickSends) }

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
          onClose?.()
          return
        }

        // Engine walk: Quick sends (isDeepLog: false) + Deep sends from
        // form.climbs only (isDeepLog: true). Do NOT walk the merged dict
        // here to avoid double-counting Quick sends merged for the API.
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
          setQuickSends([])
          onClose?.()
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
        // Surface the failure via the global toast channel and close the host.
        window.dispatchEvent(new CustomEvent('ct:toast', {
          detail: { kind: 'error', message: err?.message || 'Could not log your session. Try again.' },
        }))
        onClose?.()
      } finally {
        setSaving(false)
      }
    })()
  }

  function save() {
    if (saving) return
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

  return {
    form, set,
    quickSends, addSend, removeSend,
    bulkMode, setBulkMode,
    save, saving, error,
    canSave, sessionTotal,
    pending, confirmPending: (note) => performSave(note), dismissPending: () => setPending(null),
    summaryOpen, summary, closeSummary: () => { setSummaryOpen(false); onClose?.() },
    engineState,
    showClimbSection,
  }
}
