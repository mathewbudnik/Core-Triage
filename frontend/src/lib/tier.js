/**
 * Tier system constants + helpers. Mirrors src/climb_grades.py's
 * tier mapping, but with hex tokens for theming.
 *
 * Each tier exposes three colors: light (highlights), c (main), deep
 * (gradient endpoint + halo). Glow uses c at ~22% alpha.
 */

export const V_TIERS = ['v0','v1','v2','v3','v4','v5','v6','v7','v8','v9','v10']

// Tier names are famous boulder problems at (or representative of) each
// grade. Locations span Bishop, RMNP, Yosemite, Hueco, Flatirons — most
// climbers will recognize at least the harder ones (Midnight Lightning,
// The Mandala). Grades may be approximate for the top tier (v10 catches
// V10+ across the system).
export const TIER_NAMES = {
  v0:  "Plumber's Crack",     // Flatirons, CO — V0
  v1:  'Bachar Cracker',      // Yosemite, CA — V1
  v2:  'King Tut',            // Bishop, CA — V2
  v3:  'Bowling Pin',         // RMNP, CO — V3
  v4:  'Saigon',              // Hueco Tanks, TX — V4
  v5:  'Iron Resolution',     // Bishop, CA — V5
  v6:  'Slashface',           // Bishop, CA — V6
  v7:  'Solarium',            // Bishop, CA — V7
  v8:  'Midnight Lightning',  // Yosemite, CA — V8
  v9:  'Footprints',          // Bishop, CA — V9
  v10: 'The Mandala',         // Bishop, CA — V12 (catch-all for elite)
}

// Palette alternates hot/cold every step so adjacent grades read as
// visually distinct. Bright, saturated hues — no two neighbors share a
// hue family. Hot slots use yellow / orange / pink / gold / red; cold
// slots use sky / emerald / violet / cyan / royal blue.
export const TIER_TOKENS = {
  // hot
  v0:  { light: '#fde68a', c: '#fcd34d', deep: '#854d0e' },  // cream gold
  // cold
  v1:  { light: '#7dd3fc', c: '#38bdf8', deep: '#075985' },  // sky blue
  // hot
  v2:  { light: '#fdba74', c: '#fb923c', deep: '#9a3412' },  // orange
  // cold
  v3:  { light: '#34d399', c: '#10b981', deep: '#065f46' },  // emerald
  // hot
  v4:  { light: '#f9a8d4', c: '#ec4899', deep: '#9d174d' },  // hot pink
  // cold
  v5:  { light: '#a78bfa', c: '#8b5cf6', deep: '#4c1d95' },  // violet
  // hot
  v6:  { light: '#facc15', c: '#eab308', deep: '#713f12' },  // sunflower gold
  // cold
  v7:  { light: '#22d3ee', c: '#06b6d4', deep: '#155e75' },  // cyan
  // hot
  v8:  { light: '#fca5a5', c: '#ef4444', deep: '#7f1d1d' },  // bright red
  // cold
  v9:  { light: '#60a5fa', c: '#3b82f6', deep: '#1e40af' },  // royal blue
  // hot
  v10: { light: '#fb7185', c: '#be123c', deep: '#4c0519' },  // rose-red
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
