import { useEffect, useState, useCallback } from 'react'
import { getAwards } from '../api'

/**
 * Fetch + cache the user's awards. Returns:
 *   { loading, earned: [...], locked: [...], refresh }
 *
 * Earned entries are backend rows: { id, kind, payload, earned_at }.
 * Locked entries are backend stubs: { kind, label, category }.
 * Consumers enrich with frontend AWARD_META at render time.
 */
export function useAwards(user) {
  const [data, setData] = useState({ loading: true, earned: [], locked: [] })

  const refresh = useCallback(() => {
    if (!user) {
      setData({ loading: false, earned: [], locked: [] })
      return
    }
    setData((d) => ({ ...d, loading: true }))
    getAwards()
      .then(({ earned, locked }) => setData({ loading: false, earned, locked }))
      .catch(() => setData({ loading: false, earned: [], locked: [] }))
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return { ...data, refresh }
}
