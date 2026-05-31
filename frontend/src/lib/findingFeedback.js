/**
 * Per-finding user feedback — the "this was wrong" signal.
 *
 * Why this matters: even with body-relative thresholds, multi-signal
 * gates, and calibration, rules will misfire on edge cases we haven't
 * seen yet. Without a feedback channel, those misfires never make it
 * back into the system and the climber just learns to ignore them.
 *
 * With a feedback channel:
 *   • Climber taps "wrong" on a misfire
 *   • Per-rule wrong-count grows in localStorage
 *   • Aggregated over weeks of use, a high wrong-count surfaces
 *     in calibration panel as "rule X is misfiring often — submit
 *     for review" (a future hook)
 *   • Eventually shipped server-side: per-rule wrong-rate across users
 *     drives empirical threshold tuning
 *
 * The schema is keyed by (ruleId, instanceTimestamp) so the same rule
 * misfiring on different moves can be marked independently — useful
 * when you want to flag "this specific instance was wrong" vs "I never
 * trust this rule." Aggregate stats per ruleId are derivable.
 */

const STORAGE_KEY = 'coretriage:movementAnalyzer:findingFeedback'

/**
 * Load the entire feedback record.
 * Shape: { [ruleId]: { wrongInstances: { [tsMs]: ISOString }, totalWrong: number } }
 */
export function loadFeedback() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed != null ? parsed : {}
  } catch {
    return {}
  }
}

function save(record) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Quota or private mode — silently skip.
  }
}

/**
 * Mark a finding instance as wrong. Idempotent — calling twice doesn't
 * double-count.
 */
export function markFindingWrong(record, ruleId, instanceTsMs) {
  const next = { ...record }
  const entry = next[ruleId] ? { ...next[ruleId] } : { wrongInstances: {}, totalWrong: 0 }
  const key = String(instanceTsMs)
  if (!entry.wrongInstances[key]) {
    entry.wrongInstances = { ...entry.wrongInstances, [key]: new Date().toISOString() }
    entry.totalWrong = (entry.totalWrong ?? 0) + 1
  }
  next[ruleId] = entry
  save(next)
  return next
}

/**
 * Undo a wrong-mark.
 */
export function unmarkFindingWrong(record, ruleId, instanceTsMs) {
  const next = { ...record }
  const entry = next[ruleId] ? { ...next[ruleId] } : null
  if (!entry) return next
  const key = String(instanceTsMs)
  if (entry.wrongInstances?.[key]) {
    const { [key]: _, ...rest } = entry.wrongInstances
    entry.wrongInstances = rest
    entry.totalWrong = Math.max(0, (entry.totalWrong ?? 0) - 1)
  }
  next[ruleId] = entry
  save(next)
  return next
}

/**
 * Quick check: was this specific instance marked wrong?
 */
export function isFindingWrong(record, ruleId, instanceTsMs) {
  return !!record?.[ruleId]?.wrongInstances?.[String(instanceTsMs)]
}

/**
 * Has this rule been marked wrong on ANY instance? Useful for surfacing
 * "rule has historic false positives" hints elsewhere.
 */
export function ruleHasWrongHistory(record, ruleId) {
  return (record?.[ruleId]?.totalWrong ?? 0) > 0
}
