/**
 * Color tokens + display labels for session types. Each color entry mirrors
 * the V-tier palette so Train's chromatic accents stay coherent with the
 * rest of the app.
 *
 * Backend produces lowercase types (hangboard, power, endurance, strength,
 * project, technique). UI displays them title-cased. Project + Technique
 * don't have their own color slots — they alias to Limit and Mobility
 * respectively so the splash stays inside the established palette.
 */
export const SESSION_TYPE_COLOR = {
  Power:     { c: '#b85c44', light: '#d08a72', deep: '#7e3a28' },   // skill power — clay-red
  Limit:     { c: '#b06a4f', light: '#c58a77', deep: '#7e4632' },   // Almanac clay-deep ember
  Endurance: { c: '#97a886', light: '#bcc9ad', deep: '#5f7a4e' },   // Almanac sage (fallback)
  Hangboard: { c: '#c79a3c', light: '#dcbb6f', deep: '#8a6921' },   // skill crimp — ochre-gold
  Strength:  { c: '#d7ac5b', light: '#e6c886', deep: '#9a7a32' },   // Almanac ochre halo
  Mobility:  { c: '#a06f8a', light: '#c19bb0', deep: '#6c4a5e' },   // skill mobility — plum veil
  Rest:      { c: 'transparent', light: 'transparent', deep: 'transparent' },
}

// Backend → color-key alias map. Lowercased input.
const COLOR_ALIAS = {
  hangboard:  'Hangboard',
  power:      'Power',
  endurance:  'Endurance',
  strength:   'Strength',
  project:    'Limit',     // send-focused effort, borrow clay ember
  technique:  'Mobility',  // movement work, borrow plum veil
  limit:      'Limit',
  mobility:   'Mobility',
  rest:       'Rest',
}

// Display label map. Lowercased input.
const TYPE_LABEL = {
  hangboard:  'Hangboard',
  power:      'Power',
  endurance:  'Endurance',
  strength:   'Strength',
  project:    'Project',
  technique:  'Technique',
  limit:      'Limit',
  mobility:   'Mobility',
  rest:       'Rest',
}

function lower(t) {
  return (t || '').toString().toLowerCase()
}

/**
 * Return { c, light, deep } for a session type. Case-insensitive. Handles
 * backend aliases (project → Limit color, technique → Mobility). Falls back
 * to Endurance (sage) for unknown / null / undefined inputs.
 */
export function getSessionTypeColor(type) {
  const key = COLOR_ALIAS[lower(type)] || type
  return SESSION_TYPE_COLOR[key] || SESSION_TYPE_COLOR.Endurance
}

/**
 * Title-cased display label for a session type. Case-insensitive.
 * Falls through to a naive title-case of the input when unknown so a future
 * backend addition still renders sensibly.
 */
export function getSessionTypeLabel(type) {
  if (!type) return null
  const key = lower(type)
  if (TYPE_LABEL[key]) return TYPE_LABEL[key]
  return key.charAt(0).toUpperCase() + key.slice(1)
}
