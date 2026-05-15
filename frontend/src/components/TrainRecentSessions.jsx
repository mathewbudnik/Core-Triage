import { useEffect, useState } from 'react'
import { Loader2, Activity } from 'lucide-react'
import { getTrainingLogs } from '../api'

// Per-session-type theme — drives the type pill, the left border accent on
// the featured card, and the colored dot on compact rows. Falls back to
// muted slate for anything we don't have an explicit theme for.
const TYPE_THEME = {
  bouldering: { color: '#7dd3c0', label: 'Bouldering' },
  routes:     { color: '#5eb4f0', label: 'Routes'     },
  hangboard:  { color: '#7dd3c0', label: 'Hangboard'  },
  power:      { color: '#f47272', label: 'Power'      },
  project:    { color: '#f7bb51', label: 'Project'    },
  strength:   { color: '#a594f9', label: 'Strength'   },
  outdoor:    { color: '#f7bb51', label: 'Outdoor'    },
  rest:       { color: '#8a93a6', label: 'Rest'       },
  other:      { color: '#8a93a6', label: 'Session'    },
}
function themeFor(t) { return TYPE_THEME[t] || TYPE_THEME.other }

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

// Strava-flavored featured card for the most recent session. Bigger, with
// type-tinted bg + left border accent, headline duration, and (optionally)
// a context line ("longest power session this week", etc).
function FeaturedSession({ log, contextLine }) {
  const t = themeFor(log.session_type)
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-l-4 border-y border-r p-4"
      style={{
        background: `linear-gradient(135deg, ${t.color}1a, ${t.color}05)`,
        borderLeftColor: t.color,
        borderTopColor:    `${t.color}33`,
        borderRightColor:  `${t.color}33`,
        borderBottomColor: `${t.color}33`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className="inline-block text-[9px] font-extrabold uppercase tracking-[1.5px] px-1.5 py-0.5 rounded"
            style={{ background: `${t.color}26`, color: t.color }}
          >
            {t.label}
          </span>
          <p className="text-[11px] text-muted mt-1.5">{relativeWhen(log.created_at || log.date)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-text leading-none tabular-nums">
            {formatDuration(log.duration_min)}
          </p>
        </div>
      </div>
      {contextLine && (
        <p className="text-[11px] text-text/85 mt-3 leading-snug">
          {contextLine}
        </p>
      )}
    </div>
  )
}

// Compact row for older sessions — colored dot + type + when + duration.
function CompactRow({ log }) {
  const t = themeFor(log.session_type)
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: t.color, boxShadow: `0 0 6px ${t.color}66` }}
      />
      <span className="text-[12px] font-semibold text-text">{t.label}</span>
      <span className="text-[11px] text-muted flex-1 min-w-0 truncate">
        · {relativeWhen(log.created_at || log.date)}
      </span>
      <span className="text-[12px] font-extrabold text-text tabular-nums">
        {formatDuration(log.duration_min)}
      </span>
    </div>
  )
}

// Build a one-line context for the featured card: e.g. "Longest power
// session this week", "Back-to-back with yesterday's bouldering". Pure
// client-side, derived from the visible logs — no extra API.
function contextFor(featured, logs) {
  if (!featured || !logs || logs.length === 0) return null
  const t = featured.session_type
  // Same-type sessions in the last 7 days
  const dayMs = 24 * 60 * 60 * 1000
  const featuredAt = new Date(featured.created_at || featured.date).getTime()
  const sameType = logs.filter((l) => l.session_type === t && (featured.id !== l.id))
  const sameTypeThisWeek = sameType.filter((l) => {
    const at = new Date(l.created_at || l.date).getTime()
    return featuredAt - at <= 7 * dayMs && at <= featuredAt
  })
  if (sameTypeThisWeek.length > 0) {
    const longerSameType = sameTypeThisWeek.find((l) => (l.duration_min || 0) >= (featured.duration_min || 0))
    if (!longerSameType) {
      return `Your longest ${themeFor(t).label.toLowerCase()} session this week.`
    }
    return `${sameTypeThisWeek.length + 1} ${themeFor(t).label.toLowerCase()} session${sameTypeThisWeek.length === 0 ? '' : 's'} this week — keep stacking.`
  }
  // First of its type — celebrate it
  return `First ${themeFor(t).label.toLowerCase()} session in your recent history.`
}

export default function TrainRecentSessions({ refreshKey }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getTrainingLogs(8)
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
      <div className="flex flex-col items-center text-center py-6 px-4 space-y-2">
        <Activity size={18} className="text-muted/50" />
        <p className="text-xs text-muted italic">
          No sessions yet. Log your first one in the Train tab to see it here.
        </p>
      </div>
    )
  }

  // Most recent gets the Strava-style hero card; the rest sit as compact rows.
  const [featured, ...older] = logs
  return (
    <div className="space-y-2.5">
      <FeaturedSession log={featured} contextLine={contextFor(featured, logs)} />
      {older.length > 0 && (
        <div className="divide-y divide-outline/40 px-1">
          {older.map((log) => <CompactRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
