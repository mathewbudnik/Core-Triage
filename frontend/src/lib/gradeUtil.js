/**
 * V-grade parsing and display helpers.
 * V-grades are integer-valued ("V0" through "V10+").
 * Route grades (5.x) are handled separately via lib/tier.js's ydsToTier.
 */

/**
 * Parse a V-grade string ("V6") into its integer value (6).
 * Returns null for anything that isn't a V-grade string.
 */
export function gradeStringToNum(g) {
  if (typeof g !== 'string') return null
  const m = g.trim().toLowerCase().match(/^v(\d+)$/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Format an integer V-grade number for display.
 * 0..10 → "V0"..."V10"
 * 11+ → "V10+"
 * null/undefined/NaN → "—"
 */
export function formatGrade(n) {
  if (n === null || n === undefined) return '—'
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  if (n >= 11) return 'V10+'
  return `V${Math.floor(n)}`
}
