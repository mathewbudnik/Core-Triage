// Curated climbing-flavored avatar presets. Each preset combines a Lucide
// icon, a multi-stop gradient background, a contrasting icon color, and a
// glossy inner highlight (boxShadow inset) for depth. Colors are drawn from
// the Almanac palette — earthy clay/ochre/sage plus a few muted pastels
// (plum, slate-blue) so the chips harmonize with the parchment UI.
//
// Keep `key` strings in lockstep with _ALLOWED_AVATAR_ICONS / _ALLOWED_AVATAR_COLORS
// in main.py — the server rejects anything not in those sets.

import {
  Flame, Snowflake, Mountain, Zap, Crown, Star,
  Compass, Anchor, Triangle, Sparkles, Sun, Moon,
} from 'lucide-react'

// Glossy inner highlight applied to every chip — gives depth without
// adding a separate overlay element. Warm cream sheen on top, soft shade below.
const HIGHLIGHT = 'inset 0 1.5px 0 rgba(253,246,234,0.4), inset 0 -1.5px 0 rgba(0,0,0,0.2)'

export const AVATAR_PRESETS = [
  { key: 'flame',     Icon: Flame,     label: 'Flame',
    bg: 'linear-gradient(135deg, #c58a77 0%, #b06a4f 60%, #d7ac5b 100%)',
    border: 'rgba(176,106,79,0.55)',  iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'snowflake', Icon: Snowflake, label: 'Snowflake',
    bg: 'linear-gradient(135deg, #bcc9ad 0%, #97a886 50%, #5f87a0 100%)',
    border: 'rgba(151,168,134,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'mountain',  Icon: Mountain,  label: 'Mountain',
    bg: 'linear-gradient(135deg, #a06f8a 0%, #5f87a0 55%, #97a886 100%)',
    border: 'rgba(160,111,138,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'zap',       Icon: Zap,       label: 'Zap',
    bg: 'linear-gradient(135deg, #e6c886 0%, #d7ac5b 50%, #c58a77 100%)',
    border: 'rgba(215,172,91,0.6)',   iconColor: '#2a2722', boxShadow: HIGHLIGHT },
  { key: 'crown',     Icon: Crown,     label: 'Crown',
    bg: 'linear-gradient(135deg, #ecd6a0 0%, #d7ac5b 55%, #b06a4f 100%)',
    border: 'rgba(215,172,91,0.6)',   iconColor: '#2a2722', boxShadow: HIGHLIGHT },
  { key: 'star',      Icon: Star,      label: 'Star',
    bg: 'linear-gradient(135deg, #d7ac5b 0%, #c58a77 50%, #a06f8a 100%)',
    border: 'rgba(197,138,119,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'compass',   Icon: Compass,   label: 'Compass',
    bg: 'linear-gradient(135deg, #97a886 0%, #5f87a0 50%, #3a566a 100%)',
    border: 'rgba(95,135,160,0.55)',  iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'anchor',    Icon: Anchor,    label: 'Anchor',
    bg: 'linear-gradient(135deg, #5f594c 0%, #5f87a0 60%, #97a886 100%)',
    border: 'rgba(95,135,160,0.5)',   iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'triangle',  Icon: Triangle,  label: 'Triangle',
    bg: 'linear-gradient(135deg, #c58a77 0%, #b06a4f 55%, #a06f8a 100%)',
    border: 'rgba(197,138,119,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'sparkles',  Icon: Sparkles,  label: 'Sparkles',
    bg: 'linear-gradient(135deg, #d7ac5b 0%, #a06f8a 50%, #97a886 100%)',
    border: 'rgba(160,111,138,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'sun',       Icon: Sun,       label: 'Sun',
    bg: 'linear-gradient(135deg, #ecd6a0 0%, #d7ac5b 45%, #c58a77 100%)',
    border: 'rgba(215,172,91,0.6)',   iconColor: '#2a2722', boxShadow: HIGHLIGHT },
  { key: 'moon',      Icon: Moon,      label: 'Moon',
    bg: 'linear-gradient(135deg, #a06f8a 0%, #5f87a0 55%, #3a566a 100%)',
    border: 'rgba(160,111,138,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
]

export const AVATAR_PRESET_BY_KEY = Object.fromEntries(
  AVATAR_PRESETS.map((p) => [p.key, p]),
)

// Color overrides — first row is solids, second row is multi-tone combos.
// When a user picks one, it replaces the preset's default gradient.
export const AVATAR_COLORS = [
  // Solids
  { key: 'teal',     bg: 'linear-gradient(135deg, #bcc9ad 0%, #97a886 50%, #5f7a4e 100%)', border: 'rgba(151,168,134,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'amber',    bg: 'linear-gradient(135deg, #ecd6a0 0%, #d7ac5b 50%, #9a7a32 100%)', border: 'rgba(215,172,91,0.6)',  iconColor: '#2a2722', boxShadow: HIGHLIGHT },
  { key: 'coral',    bg: 'linear-gradient(135deg, #d8a596 0%, #c58a77 50%, #b06a4f 100%)', border: 'rgba(197,138,119,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'purple',   bg: 'linear-gradient(135deg, #c19bb0 0%, #a06f8a 50%, #6c4a5e 100%)', border: 'rgba(160,111,138,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'blue',     bg: 'linear-gradient(135deg, #8fb0c4 0%, #5f87a0 50%, #3a566a 100%)', border: 'rgba(95,135,160,0.55)',  iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'slate',    bg: 'linear-gradient(135deg, #a39a86 0%, #8d8472 50%, #5f594c 100%)', border: 'rgba(141,132,114,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  // Multi-color combos
  { key: 'sunset',   bg: 'linear-gradient(135deg, #d7ac5b 0%, #c58a77 60%, #a06f8a 100%)', border: 'rgba(197,138,119,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'ice',      bg: 'linear-gradient(135deg, #bcc9ad 0%, #5f87a0 55%, #6c4a5e 100%)', border: 'rgba(95,135,160,0.55)',  iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'aurora',   bg: 'linear-gradient(135deg, #a06f8a 0%, #97a886 55%, #d7ac5b 100%)', border: 'rgba(160,111,138,0.55)', iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'ember',    bg: 'linear-gradient(135deg, #c58a77 0%, #b06a4f 55%, #6c4a5e 100%)', border: 'rgba(176,106,79,0.55)',  iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
  { key: 'lime',     bg: 'linear-gradient(135deg, #c5d3a8 0%, #97a886 55%, #5f87a0 100%)', border: 'rgba(151,168,134,0.55)', iconColor: '#2a2722', boxShadow: HIGHLIGHT },
  { key: 'midnight', bg: 'linear-gradient(135deg, #5f87a0 0%, #6c4a5e 55%, #3a3a4a 100%)', border: 'rgba(108,74,94,0.55)',   iconColor: '#fdf6ea', boxShadow: HIGHLIGHT },
]

export const AVATAR_COLOR_BY_KEY = Object.fromEntries(
  AVATAR_COLORS.map((c) => [c.key, c]),
)

/**
 * Resolve a chip's visual style for a given (icon, color) pair.
 * Returns { Icon, bg, border, iconColor, boxShadow } or null if no preset chosen.
 */
export function resolveAvatar(iconKey, colorKey) {
  const preset = iconKey ? AVATAR_PRESET_BY_KEY[iconKey] : null
  if (!preset) return null
  const colorOverride = colorKey ? AVATAR_COLOR_BY_KEY[colorKey] : null
  return {
    Icon: preset.Icon,
    bg: colorOverride?.bg ?? preset.bg,
    border: colorOverride?.border ?? preset.border,
    iconColor: colorOverride?.iconColor ?? preset.iconColor,
    boxShadow: colorOverride?.boxShadow ?? preset.boxShadow ?? HIGHLIGHT,
  }
}
