import { useEffect, useState, useCallback, useMemo } from 'react'
import { getRehabProgress, checkRehabExercise, uncheckRehabExercise } from '../api'

// Returns the user's local YYYY-MM-DD. `en-CA` always formats as ISO.
function localTodayIso() {
  return new Date().toLocaleDateString('en-CA')
}

/**
 * Loads today's rehab checkoff state and exposes an optimistic toggle.
 *
 * Returns:
 *   loading:  boolean
 *   checked:  Set<string>           — exercise_keys checked today
 *   toggle:   (exerciseKey, region, phase) => Promise<void>
 *   refetch:  () => void
 */
export function useRehabProgress(user) {
  const today = useMemo(localTodayIso, [])
  const [checked, setChecked] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await getRehabProgress(today)
      setChecked(new Set((data?.checked || []).map((r) => r.exercise_key)))
    } catch (_) {
      setChecked(new Set())
    } finally {
      setLoading(false)
    }
  }, [user, today])

  useEffect(() => { refetch() }, [refetch])

  // Optimistic toggle: flip locally first, then sync to the server. Revert on
  // failure. Returns the promise so callers can await if they want.
  const toggle = useCallback(async (exerciseKey, region, phase) => {
    const wasChecked = checked.has(exerciseKey)
    // Optimistic local update
    setChecked((prev) => {
      const next = new Set(prev)
      if (wasChecked) next.delete(exerciseKey)
      else next.add(exerciseKey)
      return next
    })
    try {
      if (wasChecked) {
        await uncheckRehabExercise({ exercise_key: exerciseKey, date: today })
      } else {
        await checkRehabExercise({ exercise_key: exerciseKey, region, phase, date: today })
      }
    } catch (_) {
      // Revert on error
      setChecked((prev) => {
        const next = new Set(prev)
        if (wasChecked) next.add(exerciseKey)
        else next.delete(exerciseKey)
        return next
      })
    }
  }, [checked, today])

  return { loading, checked, toggle, refetch }
}
