import { describe, it, expect } from 'vitest'
import { getInitialState, awardPrescriptionXP } from '../rewardEngine'

describe('awardPrescriptionXP', () => {
  it('adds XP and records the prescription id on first award', () => {
    const s0 = getInitialState()
    const { state, awarded } = awardPrescriptionXP(s0, 42, 250)
    expect(awarded).toBe(true)
    expect(state.totalXP).toBe(s0.totalXP + 250)
    expect(state.prescriptionAwards).toContain(42)
  })

  it('does not re-award the same prescription id (dedup)', () => {
    const s0 = getInitialState()
    const { state: s1 } = awardPrescriptionXP(s0, 42, 250)
    const { state: s2, awarded } = awardPrescriptionXP(s1, 42, 250)
    expect(awarded).toBe(false)
    expect(s2.totalXP).toBe(s1.totalXP) // unchanged
  })

  it('ignores a null id', () => {
    const s0 = getInitialState()
    const { state, awarded } = awardPrescriptionXP(s0, null, 250)
    expect(awarded).toBe(false)
    expect(state).toBe(s0)
  })
})
