import { Mountain, Flame, Check, Zap, Lock } from 'lucide-react'
import { TIER_TOKENS } from './tier'

/**
 * Frontend mirror of src/awards_catalog.py — adds the visual metadata
 * (icon component, gradient tokens, display label) that the backend
 * doesn't care about.
 *
 * Keyed by `kind` so backend rows can be enriched at render time.
 */

const HONEY = { light: '#fbd470', c: '#f7b03a', deep: '#7c5a14' }
const CORAL = { light: '#fda4af', c: '#fb7185', deep: '#7f1d2c' }
const SKY   = { light: '#7cc3ff', c: '#3aa1ff', deep: '#0d3d70' }

function gradeMedal(tierId) {
  const t = TIER_TOKENS[tierId] || TIER_TOKENS.v0
  return { light: t.light, c: t.c, deep: t.deep, icon: Mountain, label: tierId.toUpperCase() }
}

export const AWARD_META = {
  // Grade milestones
  first_send_v3:  { name: 'First V3',  sub: 'Acid Lime',    ...gradeMedal('v3') },
  first_send_v4:  { name: 'First V4',  sub: 'Jade',         ...gradeMedal('v4') },
  first_send_v5:  { name: 'First V5',  sub: 'Teal',         ...gradeMedal('v5') },
  first_send_v6:  { name: 'First V6',  sub: 'Electric Sky', ...gradeMedal('v6') },
  first_send_v7:  { name: 'First V7',  sub: 'Cobalt',       ...gradeMedal('v7') },
  first_send_v8:  { name: 'First V8',  sub: 'Iris',         ...gradeMedal('v8') },
  first_send_v9:  { name: 'First V9',  sub: 'Magenta',      ...gradeMedal('v9') },
  first_send_v10: { name: 'First V10+',sub: 'Coral',        ...gradeMedal('v10') },
  // Streak milestones
  streak_3d:   { name: '3-day streak',   sub: 'Consistency starts', ...HONEY, icon: Flame, label: '3d' },
  streak_10d:  { name: '10-day streak',  sub: "You're showing up",  ...HONEY, icon: Flame, label: '10d' },
  streak_30d:  { name: '30-day streak',  sub: 'A month in',         ...HONEY, icon: Flame, label: '30d' },
  streak_100d: { name: '100-day streak', sub: 'Pillar',             ...HONEY, icon: Flame, label: '100d' },
  // Volume milestones
  volume_10:  { name: '10 sends',  sub: 'Warming up',        ...CORAL, icon: Check, label: '×10'  },
  volume_30:  { name: '30 sends',  sub: 'Banked',            ...CORAL, icon: Check, label: '×30'  },
  volume_50:  { name: '50 sends',  sub: 'Half a hundred',    ...CORAL, icon: Check, label: '×50'  },
  volume_100: { name: '100 sends', sub: 'Century',           ...CORAL, icon: Check, label: '×100' },
  volume_500: { name: '500 sends', sub: 'Volume specialist', ...CORAL, icon: Check, label: '×500' },
  // Style milestones
  first_flash: { name: 'First flash', sub: 'First-go send',  ...SKY, icon: Zap, label: null },
}

export const LOCKED_META = { icon: Lock }
