/**
 * Tier system constants + helpers. Mirrors src/climb_grades.py's
 * tier mapping, but with hex tokens for theming.
 *
 * Each tier exposes three colors: light (highlights), c (main), deep
 * (gradient endpoint + halo). Glow uses c at ~22% alpha.
 */

export const V_TIERS = ['v0','v1','v2','v3','v4','v5','v6','v7','v8','v9','v10']

// Duolingo-style metal/gem progression. Common metals at the base
// (Bronze, Silver, Copper) escalate into precious gemstones (Sapphire,
// Ruby, Emerald, Amethyst) and cap with Diamond at the apex.
// Each tier gets a distinct hue family — no two adjacent tiers share a
// color zone.
export const TIER_NAMES = {
  v0:  'Bronze',
  v1:  'Silver',
  v2:  'Copper',
  v3:  'Aquamarine',
  v4:  'Rose Gold',
  v5:  'Sapphire',
  v6:  'Ruby',
  v7:  'Emerald',
  v8:  'Coral',
  v9:  'Amethyst',
  v10: 'Diamond',
}

// Bright pastel palette. Adjacent grades alternate hot/cold so the
// neighbors are always visually distinct. Diamond breaks strict
// alternation at v10 — it's the universally "elite" gem and earns the
// apex slot regardless of temperature.
export const TIER_TOKENS = {
  // hot — bronze (warm tan-orange)
  v0:  { light: '#f5d4b8', c: '#e8a87c', deep: '#9a5b2a' },
  // cold — silver (pale silver-blue)
  v1:  { light: '#e7eef5', c: '#cdd9e6', deep: '#475b6f' },
  // hot — copper (terra-cotta orange)
  v2:  { light: '#f5c4a3', c: '#e89b6c', deep: '#9a4a1c' },
  // cold — aquamarine (aqua-green)
  v3:  { light: '#ccfbf1', c: '#99f6e4', deep: '#115e59' },
  // hot — rose gold (pink-rose)
  v4:  { light: '#fce7f3', c: '#fbcfe8', deep: '#9d174d' },
  // cold — sapphire (bright blue)
  v5:  { light: '#bfdbfe', c: '#93c5fd', deep: '#1e3a8a' },
  // hot — ruby (red-pink)
  v6:  { light: '#fecdd3', c: '#fb7185', deep: '#881337' },
  // cold — emerald (bright green)
  v7:  { light: '#a7f3d0', c: '#6ee7b7', deep: '#064e3b' },
  // hot — coral (peach-orange)
  v8:  { light: '#fed7aa', c: '#fdba74', deep: '#9a3412' },
  // cold — amethyst (purple)
  v9:  { light: '#ddd6fe', c: '#c4b5fd', deep: '#5b21b6' },
  // apex — diamond (brilliant cyan-blue)
  v10: { light: '#cffafe', c: '#67e8f9', deep: '#155e75' },
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
