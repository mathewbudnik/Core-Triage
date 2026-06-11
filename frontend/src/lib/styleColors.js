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
  powerful:  { c: '#b85c44', light: '#d08a72', deep: '#7e3a28' },   // skill power — clay-red
  crimpy:    { c: '#c79a3c', light: '#dcbb6f', deep: '#8a6921' },   // skill crimp — ochre-gold
  dynamic:   { c: '#5f87a0', light: '#8fb0c4', deep: '#3a566a' },   // skill dynamic — slate-blue
  technical: { c: '#7f9466', light: '#a5b890', deep: '#566440' },   // skill technique — sage
  mobility:  { c: '#a06f8a', light: '#c19bb0', deep: '#6c4a5e' },   // skill mobility — plum
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
