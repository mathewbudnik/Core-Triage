// Smoke verification for styleColors.js.
// Run: node frontend/scripts/smoke-styleColors.mjs
import { STYLE_COLOR, STYLE_ORDER, getStyleColor, getStyleLabel } from '../src/lib/styleColors.js'
import assert from 'node:assert/strict'

// All four styles present
assert.deepEqual(STYLE_ORDER, ['power', 'dynamic', 'technical', 'endurance'])

// Color tokens
assert.equal(STYLE_COLOR.power.c, '#fb7185')
assert.equal(STYLE_COLOR.dynamic.c, '#f97316')
assert.equal(STYLE_COLOR.technical.c, '#8b5cf6')
assert.equal(STYLE_COLOR.endurance.c, '#2dd4bf')

// Lookup helper is case-insensitive
assert.equal(getStyleColor('power').c,   '#fb7185')
assert.equal(getStyleColor('POWER').c,   '#fb7185')
assert.equal(getStyleColor('unknown').c, '#fb7185', 'unknown falls back to power')
assert.equal(getStyleColor(null).c,      '#fb7185')

// Labels
assert.equal(getStyleLabel('power'),     'Power')
assert.equal(getStyleLabel('endurance'), 'Endurance')
assert.equal(getStyleLabel(null),        null)

console.log('OK styleColors')
