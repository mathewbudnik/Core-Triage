import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getSessions } from '../api'
import { useRehabProgress } from '../hooks/useRehabProgress'
import { REHAB_REGIONS } from '../lib/pickFeatured'
import { rehabProgress } from '../lib/rehabHeuristic'
import BodyActiveView from './BodyActiveView'
import BodyEmptyView from './BodyEmptyView'

/**
 * State machine:
 *   loading → fetching last triage
 *   active  → has triage within last 90 days AND region is in EXERCISES
 *   empty   → no qualifying active triage
 *
 * The active/empty decision mirrors the same `hasTriageWithin(data, 90)`
 * logic used by the Hub. Kept inline (small fn) to avoid an extra import.
 */
function isActiveTriage(triage) {
  if (!triage) return false
  if (!REHAB_REGIONS.has(triage.injury_area)) return false
  const rp = rehabProgress(triage.created_at)
  // 90-day cutoff: Phase 1 (14d) + Phase 2 (28d) + Phase 3 cap (~48d more) = ~90 days
  return !!rp && rp.days <= 90
}

export default function BodyTab({ user }) {
  const [loading, setLoading] = useState(true)
  const [recent, setRecent] = useState([])   // most recent triages, used for both active + empty
  const { checked, toggle } = useRehabProgress(user)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    getSessions(5)
      .then((data) => { if (!cancelled) setRecent(data || []) })
      .catch(() => { if (!cancelled) setRecent([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="text-accent animate-spin" />
      </div>
    )
  }

  const activeTriage = recent.find(isActiveTriage)

  if (activeTriage) {
    return (
      <BodyActiveView
        triage={activeTriage}
        checked={checked}
        onToggle={toggle}
      />
    )
  }

  return <BodyEmptyView pastTriage={recent} />
}
