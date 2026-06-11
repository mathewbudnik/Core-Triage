/**
 * Tier system constants + helpers. Mirrors src/climb_grades.py's
 * tier mapping, but with hex tokens for theming.
 *
 * Each tier exposes three colors: light (highlights), c (main), deep
 * (gradient endpoint + halo). Glow uses c at ~22% alpha.
 */

export const V_TIERS = ['v0','v1','v2','v3','v4','v5','v6','v7','v8','v9','v10']

// `rookie` is the pre-V0 default tier: brand-new climbers who haven't
// logged a single send sit here. It is NOT in V_TIERS (which represents
// the earned-tier ladder Bronze→Diamond) — once a user logs V0, the
// working-tier resolver moves them up to Bronze.
//
// Metals at the base, gemstones rising to Diamond at the apex. Each
// name picks a real element/gem; the palette below uses muted, desaturated
// stone tones so each tier feels like the real material weathered into
// the Almanac's parchment palette (not a neon jewel). Amber sits in the
// v2 slot (fossilized resin, warm gold-brown) in place of Copper — both
// warm, common-tier "stepping stones" before the precious gemstones begin.
export const TIER_NAMES = {
  rookie: 'Quartz',
  v0:  'Bronze',
  v1:  'Silver',
  v2:  'Amber',
  v3:  'Aquamarine',
  v4:  'Rose Gold',
  v5:  'Sapphire',
  v6:  'Ruby',
  v7:  'Emerald',
  v8:  'Coral',
  v9:  'Amethyst',
  v10: 'Diamond',
}

// Muted, Almanac-harmonious stone palette — desaturated parchment-era
// tones, NOT neon. Each name still maps to its real stone, but rendered
// as a dusty, low-chroma analogue that sits quietly against parchment
// (#e7ddc6) while staying distinct from its neighbors. Adjacent tiers
// still alternate warm/cool so the ladder reads at a glance, and Diamond
// holds the apex with the palest, iciest (but still muted) slate-cyan.
export const TIER_TOKENS = {
  // pre-tier — quartz (soft greyed lavender-stone). Most abundant mineral
  // on earth: pretty without feeling earned. Brand-new users see this
  // until they log their first V0, then climb into Bronze.
  rookie: { light: '#dcd6cb', c: '#aaa295', deep: '#615a4e' },
  // warm — bronze (dusty weathered copper-bronze, leans toward the clay
  // token; reads like an aged patina'd coin, not a shiny penny)
  v0:  { light: '#cb9f7e', c: '#a9774f', deep: '#5f4128' },
  // cool — silver (muted pewter / weathered steel, low chroma so it stays
  // a quiet neutral against parchment rather than glaring white)
  v1:  { light: '#cfcabf', c: '#9a988f', deep: '#54514a' },
  // warm — amber (mellow ochre-amber, harmonizes with the ochre token —
  // fossilized resin gone soft and golden-brown)
  v2:  { light: '#dcb878', c: '#c08f47', deep: '#6e4a1c' },
  // cool — aquamarine (dusty sea-green teal, muted and green-leaning so it
  // stays clearly distinct from Diamond's pale slate-cyan at v10)
  v3:  { light: '#9cc1b4', c: '#6a978a', deep: '#3d5b51' },
  // warm — rose gold (soft dusty rose, leans toward the clay token; a
  // greyed pink with no neon magenta)
  v4:  { light: '#d3a394', c: '#b67d6c', deep: '#6e4339' },
  // cool — sapphire (muted slate-blue, desaturated denim rather than royal)
  v5:  { light: '#94a6bb', c: '#647d99', deep: '#384a5e' },
  // warm — ruby (dusky brick-red, an oxblood / faded-garnet tone, no neon)
  v6:  { light: '#c08b85', c: '#a35a52', deep: '#5e2c28' },
  // cool — emerald (muted sage-green that echoes the sage tokens; a quiet
  // forest-stone green, distinct from Aquamarine's bluer teal)
  v7:  { light: '#a4b794', c: '#778f63', deep: '#41512f' },
  // warm — coral (soft terracotta-coral, a sun-faded clay-orange)
  v8:  { light: '#dba98c', c: '#c47f5a', deep: '#6e3f24' },
  // cool — amethyst (greyed dusty mauve-purple, low-chroma heather)
  v9:  { light: '#b4a3bd', c: '#8a738f', deep: '#4d3c52' },
  // apex — diamond (palest icy slate-cyan; the lightest, coolest stone so
  // it reads clearly above Aquamarine's greener teal. Paired with the
  // animated DiamondShimmer overlay.)
  v10: { light: '#cfdcdc', c: '#9fb6b8', deep: '#54696b' },
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

/** Pick the higher of two tier ids; null-safe. Both null => 'rookie'. */
export function maxTier(a, b) {
  if (!a) return b || 'rookie'
  if (!b) return a
  return V_TIERS.indexOf(a) >= V_TIERS.indexOf(b) ? a : b
}

/** Given a hardest-grade dict { boulder, route }, return the working tier id.
 * Returns 'rookie' for users with no logged sends so brand-new climbers see
 * the Quartz pre-tier UI rather than landing on Bronze identically to
 * someone who actually sent a V0. */
export function workingTierFromHardest(hardest) {
  const a = hardest?.boulder ? vGradeToTier(hardest.boulder) : null
  const b = hardest?.route   ? ydsToTier(hardest.route)      : null
  return maxTier(a, b) || 'rookie'
}

/** Return the next-higher tier id, or null if already at v10. */
export function nextTier(tierId) {
  if (tierId === 'rookie') return 'v0'
  const idx = V_TIERS.indexOf(tierId)
  if (idx < 0 || idx >= V_TIERS.length - 1) return null
  return V_TIERS[idx + 1]
}

/**
 * Resolve any climbing grade (V-grade or YDS) to its tier-token entry.
 * Falls back to v0 (Bronze) for unrecognised inputs so callers can always
 * read `.c` / `.light` / `.deep` without guarding. (Does NOT fall back to
 * 'rookie' — rookie is a pre-tier state for users with no logs, not a
 * fallback for unknown grade strings.)
 */
export function tokenForGrade(grade) {
  const tierId = vGradeToTier(grade) ?? ydsToTier(grade) ?? 'v0'
  return TIER_TOKENS[tierId]
}
