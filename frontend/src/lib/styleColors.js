/**
 * Color tokens + display labels for the five climb styles. Mirrors the
 * five stat axes in lib/stats.js so chips, stat radar, HubStyleStrip,
 * and the reward engine all read identically.
 *
 *   powerful   — explosive, contact-strength climbs
 *   crimpy     — finger-tension dominant climbs
 *   dynamic    — committing, momentum-based climbs
 *   technical  — body-position-dependent climbs
 *   mobility   — range / flexibility dominant climbs
 */
export const STYLE_ORDER = ['powerful', 'crimpy', 'dynamic', 'technical', 'mobility']

export const STYLE_COLOR = {
  powerful:  { c: '#fb7185', light: '#fda4af', deep: '#7f1d2c' },   // Phoenix coral
  crimpy:    { c: '#94a3b8', light: '#cbd5e1', deep: '#334155' },   // Granite slate
  dynamic:   { c: '#f97316', light: '#fb923c', deep: '#7c2d12' },   // Coral orange
  technical: { c: '#8b5cf6', light: '#a78bfa', deep: '#4c1d95' },   // Amethyst violet
  mobility:  { c: '#86efac', light: '#bbf7d0', deep: '#14532d' },   // Sage green
}

const STYLE_LABEL = {
  powerful:  'Powerful',
  crimpy:    'Crimpy',
  dynamic:   'Dynamic',
  technical: 'Technical',
  mobility:  'Mobility',
}

export function getStyleLabel(key) {
  return STYLE_LABEL[key] ?? key
}
