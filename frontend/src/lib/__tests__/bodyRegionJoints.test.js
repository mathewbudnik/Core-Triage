import { describe, it, expect } from 'vitest'
import { BODY_REGION_JOINTS, jointsForFinding, activeFindingAt } from '../bodyRegionJoints'

describe('BODY_REGION_JOINTS', () => {
  it('covers all four finding bodyRegion values with non-empty joints + segments', () => {
    for (const region of ['head-gaze', 'shoulders-arms', 'hips-core', 'knees-feet']) {
      expect(BODY_REGION_JOINTS[region].joints.length).toBeGreaterThan(0)
      expect(BODY_REGION_JOINTS[region].segments.length).toBeGreaterThan(0)
    }
  })
})

describe('jointsForFinding', () => {
  it('returns the region spec for a known region', () => {
    expect(jointsForFinding({ bodyRegion: 'shoulders-arms' })).toBe(BODY_REGION_JOINTS['shoulders-arms'])
  })
  it('falls back to a non-empty spec for an unknown/missing region', () => {
    expect(jointsForFinding({ bodyRegion: 'nope' }).joints.length).toBeGreaterThan(0)
    expect(jointsForFinding(null).joints.length).toBeGreaterThan(0)
  })
})

describe('activeFindingAt', () => {
  const flag = (over) => ({ kind: 'flag', severity: 'polish', timestamps: [2000], ...over })
  it('returns a finding whose instance is within the window of ts', () => {
    const found = activeFindingAt([flag({ ruleId: 'A', timestamps: [2000] })], 2300)
    expect(found?.ruleId).toBe('A')
  })
  it('returns null when nothing is near', () => {
    expect(activeFindingAt([flag({ timestamps: [10000] })], 2000)).toBeNull()
  })
  it('prefers the higher-severity active finding', () => {
    const found = activeFindingAt([
      flag({ ruleId: 'low', severity: 'polish', timestamps: [2000] }),
      flag({ ruleId: 'high', severity: 'critical', timestamps: [2100] }),
    ], 2050)
    expect(found.ruleId).toBe('high')
  })
  it('ignores wins', () => {
    expect(activeFindingAt([{ kind: 'win', severity: 'critical', timestamps: [2000] }], 2000)).toBeNull()
  })
})
