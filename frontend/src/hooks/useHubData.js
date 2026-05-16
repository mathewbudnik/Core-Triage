import { useEffect, useState } from 'react'
import {
  getSessions,
  getActivePlan,
  getTrainingStats,
  getTrainingLogs,
  getLeaderboard,
  getPyramid,
} from '../api'

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

// Compute the calendar date of a plan session using the same algorithm
// PlanView.jsx uses, so "today's session" is consistent across the app.
function planSessionForToday(activePlan) {
  if (!activePlan?.plan_data?.sessions?.length || !activePlan.start_date) return null
  const start = new Date(activePlan.start_date + 'T00:00:00')
  const dpw = activePlan.plan_data.days_per_week || 3
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOffset = Math.floor((today - start) / 86400000)

  for (const s of activePlan.plan_data.sessions) {
    const off = (s.week - 1) * 7 + Math.round((s.day_in_week - 1) * (7 / dpw))
    if (off === dayOffset) return s
  }
  return null
}

/**
 * Loads everything HubTab needs in parallel. Per-endpoint failures degrade
 * gracefully — a 404 on /api/plans/active is normal (no plan yet) and is
 * NOT surfaced as an error.
 *
 * Returns: { loading, lastTriage, activePlan, todaySession, todayLogged,
 *           stats, rank, hardestSends, pyramidPreview }
 */
export function useHubData(user) {
  const [data, setData] = useState({
    loading: true,
    lastTriage: null,
    activePlan: null,
    todaySession: null,
    todayLogged: false,
    stats: null,
    rank: null,
    hardestSends:   { boulder: null, route: null },
    pyramidPreview: [],
  })

  useEffect(() => {
    if (!user) {
      setData((d) => ({ ...d, loading: false }))
      return
    }
    let cancelled = false

    Promise.allSettled([
      getSessions(1),
      getActivePlan(),
      getTrainingStats(),
      getTrainingLogs(5),
      getLeaderboard({ window: 'week', limit: 1 }),
      getPyramid({ window: 'month' }),
    ]).then(([sessionsR, planR, statsR, logsR, lbR, pyrR]) => {
      if (cancelled) return

      const sessions   = sessionsR.status === 'fulfilled' ? (sessionsR.value || []) : []
      const activePlan = planR.status     === 'fulfilled' ? planR.value             : null
      const stats      = statsR.status    === 'fulfilled' ? statsR.value            : null
      const logs       = logsR.status     === 'fulfilled' ? (logsR.value || [])     : []
      const lb         = lbR.status       === 'fulfilled' ? lbR.value               : null
      const pyramid    = pyrR.status      === 'fulfilled' ? pyrR.value              : null

      const today = todayIsoDate()
      const todayLogged = logs.some((l) => l.date === today)
      const todaySession = planSessionForToday(activePlan)

      const hardestSends = {
        boulder: pyramid?.boulder?.hardest_send || null,
        route:   pyramid?.route?.hardest_send   || null,
      }
      // Boulder pyramid preview takes precedence (matches HubGreeting + spec).
      // Fall back to route if no boulder data. Top 3 grades, descending so
      // hardest shows first.
      const primaryColumn = pyramid?.boulder?.grades?.length
        ? pyramid.boulder.grades
        : (pyramid?.route?.grades || [])
      const pyramidPreview = [...primaryColumn].reverse().slice(0, 3)

      setData({
        loading: false,
        lastTriage: sessions[0] || null,
        activePlan,
        todaySession,
        todayLogged,
        stats,
        rank: lb?.me || null,
        hardestSends,
        pyramidPreview,
      })
    })

    return () => { cancelled = true }
  }, [user])

  return data
}
