import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getTrainingLogs } from '../api'

// Map session_type → left-border color + pill tints. Falls back to muted
// for any type we don't have an explicit theme for.
const TYPE_THEME = {
  bouldering: { border: '#7dd3c0', pillBg: 'rgba(125,211,192,0.15)', pillText: '#7dd3c0' },
  routes:     { border: '#5eb4f0', pillBg: 'rgba(94,180,240,0.15)',  pillText: '#5eb4f0' },
  hangboard:  { border: '#7dd3c0', pillBg: 'rgba(125,211,192,0.15)', pillText: '#7dd3c0' },
  power:      { border: '#f47272', pillBg: 'rgba(244,114,114,0.15)', pillText: '#f47272' },
  project:    { border: '#f7bb51', pillBg: 'rgba(247,187,81,0.15)',  pillText: '#f7bb51' },
  strength:   { border: '#a594f9', pillBg: 'rgba(165,148,249,0.15)', pillText: '#a594f9' },
  outdoor:    { border: '#f7bb51', pillBg: 'rgba(247,187,81,0.15)',  pillText: '#f7bb51' },
  rest:       { border: '#8a93a6', pillBg: 'rgba(138,147,166,0.15)', pillText: '#8a93a6' },
  other:      { border: '#8a93a6', pillBg: 'rgba(138,147,166,0.15)', pillText: '#8a93a6' },
}

function themeFor(type) {
  return TYPE_THEME[type] || TYPE_THEME.other
}

function typeLabel(t) {
  if (!t) return 'Session'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function formatDuration(min) {
  if (min == null) return ''
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function relativeWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDay   = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dayDiff = Math.round((startOfToday - startOfDay) / dayMs)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (dayDiff === 0) return `Today · ${time}`
  if (dayDiff === 1) return `Yesterday · ${time}`
  if (dayDiff < 7)   return `${d.toLocaleDateString(undefined, { weekday: 'short' })} · ${time}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TrainRecentSessions({ refreshKey }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getTrainingLogs(5)
      .then((data) => { if (!cancelled) setLogs(Array.isArray(data) ? data : []) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Could not load recent sessions.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={15} className="animate-spin text-accent" />
      </div>
    )
  }
  if (error) {
    return <p className="text-xs text-accent2 text-center py-2">{error}</p>
  }
  if (logs.length === 0) {
    return (
      <p className="text-xs text-muted text-center py-3 italic">
        No sessions yet. Log your first one above.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {logs.map((log) => {
        const t = themeFor(log.session_type)
        return (
          <div
            key={log.id}
            className="flex items-center gap-2.5 bg-panel border border-outline rounded-lg px-2.5 py-2"
            style={{ borderLeftWidth: 3, borderLeftColor: t.border }}
          >
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: t.pillBg, color: t.pillText }}
            >
              {typeLabel(log.session_type)}
            </span>
            <span className="text-[11px] text-muted flex-1 min-w-0 truncate">
              {relativeWhen(log.created_at || log.date)}
            </span>
            <span className="text-[12px] font-extrabold text-text tabular-nums">
              {formatDuration(log.duration_min)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
