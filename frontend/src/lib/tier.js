/**
 * Tier system constants + helpers. Mirrors src/climb_grades.py's
 * tier mapping, but with hex tokens for theming.
 *
 * Each tier exposes three colors: light (highlights), c (main), deep
 * (gradient endpoint + halo). Glow uses c at ~22% alpha.
 */

export const V_TIERS = ['v0','v1','v2','v3','v4','v5','v6','v7','v8','v9','v10']

// Metals at the base, gemstones rising to Diamond at the apex. Each
// name picks a real element/gem; the palette below uses jewel-saturated
// hex values so the tier color feels like the real stone (not a pastel
// approximation). Carnelian sits in the v2 slot (semi-precious agate)
// in place of Copper — both warm, common-tier "stepping stones" before
// the precious gemstones begin.
export const TIER_NAMES = {
  v0:  'Bronze',
  v1:  'Silver',
  v2:  'Carnelian',
  v3:  'Aquamarine',
  v4:  'Rose Gold',
  v5:  'Sapphire',
  v6:  'Ruby',
  v7:  'Emerald',
  v8:  'Coral',
  v9:  'Amethyst',
  v10: 'Diamond',
}

// Minecraft-block vivid palette — saturated AND luminous, not muted.
// Adjacent grades alternate hot/cold so neighbors are always visually
// distinct. Diamond breaks strict alternation at v10 — it's the
// universally "elite" gem and earns the apex slot.
export const TIER_TOKENS = {
  // hot — bronze (bright warm bronze)
  v0:  { light: '#e8a87c', c: '#cd8843', deep: '#5a3815' },
  // cold — silver (bright polished steel)
  v1:  { light: '#eef1f5', c: '#d6dde6', deep: '#4a5260' },
  // hot — carnelian (vivid rust-red)
  v2:  { light: '#f08d6f', c: '#e85a37', deep: '#6e1f10' },
  // cold — aquamarine (jewel aqua)
  v3:  { light: '#5eead4', c: '#2dd4bf', deep: '#115e59' },
  // hot — rose gold (vivid pink-rose)
  v4:  { light: '#f472b6', c: '#ec4899', deep: '#831d4c' },
  // cold — sapphire (bright royal blue)
  v5:  { light: '#60a5fa', c: '#3b82f6', deep: '#1e3a8a' },
  // hot — ruby (bright crimson, redstone-like)
  v6:  { light: '#f43f5e', c: '#e11d48', deep: '#4c0519' },
  // cold — emerald (bright Minecraft-emerald green)
  v7:  { light: '#4ade80', c: '#22c55e', deep: '#064e3b' },
  // hot — coral (vivid orange)
  v8:  { light: '#fb923c', c: '#f97316', deep: '#7c2d12' },
  // cold — amethyst (vivid purple, Minecraft-amethyst-like)
  v9:  { light: '#a78bfa', c: '#8b5cf6', deep: '#4c1d95' },
  // apex — diamond (bright cyan, Minecraft-diamond-like)
  v10: { light: '#67e8f9', c: '#22d3ee', deep: '#0c4a6e' },
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
