import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Trophy, ArrowUp, Crown } from 'lucide-react'
import { getLeaderboard } from '../api'
import AvatarChip from './AvatarChip'

const WINDOWS = [
  { key: 'week',  label: 'This week'  },
  { key: 'month', label: 'This month' },
  { key: 'all',   label: 'All time'   },
]

function prettyCohort(cohort) {
  if (!cohort || cohort === 'global') return 'global'
  return cohort
}

const RANK_GLYPH = { 1: '🥇', 2: '🥈', 3: '🥉' }

// Distinct row themes — podium top-3 each get their own gold/silver/bronze
// treatment so the podium reads at a glance. "me" is teal regardless of rank.
const ROW_THEMES = {
  default: { bg: 'transparent', border: 'rgba(232,238,252,0.06)', rankColor: '#8a93a6', valueColor: '#e7eaf0' },
  p1:      { bg: 'linear-gradient(90deg, rgba(247,187,81,0.18), rgba(247,187,81,0.04))', border: 'rgba(247,187,81,0.40)', rankColor: '#f7bb51', valueColor: '#f7bb51' },
  p2:      { bg: 'linear-gradient(90deg, rgba(200,200,210,0.14), rgba(200,200,210,0.02))', border: 'rgba(200,200,210,0.32)', rankColor: '#c4cbd6', valueColor: '#c4cbd6' },
  p3:      { bg: 'linear-gradient(90deg, rgba(205,127,50,0.18), rgba(205,127,50,0.04))', border: 'rgba(205,127,50,0.38)', rankColor: '#cd7f32', valueColor: '#cd7f32' },
  me:      { bg: 'linear-gradient(90deg, rgba(125,211,192,0.16), rgba(125,211,192,0.04))', border: 'rgba(125,211,192,0.45)', rankColor: '#7dd3c0', valueColor: '#7dd3c0' },
}

function themeFor(rank, isMe) {
  if (isMe) return ROW_THEMES.me
  if (rank === 1) return ROW_THEMES.p1
  if (rank === 2) return ROW_THEMES.p2
  if (rank === 3) return ROW_THEMES.p3
  return ROW_THEMES.default
}

function Row({ entry, isMe, podium }) {
  const theme = themeFor(entry.rank, isMe)
  // Podium rows get extra height + bigger avatar; everything else stays compact.
  const padY = podium ? 'py-3' : 'py-2'
  const avatarSize = podium ? 36 : 28
  const isLeader = entry.rank === 1
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 ${padY}`}
      style={{ background: theme.bg, borderColor: theme.border }}
    >
      <span
        className={`text-center font-extrabold ${podium ? 'text-base w-8' : 'text-xs w-6'}`}
        style={{ color: theme.rankColor }}
      >
        {!isMe && RANK_GLYPH[entry.rank] ? RANK_GLYPH[entry.rank] : entry.rank}
      </span>
      <AvatarChip
        icon={entry.avatar_icon}
        color={entry.avatar_color}
        name={entry.display_name}
        anonymous={entry.is_private}
        size={avatarSize}
      />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <p className={`font-semibold truncate ${podium ? 'text-sm' : 'text-[13px]'} ${isMe ? 'text-accent' : 'text-text'}`}>
          {isMe ? `You · ${entry.display_name}` : entry.display_name}
        </p>
        {/* Crown sits inline next to the name when you're #1 — replaces the
            old "Leading the pack" subtext + the standalone throne callout
            so the moment exists in exactly one place. */}
        {isLeader && isMe && (
          <Crown
            size={13}
            strokeWidth={2.4}
            style={{ color: '#f7bb51', filter: 'drop-shadow(0 0 4px rgba(247,187,81,0.5))' }}
            aria-label="Leading"
          />
        )}
      </div>
      <span
        className={`font-extrabold tabular-nums ${podium ? 'text-base' : 'text-[13px]'}`}
        style={{ color: theme.valueColor }}
      >
        {entry.hours.toFixed(1)}h
      </span>
    </div>
  )
}

// "X.Xh to climb past NextPerson" — the fun-and-fair carrot. Only shown
// when the user has someone above them to chase. When the user is already
// #1, the inline crown on the row carries that moment — no duplicate
// callout here.
function NextRankCarrot({ data }) {
  if (!data?.me?.rank || data.me.rank === 1) return null
  const aboveRank = data.me.rank - 1
  const above = data.top.find((t) => t.rank === aboveRank)
  if (!above) return null
  const gap = above.hours - data.me.hours
  if (gap <= 0) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-3 py-2 px-3 rounded-lg bg-accent/8 border border-accent/25">
      <ArrowUp size={12} className="text-accent" strokeWidth={2.6} />
      <span className="text-[11px] text-text font-medium">
        <b className="text-accent">{gap.toFixed(1)}h</b> to climb past {above.display_name}
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
    // Pull more rows so the user's row has a chance to appear inline rather
    // than always dangling at the bottom.
    getLeaderboard({ window: windowKey, cohort, limit: 10 })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Could not load leaderboard.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [windowKey, cohort])

  const meInTopN = data?.me && data.top?.some((t) => t.user_id === data.me.user_id)
  // Show top 3 as podium; rest as compact rows.
  const podiumRows = (data?.top || []).slice(0, 3)
  const rest       = (data?.top || []).slice(3)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-accent3 flex items-center gap-1.5">
          <Trophy size={13} />
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
              className={`text-[10px] font-bold py-2.5 min-h-[40px] rounded-md transition-all ${
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

              {/* Podium */}
              {podiumRows.length > 0 && (
                <div className="space-y-2">
                  {podiumRows.map((entry) => (
                    <Row
                      key={`${entry.user_id}-${entry.rank}`}
                      entry={entry}
                      isMe={data.me && entry.user_id === data.me.user_id}
                      podium
                    />
                  ))}
                </div>
              )}

              {/* Rest of the top N */}
              {rest.length > 0 && (
                <div className="space-y-1 pt-1.5">
                  {rest.map((entry) => (
                    <Row
                      key={`${entry.user_id}-${entry.rank}`}
                      entry={entry}
                      isMe={data.me && entry.user_id === data.me.user_id}
                    />
                  ))}
                </div>
              )}

              {/* Your row pinned at the bottom if you didn't make the visible list */}
              {data.me && !meInTopN && data.me.rank != null && (
                <>
                  <p className="text-[9px] text-muted/60 uppercase tracking-wider text-center pt-2">···</p>
                  <Row entry={data.me} isMe />
                </>
              )}

              {/* Fun-and-fair carrot */}
              <NextRankCarrot data={data} />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
