import { describe, it, expect } from 'vitest'
import { previewSendXP, modalityFromSessionType } from './sendPreview.js'
import { getInitialState } from './rewardEngine.js'

describe('modalityFromSessionType', () => {
  it('maps outdoor session to outdoor modality', () => {
    expect(modalityFromSessionType('outdoor')).toBe('outdoor')
  })
  it('maps indoor session types to indoor modality', () => {
    expect(modalityFromSessionType('bouldering')).toBe('indoor')
    expect(modalityFromSessionType('routes')).toBe('indoor')
  })
  it('maps non-climb session types to indoor (no effect on null grade)', () => {
    expect(modalityFromSessionType('hangboard')).toBe('indoor')
  })
})

describe('previewSendXP', () => {
  const state = getInitialState()

  it('returns 0 + empty breakdown when grade is missing', () => {
    const { xp, breakdown } = previewSendXP({
      grade: null, outcome: 'redpoint', stylePrimary: 'powerful',
      sessionType: 'bouldering',
    }, state)
    expect(xp).toBe(0)
    expect(breakdown).toBe('')
  })

  it('matches calculateSendXP for a V3 flash indoor', () => {
    const { xp, breakdown } = previewSendXP({
      grade: 'V3', outcome: 'flash', stylePrimary: 'powerful',
      sessionType: 'bouldering',
    }, state)
    // V3 base 55, indoor 1.0, flash 2.0, no PR (no prior sends), gap 1.0, deep 1.0
    expect(xp).toBe(110)
    expect(breakdown).toContain('V3')
    expect(breakdown).toContain('flash')
    expect(breakdown).toContain('indoor')
  })

  it('flags PR multiplier when grade exceeds bestPerStyle', () => {
    const stateWithBest = {
      ...getInitialState(),
      bestPerStyle: { powerful: 2, crimpy: null, dynamic: null, technical: null, mobility: null },
    }
    const { xp, breakdown } = previewSendXP({
      grade: 'V4', outcome: 'redpoint', stylePrimary: 'powerful',
      sessionType: 'outdoor',
    }, stateWithBest)
    // V4 base 80, outdoor 1.5, redpoint 1.0, PR 1.5, gap (powerful is bottom of empty shape) —
    // since all axes are 0, ordering by value puts powerful first → gap 1.5
    // Floor(80 × 1.5 × 1.0 × 1.5 × 1.5) = Floor(270) = 270
    expect(xp).toBe(270)
    expect(breakdown).toContain('PR')
  })
})
