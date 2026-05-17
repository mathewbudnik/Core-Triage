import { useEffect, useState, useCallback } from 'react'
import { getHubTip, dismissHubTip } from '../api'

/**
 * Fetch + manage today's Hub tip.
 *
 * Returns:
 *   { tip, loading, dismiss }
 *
 * `tip` is null when no pattern matches OR user dismissed today's tip.
 * `dismiss()` optimistically hides the card and POSTs to the backend.
 */
export function useHubTip(user) {
  const [tip, setTip] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!user) {
      setLoading(false); setTip(null); return
    }
    let cancelled = false
    setLoading(true)
    getHubTip(today)
      .then((data) => { if (!cancelled) setTip(data?.tip || null) })
      .catch(() => { if (!cancelled) setTip(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, today])

  const dismiss = useCallback(() => {
    setTip(null)  // optimistic
    dismissHubTip(today).catch(() => {})  // best-effort
  }, [today])

  return { tip, loading, dismiss }
}
