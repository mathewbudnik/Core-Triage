import { useEffect, useState, useCallback } from 'react'
import { getTrainingBaseline } from '../api'

/**
 * Returns the user's training baseline used for plausibility-check
 * decisions in the climb logger:
 *   { loading, sessionCount, hardestAlltime, isCalibrated, refresh }
 *
 * Calibration: until session_count >= 5, the logger trusts whatever
 * the user enters (a real V8 climber needs to establish their baseline
 * without artificial friction). After calibration, big jumps above
 * hardest_alltime trigger a confirmation modal.
 *
 * Anonymous users return loading=false with zeroed values — the logger
 * treats them as calibrated by default (no auth = no leaderboard
 * implications). Call refresh() after a successful log to pull the
 * updated baseline.
 */
export function useTrainingBaseline(user) {
  const [data, setData] = useState({
    loading: true,
    sessionCount: 0,
    hardestAlltime: { boulder: null, route: null },
    isCalibrated: true,
  })

  const refresh = useCallback(() => {
    if (!user) {
      setData({ loading: false, sessionCount: 0, hardestAlltime: { boulder: null, route: null }, isCalibrated: true })
      return
    }
    setData((d) => ({ ...d, loading: true }))
    getTrainingBaseline()
      .then((r) => setData({
        loading: false,
        sessionCount:   r?.session_count   || 0,
        hardestAlltime: r?.hardest_alltime || { boulder: null, route: null },
        isCalibrated:   !!r?.is_calibrated,
      }))
      .catch(() => setData({ loading: false, sessionCount: 0, hardestAlltime: { boulder: null, route: null }, isCalibrated: true }))
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return { ...data, refresh }
}
