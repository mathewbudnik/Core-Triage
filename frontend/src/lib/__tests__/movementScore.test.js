import { describe, it, expect } from 'vitest'
import { scoreClip } from '../movementScore'

const f = (over = {}) => ({
  ruleId: 'X', kind: 'flag', severity: 'important', bodyRegion: 'hips-core',
  instanceCount: 1, confidence: 1, isFallProximal: false, timestamps: [1000], ...over,
})

describe('scoreClip', () => {
  it('is 100 with no flags', () => {
    expect(scoreClip([]).overall).toBe(100)
    expect(scoreClip([]).perRegion).toEqual({})
  })

  it('a critical fall-proximal finding penalizes its region more than a polish one', () => {
    const crit = scoreClip([f({ severity: 'critical', isFallProximal: true })]).perRegion['hips-core']
    const polish = scoreClip([f({ severity: 'polish' })]).perRegion['hips-core']
    expect(crit).toBeLessThan(polish)
  })

  it('more instances penalize more (log scaling)', () => {
    const few = scoreClip([f({ instanceCount: 1 })]).perRegion['hips-core']
    const many = scoreClip([f({ instanceCount: 8 })]).perRegion['hips-core']
    expect(many).toBeLessThan(few)
  })

  it('wins do not subtract', () => {
    const r = scoreClip([f({ kind: 'win', severity: 'critical' })])
    expect(r.overall).toBe(100)
    expect(r.perRegion).toEqual({})
  })

  it('overall averages only regions with findings; perRegion lists only present regions', () => {
    const r = scoreClip([
      f({ bodyRegion: 'hips-core', severity: 'critical', instanceCount: 4 }),
      f({ bodyRegion: 'knees-feet', severity: 'polish' }),
    ])
    expect(Object.keys(r.perRegion).sort()).toEqual(['hips-core', 'knees-feet'])
    const avg = Math.round((r.perRegion['hips-core'] + r.perRegion['knees-feet']) / 2)
    expect(r.overall).toBe(avg)
  })

  it('clamps a region to [0,100]', () => {
    const r = scoreClip([f({ severity: 'critical', instanceCount: 999, isFallProximal: true })])
    expect(r.perRegion['hips-core']).toBeGreaterThanOrEqual(0)
  })
})
