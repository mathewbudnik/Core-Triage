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
  Power:     { c: '#fb7185', light: '#fda4af', deep: '#7f1d2c' },   // v10 Phoenix
  Limit:     { c: '#ff7a3d', light: '#ffa97a', deep: '#802811' },   // v2 Ember
  Endurance: { c: '#14b8a6', light: '#5eead4', deep: '#0a4f48' },   // v5 Cove (fallback)
  Hangboard: { c: '#c5e637', light: '#d9f06a', deep: '#5a6810' },   // v3 Bramble
  Strength:  { c: '#f7b03a', light: '#fbd470', deep: '#7c5a14' },   // v1 Halo
  Mobility:  { c: '#8466ff', light: '#ad95ff', deep: '#3a2580' },   // v8 Veil
  Rest:      { c: 'transparent', light: 'transparent', deep: 'transparent' },
}

// Backend → color-key alias map. Lowercased input.
const COLOR_ALIAS = {
  hangboard:  'Hangboard',
  power:      'Power',
  endurance:  'Endurance',
  strength:   'Strength',
  project:    'Limit',     // send-focused effort, borrow ember orange
  technique:  'Mobility',  // movement work, borrow veil violet
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
 * to Endurance (Cove teal) for unknown / null / undefined inputs.
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
