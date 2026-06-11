import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the API layer (logTraining + the baseline fetch used by useTrainingBaseline).
vi.mock('../api', () => ({
  logTraining: vi.fn(async () => ({})),
  getTrainingBaseline: vi.fn(async () => ({
    session_count: 0,
    hardest_alltime: { boulder: null, route: null },
    is_calibrated: false,
  })),
}))

import { logTraining } from '../api'
import { useSessionLog } from './useSessionLog'

// Stable reference — useTrainingBaseline keys an effect on `user`, so a fresh
// object each render would loop (in the app, user is a stable state value).
const USER = { id: 1 }

describe('useSessionLog (preserved /api/training contract)', () => {
  beforeEach(() => {
    logTraining.mockClear()
    try { localStorage.clear() } catch { /* jsdom */ }
  })

  it('honors prefill duration and posts a quick flash send merged into climbs.boulder', async () => {
    const onClose = vi.fn()
    const { result } = renderHook(() =>
      useSessionLog({ user: USER, prefill: { sessionType: 'bouldering', duration_min: 42 }, onClose }),
    )

    // Planned duration seeds the slider (the old form hardcoded 90).
    expect(result.current.form.duration_min).toBe(42)
    expect(result.current.showClimbSection).toBe(true)
    expect(result.current.canSave).toBe(false)

    act(() => { result.current.addSend({ grade: 'V5', outcome: 'flash', stylePrimary: 'powerful' }) })
    expect(result.current.canSave).toBe(true)

    act(() => { result.current.save() })
    await waitFor(() => expect(logTraining).toHaveBeenCalledTimes(1))

    const payload = logTraining.mock.calls[0][0]
    expect(payload.session_type).toBe('bouldering')
    expect(payload.duration_min).toBe(42)
    expect(payload.intensity).toBe(7)
    // Flash → f counter; same merge the legacy TrainingLogEntry produced.
    expect(payload.climbs.boulder.V5).toEqual({ s: 0, f: 1, p: 0 })

    // A successful climb log opens the celebration overlay; onClose only
    // fires once the user dismisses it (closeSummary) — preserved behavior.
    await waitFor(() => expect(result.current.summaryOpen).toBe(true))
    expect(onClose).not.toHaveBeenCalled()
    act(() => { result.current.closeSummary() })
    expect(onClose).toHaveBeenCalled()
  })

  it('merges redpoint→s and project→p across grades', async () => {
    const { result } = renderHook(() =>
      useSessionLog({ user: USER, prefill: { sessionType: 'bouldering' }, onClose: vi.fn() }),
    )
    act(() => {
      result.current.addSend({ grade: 'V4', outcome: 'redpoint', stylePrimary: 'crimpy' })
      result.current.addSend({ grade: 'V4', outcome: 'redpoint', stylePrimary: 'crimpy' })
      result.current.addSend({ grade: 'V6', outcome: 'project', stylePrimary: 'dynamic' })
    })
    act(() => { result.current.save() })
    await waitFor(() => expect(logTraining).toHaveBeenCalledTimes(1))
    const { climbs } = logTraining.mock.calls[0][0]
    expect(climbs.boulder.V4).toEqual({ s: 2, f: 0, p: 0 })
    expect(climbs.boulder.V6).toEqual({ s: 0, f: 0, p: 1 })
  })

  it('defaults duration to 90 and lets a training session save with no climbs', () => {
    const { result } = renderHook(() =>
      useSessionLog({ user: USER, prefill: { sessionType: 'hangboard' }, onClose: vi.fn() }),
    )
    expect(result.current.form.duration_min).toBe(90)
    expect(result.current.showClimbSection).toBe(false)
    expect(result.current.canSave).toBe(true) // non-climb sessions need no sends
  })

  it('maps plan-template types (power → bouldering)', () => {
    const { result } = renderHook(() =>
      useSessionLog({ user: USER, prefill: { sessionType: 'power' }, onClose: vi.fn() }),
    )
    expect(result.current.form.session_type).toBe('bouldering')
  })
})
