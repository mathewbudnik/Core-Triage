// Smoke verification for styleProfile.js.
// Run: node frontend/scripts/smoke-styleProfile.mjs
import { deriveStyleProfile } from '../src/lib/styleProfile.js'
import assert from 'node:assert/strict'

// ── No logs ──────────────────────────────────────────────────────────────
const empty = deriveStyleProfile([])
assert.deepEqual(empty.counts, { power: 0, dynamic: 0, technical: 0, endurance: 0 })
assert.equal(empty.total, 0)
assert.equal(empty.confidence, 'low')
assert.equal(empty.dominant, null)
assert.equal(empty.weakest, null)

// ── Untagged logs only (legacy) — also low confidence ───────────────────
const legacy = deriveStyleProfile([
  { climbs: { boulder: { V3: { s: 2, f: 0, p: 0 } } } },
  { climbs: { boulder: { V4: { s: 1, f: 1, p: 0 } } } },
])
assert.equal(legacy.total, 0, 'untagged climbs do not count toward total')
assert.equal(legacy.confidence, 'low')

// ── Low confidence (< 6 tagged) ──────────────────────────────────────────
const low = deriveStyleProfile([
  { climbs: { boulder: { V3: { s: 2, f: 0, p: 0, styles: { power: 2, dynamic: 0, technical: 0, endurance: 0 } } } } },
])
assert.equal(low.total, 2)
assert.equal(low.confidence, 'low')

// ── Medium confidence (6-19 tagged) ──────────────────────────────────────
const med = deriveStyleProfile([
  { climbs: { boulder: { V3: { s: 5, f: 0, p: 0, styles: { power: 5, dynamic: 0, technical: 0, endurance: 0 } } } } },
  { climbs: { boulder: { V4: { s: 3, f: 0, p: 0, styles: { power: 0, dynamic: 0, technical: 3, endurance: 0 } } } } },
])
assert.equal(med.total, 8)
assert.equal(med.confidence, 'medium')
assert.equal(med.dominant, 'power')
assert.equal(med.weakest, 'dynamic')   // power=5 tech=3 dyn=0 end=0; tie at zero broken alphabetically
assert.equal(med.pct.power, 63)        // 5/8 = 62.5 -> rounded 63
assert.equal(med.pct.technical, 37)

// ── High confidence (>= 20 tagged) ───────────────────────────────────────
const hi = deriveStyleProfile([
  { climbs: { boulder: {
      V3: { s: 10, f: 0, p: 0, styles: { power: 10, dynamic: 0, technical: 0, endurance: 0 } },
      V4: { s: 6,  f: 0, p: 0, styles: { power: 0, dynamic: 6, technical: 0, endurance: 0 } },
      V5: { s: 4,  f: 0, p: 0, styles: { power: 0, dynamic: 0, technical: 4, endurance: 0 } },
  } } },
])
assert.equal(hi.total, 20)
assert.equal(hi.confidence, 'high')
assert.equal(hi.dominant, 'power')
assert.equal(hi.weakest, 'endurance')

// ── Routes count too ─────────────────────────────────────────────────────
const routes = deriveStyleProfile([
  { climbs: { route: { '5.11a': { s: 8, f: 0, p: 0, styles: { power: 0, dynamic: 0, technical: 0, endurance: 8 } } } } },
])
assert.equal(routes.total, 8)
assert.equal(routes.dominant, 'endurance')

// ── Mixed sums must equal totals (invariant) ─────────────────────────────
const inv = deriveStyleProfile([
  { climbs: { boulder: { V4: { s: 2, f: 1, p: 0, styles: { power: 2, dynamic: 1, technical: 0, endurance: 0 } } } } },
])
assert.equal(inv.total, 3, 'sum of style counts equals s+f+p')
assert.equal(inv.counts.power + inv.counts.dynamic + inv.counts.technical + inv.counts.endurance, 3)

console.log('OK styleProfile')
