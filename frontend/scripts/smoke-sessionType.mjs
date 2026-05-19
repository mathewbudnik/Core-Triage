// Smoke verification for sessionType.js.
// Run: node frontend/scripts/smoke-sessionType.mjs
import { SESSION_TYPE_COLOR, getSessionTypeColor, getSessionTypeLabel } from '../src/lib/sessionType.js'
import assert from 'node:assert/strict'

assert.equal(SESSION_TYPE_COLOR.Power.c, '#fb7185', 'Power maps to coral')
assert.equal(SESSION_TYPE_COLOR.Endurance.c, '#14b8a6', 'Endurance maps to teal')
assert.equal(SESSION_TYPE_COLOR.Strength.c, '#f7b03a', 'Strength maps to gold')
assert.equal(SESSION_TYPE_COLOR.Rest.c, 'transparent', 'Rest has transparent dot')

// getSessionTypeColor — title-case input
const cove = getSessionTypeColor('Endurance')
assert.deepEqual(cove, { c: '#14b8a6', light: '#5eead4', deep: '#0a4f48' })

// getSessionTypeColor — lowercase backend input
assert.equal(getSessionTypeColor('hangboard').c, '#c5e637', 'lowercase hangboard -> lime')
assert.equal(getSessionTypeColor('power').c, '#fb7185', 'lowercase power -> coral')
assert.equal(getSessionTypeColor('strength').c, '#f7b03a', 'lowercase strength -> gold')

// Aliases
assert.equal(getSessionTypeColor('project').c, '#ff7a3d', 'project aliases to Limit (ember)')
assert.equal(getSessionTypeColor('technique').c, '#8466ff', 'technique aliases to Mobility (violet)')

// Fallback
assert.equal(getSessionTypeColor('NotAType').c, '#14b8a6', 'unknown falls back to Endurance')
assert.equal(getSessionTypeColor(null).c, '#14b8a6')
assert.equal(getSessionTypeColor(undefined).c, '#14b8a6')

// getSessionTypeLabel
assert.equal(getSessionTypeLabel('hangboard'), 'Hangboard')
assert.equal(getSessionTypeLabel('power'), 'Power')
assert.equal(getSessionTypeLabel('project'), 'Project')
assert.equal(getSessionTypeLabel('technique'), 'Technique')
assert.equal(getSessionTypeLabel('Endurance'), 'Endurance')
assert.equal(getSessionTypeLabel('weird'), 'Weird', 'unknown -> naive title-case')
assert.equal(getSessionTypeLabel(null), null)
assert.equal(getSessionTypeLabel(''), null)

console.log('OK sessionType')
