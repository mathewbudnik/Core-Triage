import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Trophy } from 'lucide-react'
import { getLeaderboard } from '../api'

const WINDOWS = [
  { key: 'week',  label: 'This week'  },
  { key: 'month', label: 'This month' },
  { key: 'all',   label: 'All time'   },
]

// Pretty cohort label for the section header. Defaults to "global" when null.
function prettyCohort(cohort) {
  if (!cohort || cohort === 'global') return 'global'
  return cohort
}

// 2-letter avatar initials from a display name. "ProjectRagger" → "PR".
function avatarInitials(name) {
  if (!name) return '??'
  const tokens = name.replace(/[_-]/g, ' ').split(/\s+/).filter(Boolean)
  if (tokens.length === 1) {
    const t = tokens[0]
    // Camel-case split: "ProjectRagger" → "PR"
    const upper = t.match(/[A-Z]/g)
    if (upper && upper.length >= 2) return upper.slice(0, 2).join('')
    return t.slice(0, 2).toUpperCase()
  }
  return (tokens[0][0] + tokens[1][0]).toUpperCase()
}

// Podium themes per rank (1=gold, 2=silver, 3=bronze). Everything else is
// the default style.
function podiumClass(rank, isMe) {
  if (isMe) return 'me'
  if (rank === 1) return 'p1'
  if (rank === 2) return 'p2'
  if (rank === 3) return 'p3'
  return ''
}

// Per-rank inline styles — Tailwind arbitrary-value strings get
// awkward for the gradient + border + text combos so we hand-roll them.
const ROW_THEMES = {
  '':   {},
  p1:   { background: 'linear-gradient(90deg, rgba(247,187,81,0.16), rgba(247,187,81,0.04))', borderColor: 'rgba(247,187,81,0.35)' },
  p2:   { background: 'linear-gradient(90deg, rgba(200,200,210,0.10), rgba(200,200,210,0.02))', borderColor: 'rgba(200,200,210,0.25)' },
  p3:   { background: 'linear-gradient(90deg, rgba(205,127,50,0.16), rgba(205,127,50,0.04))', borderColor: 'rgba(205,127,50,0.35)' },
  me:   { background: 'linear-gradient(90deg, rgba(125,211,192,0.14), rgba(125,211,192,0.04))', borderColor: 'rgba(125,211,192,0.4)' },
}
const RANK_THEMES = {
  '':   { color: '#8a93a6' },
  p1:   { color: '#f7bb51' },
  p2:   { color: '#c4cbd6' },
  p3:   { color: '#cd7f32' },
  me:   { color: '#7dd3c0' },
}
const AVATAR_THEMES = {
  '':   { background: 'rgba(125,211,192,0.18)', borderColor: 'rgba(125,211,192,0.35)', color: '#7dd3c0' },
  p1:   { background: 'rgba(247,187,81,0.2)',   borderColor: 'rgba(247,187,81,0.4)',   color: '#f7bb51' },
  p2:   { background: 'rgba(200,200,210,0.12)', borderColor: 'rgba(200,200,210,0.3)',  color: '#c4cbd6' },
  p3:   { background: 'rgba(205,127,50,0.18)',  borderColor: 'rgba(205,127,50,0.35)',  color: '#cd7f32' },
  me:   { background: 'rgba(125,211,192,0.18)', borderColor: 'rgba(125,211,192,0.35)', color: '#7dd3c0' },
}

const RANK_GLYPH = { 1: '🥇', 2: '🥈', 3: '🥉' }

function Row({ entry, isMe }) {
  const theme = podiumClass(entry.rank, isMe)
  const showGlyph = !isMe && (entry.rank === 1 || entry.rank === 2 || entry.rank === 3)
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2"
      style={ROW_THEMES[theme]}
    >
      <span
        className="w-6 text-center font-extrabold text-[12px]"
        style={RANK_THEMES[theme]}
      >
        {showGlyph ? RANK_GLYPH[entry.rank] : entry.rank}
      </span>
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border flex-shrink-0"
        style={AVATAR_THEMES[theme]}
      >
        {avatarInitials(entry.display_name)}
      </span>
      <span className={`flex-1 text-[12px] font-semibold truncate ${isMe ? 'text-accent' : 'text-text'}`}>
        {isMe ? `You · ${entry.display_name}` : entry.display_name}
      </span>
      <span
        className="text-[12px] font-extrabold tabular-nums"
        style={{ color: isMe ? '#7dd3c0' : '#e7eaf0' }}
      >
        {entry.hours.toFixed(1)}h
      </span>
    </div>
  )
}

export default function TrainLeaderboard({ cohort: defaultCohort }) {
  const [windowKey, setWindowKey] = useState('week')
  const [globalView, setGlobalView] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cohort = globalView ? 'global' : (defaultCohort || 'global')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getLeaderboard({ window: windowKey, cohort, limit: 5 })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Could not load leaderboard.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [windowKey, cohort])

  const meInTopN = data?.me && data.top?.some((t) => t.user_id === data.me.user_id)

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <Trophy size={11} className="text-accent3" />
          Leaderboard · {prettyCohort(cohort)}
        </p>
        {defaultCohort && defaultCohort !== 'global' && (
          <button
            type="button"
            onClick={() => setGlobalView((v) => !v)}
            className="text-[10px] text-muted hover:text-accent transition-colors underline-offset-2 hover:underline"
          >
            {globalView ? `Show ${defaultCohort}` : 'Show global'}
          </button>
        )}
      </div>

      {/* Window tabs */}
      <div className="grid grid-cols-3 gap-1 bg-panel border border-outline rounded-lg p-0.5">
        {WINDOWS.map((w) => {
          const active = w.key === windowKey
          return (
            <button
              key={w.key}
              type="button"
              onClick={() => setWindowKey(w.key)}
              className={`text-[10px] font-bold py-1.5 rounded-md transition-all ${
                active
                  ? 'bg-[rgba(125,211,192,0.12)] text-accent border border-[rgba(125,211,192,0.3)]'
                  : 'text-muted hover:text-text'
              }`}
            >
              {w.label}
            </button>
          )
        })}
      </div>

      {/* Rows */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${windowKey}-${cohort}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="space-y-1.5"
        >
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={16} className="animate-spin text-accent" />
            </div>
          )}
          {error && !loading && (
            <p className="text-xs text-accent2 text-center py-3">{error}</p>
          )}
          {!loading && !error && data && (
            <>
              {data.top.length === 0 && (
                <p className="text-xs text-muted text-center py-3">
                  No one's logged sessions in this window yet. Be the first.
                </p>
              )}
              {data.top.map((entry) => (
                <Row
                  key={`${entry.user_id}-${entry.rank}`}
                  entry={entry}
                  isMe={data.me && entry.user_id === data.me.user_id}
                />
              ))}
              {data.me && !meInTopN && data.me.rank != null && (
                <Row entry={data.me} isMe />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
