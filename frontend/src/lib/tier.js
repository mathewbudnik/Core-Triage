/**
 * Tier system constants + helpers. Mirrors src/climb_grades.py's
 * tier mapping, but with hex tokens for theming.
 *
 * Each tier exposes three colors: light (highlights), c (main), deep
 * (gradient endpoint + halo). Glow uses c at ~22% alpha.
 */

export const V_TIERS = ['v0','v1','v2','v3','v4','v5','v6','v7','v8','v9','v10']

export const TIER_NAMES = {
  v0:  'Frost',
  v1:  'Halo',
  v2:  'Ember',
  v3:  'Bramble',
  v4:  'Reef',
  v5:  'Cove',
  v6:  'Atlas',
  v7:  'Vault',
  v8:  'Veil',
  v9:  'Vivid',
  v10: 'Phoenix',
}

export const TIER_TOKENS = {
  v0:  { light: '#f5f4ec', c: '#e8e6dc', deep: '#6b685a' },
  v1:  { light: '#fbd470', c: '#f7b03a', deep: '#7c5a14' },
  v2:  { light: '#ffa97a', c: '#ff7a3d', deep: '#802811' },
  v3:  { light: '#d9f06a', c: '#c5e637', deep: '#5a6810' },
  v4:  { light: '#6bf0c9', c: '#2dd4a5', deep: '#105e48' },
  v5:  { light: '#5eead4', c: '#14b8a6', deep: '#0a4f48' },
  v6:  { light: '#7cc3ff', c: '#3aa1ff', deep: '#0d3d70' },
  v7:  { light: '#9598fa', c: '#5b5ff2', deep: '#1d1f7a' },
  v8:  { light: '#ad95ff', c: '#8466ff', deep: '#3a2580' },
  v9:  { light: '#ea7df5', c: '#d946ef', deep: '#6c1a7f' },
  v10: { light: '#fda4af', c: '#fb7185', deep: '#7f1d2c' },
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
