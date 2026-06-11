import { Mountain, Flame, Check, Zap, Lock, HelpCircle } from 'lucide-react'
import { TIER_NAMES, TIER_TOKENS } from './tier'

/**
 * Frontend mirror of src/awards_catalog.py — adds the visual metadata
 * (icon component, gradient tokens, display label) that the backend
 * doesn't care about.
 *
 * Keyed by `kind` so backend rows can be enriched at render time.
 *
 * `mystery: true` — Xbox/Steam-style hidden achievements. When locked,
 * the medal renders as "???" with no name or description until earned.
 * Used sparingly on rare / high-tier achievements to preserve surprise.
 */

const HONEY = { light: '#e6c886', c: '#d7ac5b', deep: '#9a7a32' }  // Almanac ochre
const CORAL = { light: '#d08a72', c: '#c58a77', deep: '#7e4632' }  // Almanac clay
const SKY   = { light: '#8fb0c4', c: '#5f87a0', deep: '#3a566a' }  // skill-dynamic slate-blue

function gradeMedal(tierId) {
  const t = TIER_TOKENS[tierId] || TIER_TOKENS.v0
  return { light: t.light, c: t.c, deep: t.deep, icon: Mountain, label: tierId.toUpperCase() }
}

// sub-label uses the current TIER_NAMES so when tiers get renamed the
// medals stay in sync (was previously hardcoded to old names like "Bramble").
export const AWARD_META = {
  // Grade milestones
  first_send_v3:  { name: 'First V3',   sub: TIER_NAMES.v3,  ...gradeMedal('v3') },
  first_send_v4:  { name: 'First V4',   sub: TIER_NAMES.v4,  ...gradeMedal('v4') },
  first_send_v5:  { name: 'First V5',   sub: TIER_NAMES.v5,  ...gradeMedal('v5') },
  first_send_v6:  { name: 'First V6',   sub: TIER_NAMES.v6,  ...gradeMedal('v6') },
  first_send_v7:  { name: 'First V7',   sub: TIER_NAMES.v7,  ...gradeMedal('v7') },
  first_send_v8:  { name: 'First V8',   sub: TIER_NAMES.v8,  ...gradeMedal('v8'),  mystery: true },
  first_send_v9:  { name: 'First V9',   sub: TIER_NAMES.v9,  ...gradeMedal('v9'),  mystery: true },
  first_send_v10: { name: 'First V10+', sub: TIER_NAMES.v10, ...gradeMedal('v10'), mystery: true },
  // Streak milestones
  streak_3d:   { name: '3-day streak',   sub: 'Consistency starts', ...HONEY, icon: Flame, label: '3d' },
  streak_10d:  { name: '10-day streak',  sub: "You're showing up",  ...HONEY, icon: Flame, label: '10d' },
  streak_30d:  { name: '30-day streak',  sub: 'A month in',         ...HONEY, icon: Flame, label: '30d' },
  streak_100d: { name: '100-day streak', sub: 'Pillar',             ...HONEY, icon: Flame, label: '100d', mystery: true },
  // Volume milestones
  volume_10:  { name: '10 sends',  sub: 'Warming up',        ...CORAL, icon: Check, label: '×10'  },
  volume_30:  { name: '30 sends',  sub: 'Banked',            ...CORAL, icon: Check, label: '×30'  },
  volume_50:  { name: '50 sends',  sub: 'Half a hundred',    ...CORAL, icon: Check, label: '×50'  },
  volume_100: { name: '100 sends', sub: 'Century',           ...CORAL, icon: Check, label: '×100' },
  volume_500: { name: '500 sends', sub: 'Volume specialist', ...CORAL, icon: Check, label: '×500', mystery: true },
  // Style milestones
  first_flash: { name: 'First flash', sub: 'First-go send',  ...SKY, icon: Zap, label: null },
}

export const LOCKED_META   = { icon: Lock }
export const MYSTERY_META  = { icon: HelpCircle, name: '???', sub: 'Mystery achievement' }
