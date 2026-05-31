/**
 * Grade tier classification for context-aware rule tuning.
 *
 * The rule engine tightens certain detectors (H04 barn-door, K01 high-step,
 * H01 banana sag) at advanced grades — climbers at V7+/5.12+ are doing
 * intentional dynamic moves (pogos, dynos, controlled cuts, momentum)
 * that the simpler detectors would otherwise flag as mistakes. Tightening
 * means MORE evidence required (longer sustain, higher confidence), not
 * disabling — a genuine barn-door at V10 is still a barn-door.
 *
 * Tier thresholds (per locked design):
 *   • beginner     = V0–V3      or 5.6–5.10c
 *   • intermediate = V4–V6      or 5.10d–5.11d
 *   • advanced     = V7+        or 5.12a+      ← triggers tighter detectors
 *
 * `isAdvancedGrade(grade)` is the binary the engine reads; the named tier
 * is exposed for future per-tier UI (e.g. context summary chip).
 */

const ADVANCED_V_MIN = 7
const ADVANCED_YDS_MIN = 12

/**
 * @param {{system:'V'|'YDS', value:string}|null|undefined} grade
 * @returns {'beginner'|'intermediate'|'advanced'|null}
 */
export function parseGradeTier(grade) {
  if (!grade?.system || !grade?.value) return null
  if (grade.system === 'V') {
    const n = parseInt(grade.value.slice(1), 10)
    if (Number.isNaN(n)) return null
    if (n >= ADVANCED_V_MIN) return 'advanced'
    if (n >= 4) return 'intermediate'
    return 'beginner'
  }
  if (grade.system === 'YDS') {
    const m = grade.value.match(/^5\.(\d+)([a-d])?$/)
    if (!m) return null
    const n = parseInt(m[1], 10)
    if (n >= ADVANCED_YDS_MIN) return 'advanced'
    if (n >= 10) return 'intermediate'
    return 'beginner'
  }
  return null
}

/**
 * Convenience: just the V7+/5.12+ check the engine actually uses.
 */
export function isAdvancedGrade(grade) {
  return parseGradeTier(grade) === 'advanced'
}
