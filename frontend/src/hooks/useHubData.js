import { useEffect, useState } from 'react'
import {
  getSessions, getActivePlan, getTrainingStats, getTrainingLogs,
  getPyramid,
} from '../api'

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

function planSessionForToday(activePlan) {
  if (!activePlan?.plan_data?.sessions?.length || !activePlan.start_date) return null
  const start = new Date(activePlan.start_date + 'T00:00:00')
  const dpw = activePlan.plan_data.days_per_week || 3
  const today = new Date(); today.setHours(0,0,0,0)
  const dayOffset = Math.floor((today - start) / 86400000)
  for (const s of activePlan.plan_data.sessions) {
    const off = (s.week - 1) * 7 + Math.round((s.day_in_week - 1) * (7 / dpw))
    if (off === dayOffset) return s
  }
  return null
}

function weekStartIso(iso) {
  const d = new Date(iso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0,10)
}

function buildFeedItems(logs) {
  const items = []
  for (const log of logs.slice(0, 8)) {
    const climbs = log.climbs || {}
    for (const discipline of ['boulder', 'route']) {
      const grades = climbs[discipline] || {}
      for (const [grade, c] of Object.entries(grades)) {
        if (c.s > 0 || c.f > 0) {
          items.push({
            id: `${log.id}-${discipline}-${grade}`,
            grade,
            discipline,
            kind: c.f > 0 ? 'flash' : 'send',
            count: c.s,
            dateLabel: log.date,
          })
        } else if (c.p > 0) {
          items.push({
            id: `${log.id}-${discipline}-${grade}-proj`,
            grade,
            discipline,
            kind: 'project',
            count: c.p,
            dateLabel: log.date,
          })
        }
      }
    }
  }
  return items.slice(0, 8)
}

function computeStreakDays(logs, todayIso) {
  const dates = new Set(logs.map(l => l.date))
  let streak = 0
  let cursor = new Date(todayIso + 'T00:00:00')
  while (dates.has(cursor.toISOString().slice(0,10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function tierOrdinal(id) {
  return parseInt(String(id || 'v0').slice(1), 10)
}

function computeRings(logs, todayIso, workingTierId) {
  const ws = weekStartIso(todayIso)
  const inWeek = logs.filter(l => l.date >= ws && l.date <= todayIso)
  let sends = 0
  for (const log of inWeek) {
    for (const discipline of ['boulder','route']) {
      for (const c of Object.values((log.climbs || {})[discipline] || {})) {
        sends += (c.s || 0) + (c.f || 0)
      }
    }
  }
  const climbDays = new Set(inWeek.map(l => l.date)).size
  let pushAttempts = 0
  for (const log of inWeek) {
    for (const [grade, c] of Object.entries((log.climbs || {}).boulder || {})) {
      if (c.p > 0) {
        const m = /^V(\d+)$/.exec(grade)
        if (m && Number(m[1]) > tierOrdinal(workingTierId)) pushAttempts += c.p
      }
    }
  }
  return {
    ringSends:        { done: sends,        goal: 10 },
    ringClimbDays:    { done: climbDays,    goal: 4 },
    ringPushAttempts: { done: pushAttempts, goal: 3 },
  }
}

function pickCurrentProject(logs, workingTierId) {
  // Heuristic: hardest project (any climb with p>0) above the working tier
  // within the last 14 days. Returns null if none.
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14)
  const cutoffIso = cutoff.toISOString().slice(0,10)
  const tries = []
  for (const log of logs) {
    if (log.date < cutoffIso) continue
    for (const [grade, c] of Object.entries((log.climbs || {}).boulder || {})) {
      if (c.p > 0) tries.push({ grade, log })
    }
  }
  if (!tries.length) return null
  tries.sort((a,b) => parseInt(a.grade.slice(1),10) - parseInt(b.grade.slice(1),10))
  const top = tries[tries.length - 1]
  const failedTries = logs.reduce((sum, l) => {
    const c = (l.climbs || {}).boulder?.[top.grade]
    return sum + (c?.p || 0)
  }, 0)
  return {
    name: 'Current project',
    grade: top.grade,
    failedTries,
    hasCurrentTry: true,
    futureTryCount: 0,
  }
}

export function useHubData(user) {
  const [data, setData] = useState({
    loading: true,
    lastTriage: null, activePlan: null, todaySession: null, todayLogged: false,
    stats: null,
    hardestSends: { boulder: null, route: null },
    pyramidPreview: [],
    streakDays: 0,
    weekLoggedDates: new Set(),
    isFirstLogOfWeek: false,
    isPlanRestDay: false,
    feedItems: [],
    currentProject: null,
    recentLogs: [],
    ringSends:        { done: 0, goal: 10 },
    ringClimbDays:    { done: 0, goal: 4  },
    ringPushAttempts: { done: 0, goal: 3  },
  })

  useEffect(() => {
    if (!user) { setData(d => ({ ...d, loading: false })); return }
    let cancelled = false

    Promise.allSettled([
      getSessions(1),
      getActivePlan(),
      getTrainingStats(),
      getTrainingLogs(30),
      getPyramid({ window: 'month' }),
    ]).then(([sessionsR, planR, statsR, logsR, pyrR]) => {
      if (cancelled) return

      const sessions   = sessionsR.status === 'fulfilled' ? (sessionsR.value || []) : []
      const activePlan = planR.status     === 'fulfilled' ? planR.value             : null
      const stats      = statsR.status    === 'fulfilled' ? statsR.value            : null
      const logs       = logsR.status     === 'fulfilled' ? (logsR.value || [])     : []
      const pyramid    = pyrR.status      === 'fulfilled' ? pyrR.value              : null

      const today = todayIsoDate()
      const todayLogged = logs.some(l => l.date === today)
      const todaySession = planSessionForToday(activePlan)
      const hardestSends = {
        boulder: pyramid?.boulder?.hardest_send || null,
        route:   pyramid?.route?.hardest_send   || null,
      }
      // Compute working tier inline (avoid importing tier.js to keep this hook self-contained)
      const workingTierId = (() => {
        if (hardestSends.boulder) {
          const n = parseInt(/V(\d+)/.exec(hardestSends.boulder)?.[1] || '0', 10)
          return `v${Math.min(n, 10)}`
        }
        return 'v0'
      })()
      const streakDays = computeStreakDays(logs, today)
      const ws = weekStartIso(today)
      const weekLoggedDates = new Set(logs.filter(l => l.date >= ws && l.date <= today).map(l => l.date))
      const lastLog = logs[0]?.date
      const isFirstLogOfWeek = !lastLog || lastLog < ws
      const rings = computeRings(logs, today, workingTierId)
      const feedItems = buildFeedItems(logs)
      const currentProject = pickCurrentProject(logs, workingTierId)
      const primary = pyramid?.boulder?.grades?.length ? pyramid.boulder.grades : (pyramid?.route?.grades || [])
      const pyramidPreview = [...primary].reverse().slice(0,3)
      const isPlanRestDay = !!(activePlan && !todaySession)

      setData({
        loading: false,
        lastTriage: sessions[0] || null,
        activePlan, todaySession, todayLogged,
        stats,
        hardestSends, pyramidPreview,
        streakDays, weekLoggedDates, isFirstLogOfWeek, isPlanRestDay,
        feedItems, currentProject, recentLogs: logs,
        ...rings,
      })
    })

    return () => { cancelled = true }
  }, [user])

  return data
}
