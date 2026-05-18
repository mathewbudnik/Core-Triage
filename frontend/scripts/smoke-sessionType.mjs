// Smoke verification for sessionType.js.
// Run: node frontend/scripts/smoke-sessionType.mjs
import { SESSION_TYPE_COLOR, getSessionTypeColor } from '../src/lib/sessionType.js'
import assert from 'node:assert/strict'

assert.equal(SESSION_TYPE_COLOR.Power.c, '#fb7185', 'Power maps to coral')
assert.equal(SESSION_TYPE_COLOR.Endurance.c, '#14b8a6', 'Endurance maps to teal')
assert.equal(SESSION_TYPE_COLOR.Strength.c, '#f7b03a', 'Strength maps to gold')
assert.equal(SESSION_TYPE_COLOR.Rest.c, 'transparent', 'Rest has transparent dot')

const cove = getSessionTypeColor('Endurance')
assert.deepEqual(cove, { c: '#14b8a6', light: '#5eead4', deep: '#0a4f48' })

const unknown = getSessionTypeColor('NotAType')
assert.equal(unknown.c, '#14b8a6', 'unknown type falls back to Endurance')

assert.equal(getSessionTypeColor(null).c, '#14b8a6')
assert.equal(getSessionTypeColor(undefined).c, '#14b8a6')

console.log('OK sessionType')
