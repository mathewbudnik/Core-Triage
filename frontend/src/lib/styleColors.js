/**
 * Color tokens + display labels for the four climb styles. Mirrors the V-tier
 * palette so the style chips, Hub stacked bar, and plan-gen logs all share
 * the same vocabulary.
 *
 * Lean 4 (per spec):
 *   power      — explosive, contact-strength climbs
 *   dynamic    — committing, momentum-based climbs
 *   technical  — body-position-dependent climbs
 *   endurance  — sustained, pumpy climbs
 *
 * Order matters: STYLE_ORDER drives the chip strip and the stacked bar so
 * both surfaces read identically.
 */
export const STYLE_ORDER = ['power', 'dynamic', 'technical', 'endurance']

export const STYLE_COLOR = {
  power:     { c: '#fb7185', light: '#fda4af', deep: '#7f1d2c' },   // Phoenix coral
  dynamic:   { c: '#f97316', light: '#fb923c', deep: '#7c2d12' },   // Coral orange
  technical: { c: '#8b5cf6', light: '#a78bfa', deep: '#4c1d95' },   // Amethyst violet
  endurance: { c: '#2dd4bf', light: '#5eead4', deep: '#115e59' },   // Aquamarine teal
}

const STYLE_LABEL = {
  power:     'Power',
  dynamic:   'Dynamic',
  technical: 'Technical',
  endurance: 'Endurance',
}

/**
 * Case-insensitive lookup of color tokens. Unknown / null / undefined input
 * falls back to power so callers never crash on a missing field.
 */
export function getStyleColor(style) {
  const key = (style || '').toString().toLowerCase()
  return STYLE_COLOR[key] || STYLE_COLOR.power
}

/**
 * Title-cased display label. Returns null when the input is empty so callers
 * can render conditionally (e.g. "{label && <span>{label}</span>}").
 */
export function getStyleLabel(style) {
  if (!style) return null
  return STYLE_LABEL[String(style).toLowerCase()] || null
}
