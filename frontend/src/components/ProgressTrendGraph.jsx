import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getTrainingLogs } from '../api'
import { vGradeToTier, TIER_TOKENS, V_TIERS } from '../lib/tier'

/**
 * 8-week trend graph. Each column is a stacked bar where every segment
 * is colored by V-tier — so the user can SEE their stack shift up over
 * time toward harder grades.
 */
export default function ProgressTrendGraph() {
  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState([])

  useEffect(() => {
    getTrainingLogs(200).then((logs) => {
      setWeeks(buildWeeks(logs))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-2xl p-4"
         style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-2">
        Last 8 weeks
      </div>
      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 size={16} className="animate-spin text-accent"/></div>
      ) : (
        <>
          <div className="flex items-end gap-1 h-[72px]">
            {weeks.map((w) => <WeekColumn key={w.label} week={w} />)}
          </div>
          <p className="text-[10px] text-muted/70 mt-2">
            Each segment is one V-tier — watch the stack shift up as you climb harder grades.
          </p>
        </>
      )}
    </div>
  )
}

function WeekColumn({ week }) {
  const total = week.segments.reduce((s, x) => s + x.count, 0) || 1
  const maxH = 56
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full flex flex-col-reverse gap-[1px]" style={{ height: maxH }}>
        {week.segments.map(({ tierId, count }) => {
          const h = Math.max(2, Math.round((count / total) * maxH))
          return (
            <span key={tierId}
                  className="rounded-[2px]"
                  style={{ height: h, background: TIER_TOKENS[tierId].c }} />
          )
        })}
      </div>
      <span className="text-[9px] text-muted/60">{week.label}</span>
    </div>
  )
}

function buildWeeks(logs) {
  const byWeek = {}
  for (const log of logs) {
    const ws = weekStart(log.date)
    byWeek[ws] = byWeek[ws] || {}
    for (const [grade, c] of Object.entries((log.climbs || {}).boulder || {})) {
      const sends = (c.s || 0) + (c.f || 0)
      if (sends === 0) continue
      const tier = vGradeToTier(grade)
      if (!tier) continue
      byWeek[ws][tier] = (byWeek[ws][tier] || 0) + sends
    }
  }
  const today = new Date(); today.setHours(0,0,0,0)
  const weeks = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - (((today.getDay()+6)%7) + i*7))
    const ws = d.toISOString().slice(0,10)
    const bag = byWeek[ws] || {}
    const segments = V_TIERS
      .filter(t => bag[t])
      .map(t => ({ tierId: t, count: bag[t] }))
    weeks.push({ label: `W${8-i}`, segments })
  }
  return weeks
}

function weekStart(iso) {
  const d = new Date(iso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0,10)
}
