// Curated climbing-flavored avatar presets. Each preset combines a Lucide
// icon, a multi-stop gradient background, a contrasting icon color, and a
// glossy inner highlight (boxShadow inset) for depth. Colors are picked
// from the app's accent palette (teal/amber/coral/purple/blue/slate).
//
// Keep `key` strings in lockstep with _ALLOWED_AVATAR_ICONS / _ALLOWED_AVATAR_COLORS
// in main.py — the server rejects anything not in those sets.

import {
  Flame, Snowflake, Mountain, Zap, Crown, Star,
  Compass, Anchor, Triangle, Sparkles, Sun, Moon,
} from 'lucide-react'

// Glossy inner highlight applied to every chip — gives depth without
// adding a separate overlay element.
const HIGHLIGHT = 'inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -1.5px 0 rgba(0,0,0,0.2)'

export const AVATAR_PRESETS = [
  { key: 'flame',     Icon: Flame,     label: 'Flame',
    bg: 'linear-gradient(135deg, #f47272 0%, #f7bb51 60%, #ffd97a 100%)',
    border: 'rgba(244,114,114,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'snowflake', Icon: Snowflake, label: 'Snowflake',
    bg: 'linear-gradient(135deg, #b6e9dd 0%, #7dd3c0 50%, #5eb4f0 100%)',
    border: 'rgba(125,211,192,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'mountain',  Icon: Mountain,  label: 'Mountain',
    bg: 'linear-gradient(135deg, #a594f9 0%, #5eb4f0 55%, #7dd3c0 100%)',
    border: 'rgba(165,148,249,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'zap',       Icon: Zap,       label: 'Zap',
    bg: 'linear-gradient(135deg, #ffd97a 0%, #f7bb51 50%, #f47272 100%)',
    border: 'rgba(247,187,81,0.6)',   iconColor: '#1a1d24', boxShadow: HIGHLIGHT },
  { key: 'crown',     Icon: Crown,     label: 'Crown',
    bg: 'linear-gradient(135deg, #ffe9a8 0%, #f7bb51 55%, #d99c2b 100%)',
    border: 'rgba(247,187,81,0.6)',   iconColor: '#1a1d24', boxShadow: HIGHLIGHT },
  { key: 'star',      Icon: Star,      label: 'Star',
    bg: 'linear-gradient(135deg, #f7bb51 0%, #f47272 50%, #a594f9 100%)',
    border: 'rgba(244,114,114,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'compass',   Icon: Compass,   label: 'Compass',
    bg: 'linear-gradient(135deg, #7dd3c0 0%, #5eb4f0 50%, #2d7fd0 100%)',
    border: 'rgba(94,180,240,0.55)',  iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'anchor',    Icon: Anchor,    label: 'Anchor',
    bg: 'linear-gradient(135deg, #4a5568 0%, #5eb4f0 60%, #7dd3c0 100%)',
    border: 'rgba(94,180,240,0.5)',   iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'triangle',  Icon: Triangle,  label: 'Triangle',
    bg: 'linear-gradient(135deg, #f47272 0%, #c44d4d 55%, #7466d1 100%)',
    border: 'rgba(244,114,114,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'sparkles',  Icon: Sparkles,  label: 'Sparkles',
    bg: 'linear-gradient(135deg, #ffd97a 0%, #a594f9 50%, #7dd3c0 100%)',
    border: 'rgba(165,148,249,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'sun',       Icon: Sun,       label: 'Sun',
    bg: 'linear-gradient(135deg, #ffe9a8 0%, #f7bb51 45%, #f47272 100%)',
    border: 'rgba(247,187,81,0.6)',   iconColor: '#1a1d24', boxShadow: HIGHLIGHT },
  { key: 'moon',      Icon: Moon,      label: 'Moon',
    bg: 'linear-gradient(135deg, #a594f9 0%, #5e6ee2 55%, #2d3373 100%)',
    border: 'rgba(165,148,249,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
]

export const AVATAR_PRESET_BY_KEY = Object.fromEntries(
  AVATAR_PRESETS.map((p) => [p.key, p]),
)

// Color overrides — first row is solids, second row is multi-tone combos.
// When a user picks one, it replaces the preset's default gradient.
export const AVATAR_COLORS = [
  // Solids
  { key: 'teal',     bg: 'linear-gradient(135deg, #b6e9dd 0%, #7dd3c0 50%, #4fa896 100%)', border: 'rgba(125,211,192,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'amber',    bg: 'linear-gradient(135deg, #ffe9a8 0%, #f7bb51 50%, #d99c2b 100%)', border: 'rgba(247,187,81,0.6)',  iconColor: '#1a1d24', boxShadow: HIGHLIGHT },
  { key: 'coral',    bg: 'linear-gradient(135deg, #f7a5a5 0%, #f47272 50%, #c44d4d 100%)', border: 'rgba(244,114,114,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'purple',   bg: 'linear-gradient(135deg, #c9beff 0%, #a594f9 50%, #7466d1 100%)', border: 'rgba(165,148,249,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'blue',     bg: 'linear-gradient(135deg, #9fd3f8 0%, #5eb4f0 50%, #2d7fd0 100%)', border: 'rgba(94,180,240,0.55)',  iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'slate',    bg: 'linear-gradient(135deg, #a0aab8 0%, #6b7280 50%, #374151 100%)', border: 'rgba(107,114,128,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  // Multi-color combos
  { key: 'sunset',   bg: 'linear-gradient(135deg, #ffd97a 0%, #f47272 60%, #a594f9 100%)', border: 'rgba(244,114,114,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'ice',      bg: 'linear-gradient(135deg, #b6e9dd 0%, #5eb4f0 55%, #7466d1 100%)', border: 'rgba(94,180,240,0.55)',  iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'aurora',   bg: 'linear-gradient(135deg, #a594f9 0%, #7dd3c0 55%, #f7bb51 100%)', border: 'rgba(165,148,249,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'ember',    bg: 'linear-gradient(135deg, #f47272 0%, #c44d4d 55%, #7466d1 100%)', border: 'rgba(244,114,114,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
  { key: 'lime',     bg: 'linear-gradient(135deg, #d4f0a0 0%, #7dd3c0 55%, #5eb4f0 100%)', border: 'rgba(125,211,192,0.55)', iconColor: '#1a1d24', boxShadow: HIGHLIGHT },
  { key: 'midnight', bg: 'linear-gradient(135deg, #5eb4f0 0%, #7466d1 55%, #2d3373 100%)', border: 'rgba(116,102,209,0.55)', iconColor: '#ffffff', boxShadow: HIGHLIGHT },
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
