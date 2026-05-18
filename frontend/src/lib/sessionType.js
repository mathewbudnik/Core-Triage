/**
 * Color tokens for session types. Each entry mirrors the V-tier palette so
 * Train's chromatic accents stay coherent with the rest of the app.
 *
 * Session-type color appears in exactly one place at runtime: the dot before
 * the eyebrow inside the hero card. Everything else uses the user's tier
 * color. See docs/superpowers/specs/2026-05-17-train-tab-redesign-design.md.
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

/**
 * Return { c, light, deep } for a session type. Falls back to Endurance
 * (Cove teal) for unknown / null / undefined inputs — the same fallback the
 * spec defines and the rest of the codebase already trusts.
 */
export function getSessionTypeColor(type) {
  return SESSION_TYPE_COLOR[type] || SESSION_TYPE_COLOR.Endurance
}
