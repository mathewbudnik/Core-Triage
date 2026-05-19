/**
 * Tier system constants + helpers. Mirrors src/climb_grades.py's
 * tier mapping, but with hex tokens for theming.
 *
 * Each tier exposes three colors: light (highlights), c (main), deep
 * (gradient endpoint + halo). Glow uses c at ~22% alpha.
 */

export const V_TIERS = ['v0','v1','v2','v3','v4','v5','v6','v7','v8','v9','v10']

// Tier names are famous boulder problems at the matching grade. Grades
// are conservative best-effort — flag any name that's wrong for its tier.
export const TIER_NAMES = {
  v0:  "Plumber's Crack",     // Flatirons, CO — V0
  v1:  'Penrose Step',        // Flatirons, CO — V1
  v2:  'King Tut',            // Bishop, CA — V2
  v3:  'Iron Cross',          // Bishop, CA — V3
  v4:  'Ironman Traverse',    // Bishop, CA — V4
  v5:  'Power of Silence',    // RMNP, CO — V5
  v6:  'Pope’s Prow',    // Bishop, CA — V6
  v7:  'Solarium',            // Bishop, CA — V7
  v8:  'Midnight Lightning',  // Yosemite, CA — V8
  v9:  'Diaphanous Sea',      // Bishop, CA — V9
  v10: 'Direction',           // RMNP, CO — V10
}

// Bright pastel palette, alternating hot/cold each step. No yellow or
// yellow-adjacent hues. Hot slots use peach / coral / pink family; cold
// slots use mint / lavender / sky / aqua / periwinkle.
export const TIER_TOKENS = {
  // hot — apricot
  v0:  { light: '#fed7aa', c: '#fdba74', deep: '#9a3412' },
  // cold — mint
  v1:  { light: '#d1fae5', c: '#a7f3d0', deep: '#047857' },
  // hot — peach
  v2:  { light: '#fde0d0', c: '#fcc8ba', deep: '#9a3412' },
  // cold — lavender
  v3:  { light: '#ddd6fe', c: '#c4b5fd', deep: '#5b21b6' },
  // hot — coral
  v4:  { light: '#fecdd3', c: '#fda4af', deep: '#9f1239' },
  // cold — sky
  v5:  { light: '#bae6fd', c: '#7dd3fc', deep: '#0c4a6e' },
  // hot — bubblegum pink
  v6:  { light: '#fbcfe8', c: '#f9a8d4', deep: '#9d174d' },
  // cold — aqua
  v7:  { light: '#ccfbf1', c: '#99f6e4', deep: '#115e59' },
  // hot — hot pink
  v8:  { light: '#fbcfe8', c: '#f472b6', deep: '#831843' },
  // cold — periwinkle
  v9:  { light: '#c7d2fe', c: '#a5b4fc', deep: '#3730a3' },
  // hot — rose-red
  v10: { light: '#fda4af', c: '#fb7185', deep: '#881337' },
}

/** Map a V-grade string ('V0'..'V17') to a tier id. V10+ collapses to 'v10'. */
export function vGradeToTier(grade) {
  const m = /^V(\d{1,2})$/.exec(grade || '')
  if (!m) return null
  const n = Math.min(Number(m[1]), 10)
  return `v${n}`
}

/** YDS → tier map per the design chart. */
const YDS_TO_TIER = {
  '5.6':'v0','5.7':'v0','5.8':'v0','5.9':'v0',
  '5.10a':'v0','5.10b':'v0','5.10c':'v0','5.10d':'v0',
  '5.11a':'v1',
  '5.11b':'v2','5.11c':'v2',
  '5.11d':'v3',
  '5.12a':'v4','5.12b':'v4',
  '5.12c':'v5','5.12d':'v5',
  '5.13a':'v6',
  '5.13b':'v7',
  '5.13c':'v8',
  '5.13d':'v9',
  '5.14a':'v10','5.14b':'v10','5.14c':'v10','5.14d':'v10',
  '5.15a':'v10','5.15b':'v10','5.15c':'v10','5.15d':'v10',
}

export function ydsToTier(grade) {
  return YDS_TO_TIER[grade] || null
}

/** Pick the higher of two tier ids; null-safe. */
export function maxTier(a, b) {
  if (!a) return b || 'v0'
  if (!b) return a
  return V_TIERS.indexOf(a) >= V_TIERS.indexOf(b) ? a : b
}

/** Given a hardest-grade dict { boulder, route }, return the working tier id. */
export function workingTierFromHardest(hardest) {
  const a = hardest?.boulder ? vGradeToTier(hardest.boulder) : null
  const b = hardest?.route   ? ydsToTier(hardest.route)      : null
  return maxTier(a, b) || 'v0'
}

/** Return the next-higher tier id, or null if already at v10. */
export function nextTier(tierId) {
  const idx = V_TIERS.indexOf(tierId)
  if (idx < 0 || idx >= V_TIERS.length - 1) return null
  return V_TIERS[idx + 1]
}

/**
 * Resolve any climbing grade (V-grade or YDS) to its tier-token entry.
 * Falls back to v0 (Frost) for unrecognised inputs so callers can always
 * read `.c` / `.light` / `.deep` without guarding.
 */
export function tokenForGrade(grade) {
  const tierId = vGradeToTier(grade) ?? ydsToTier(grade) ?? 'v0'
  return TIER_TOKENS[tierId]
}
