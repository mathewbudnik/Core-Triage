import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { getSessions, getRehabPlan } from '../api'
import { useRehabProgress } from '../hooks/useRehabProgress'
import { REHAB_REGIONS } from '../lib/pickFeatured'
import { rehabProgress } from '../lib/rehabHeuristic'
import { readLastTriage } from '../lib/lastTriage'
import RecoverActiveView from './RecoverActiveView'
import RecoverEmptyView from './RecoverEmptyView'

/**
 * State machine:
 *   loading → fetching last triage
 *   active  → has triage within last 90 days AND region is in EXERCISES
 *   empty   → no qualifying active triage
 *
 * Fresh-submit overlay: when TriageTab navigates here with
 * location.state.triageResult, we prefer that over the DB lookup so the
 * just-submitted diagnosis surfaces immediately (and works for signed-out
 * users, who have no DB row to read from).
 *
 * The active/empty decision mirrors the same `hasTriageWithin(data, 90)`
 * logic used by the Hub.
 */
function isActiveTriage(triage) {
  if (!triage) return false
  if (!REHAB_REGIONS.has(triage.injury_area)) return false
  const rp = rehabProgress(triage.created_at)
  // 90-day cutoff: Phase 1 (14d) + Phase 2 (28d) + Phase 3 cap (~48d more) = ~90 days
  return !!rp && rp.days <= 90
}

export default function RecoverTab({ user, onLoginClick }) {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [recent, setRecent] = useState([])   // most recent triages, used for both active + empty
  const { checked, toggle } = useRehabProgress(user)
  const [recovering, setRecovering] = useState(null) // { phase, streak, last7 } | null
  const [planTriage, setPlanTriage] = useState(null) // { id, injury_area, created_at } | null

  // Diagnosis comes from one of two sources, in priority order:
  //   1. location.state — set by TriageTab on submit, instant, history-scoped
  //   2. sessionStorage — set on the same submit, survives refresh + re-nav
  //                       within the tab session
  // Reading sessionStorage once at mount (useMemo) avoids re-reading on every
  // render. Read state directly each render so back/forward updates surface.
  const navResult = location.state?.triageResult ?? null
  const navForm   = location.state?.triageForm  ?? null
  const cached    = useMemo(() => readLastTriage(), [])
  const diagnosis     = navResult ?? cached?.result ?? null
  const diagnosisForm = navForm   ?? cached?.form   ?? null
  // Cached session id from the post-triage save — drives the
  // "Saved to history. Undo?" banner under the diagnosis. Null for
  // anonymous users / when the save failed silently.
  const savedSessionId = cached?.sessionId ?? null

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    const today = new Date().toLocaleDateString('en-CA')
    Promise.all([
      getSessions(5).catch(() => []),
      getRehabPlan(today).catch(() => null),
    ])
      .then(([sessions, plan]) => {
        if (cancelled) return
        setRecent(sessions || [])
        if (plan?.plan) {
          setRecovering({ phase: plan.phase, streak: plan.streak, last7: plan.last7 })
          setPlanTriage({
            id: plan.plan.id,
            injury_area: plan.plan.region,
            created_at: plan.plan.plan_started_at,
          })
        }
      })
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

  // Prefer the diagnosis we have in hand (nav state or cache) over the DB
  // lookup — signed-out users have nothing in the DB, signed-in users get
  // the latest diagnosis even if the just-written session row hasn't
  // propagated to getSessions yet. created_at comes from the cache when
  // available so the rehab-phase calculation stays stable across refreshes.
  const inMemoryTriage = diagnosisForm?.region
    ? {
        id: 'pending',
        injury_area: diagnosisForm.region,
        created_at: cached?.savedAt ?? new Date().toISOString(),
      }
    : null

  const activeTriage = inMemoryTriage ?? planTriage ?? recent.find(isActiveTriage)

  if (activeTriage) {
    return (
      <RecoverActiveView
        triage={activeTriage}
        diagnosis={diagnosis}
        diagnosisForm={diagnosisForm}
        savedSessionId={savedSessionId}
        signedIn={!!user}
        onLoginClick={onLoginClick}
        checked={checked}
        onToggle={toggle}
        recovering={recovering}
      />
    )
  }

  return <RecoverEmptyView pastTriage={recent} />
}
