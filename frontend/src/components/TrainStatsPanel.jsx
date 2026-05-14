import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Flame } from 'lucide-react'
import { getTrainingStats } from '../api'
import TrainStatsHero from './TrainStatsHero'
import TrainTrendChart from './TrainTrendChart'
import TrainLeaderboard from './TrainLeaderboard'
import TrainRecentSessions from './TrainRecentSessions'

/**
 * Strava-flavored Progress surface.
 *
 * Hierarchy (top → bottom):
 *   1. Greeting + streak pill        (compact identity row)
 *   2. Week summary hero             (single big number, vs-last-week delta, percentile)
 *   3. Leaderboard                   (THE centerpiece — podium top-3, your row, next-rank carrot)
 *   4. Recent activity               (one featured session card + compact rows)
 *   5. 8-week trend                  (small, lower priority)
 *   6. Personal records strip        (small, footer-ish)
 *
 * Visual restraint: only the hero + leaderboard get the tinted/glow treatment.
 * Everything else uses plain panel backgrounds so the eye knows where to land.
 *
 * Props:
 *   - refreshKey (optional): bump to re-fetch stats after a session is logged.
 *   - user (optional): used to greet the user by display_name when available.
 */
export default function TrainStatsPanel({ refreshKey = 0, user = null }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTrainingStats()
      setStats(data)
    } catch (err) {
      setError(err.message || 'Could not load your stats.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
    )
  }
  if (error) {
    return <div className="text-xs text-accent2 text-center py-6">{error}</div>
  }
  if (!stats) return null

  const empty = stats.all_time?.sessions === 0
  const streakDays = stats.current_streak_days || 0
  const firstName = (user?.display_name || '').split(/[\s_-]/)[0] || ''

  // Last week's hours, derived from the 8-week trend (oldest-first). The
  // current week is the last entry; the previous is the one before.
  const lastWeekHours = (() => {
    const t = stats.trend_8_weeks
    if (!Array.isArray(t) || t.length < 2) return 0
    return t[t.length - 2]?.hours || 0
  })()

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-5"
    >
      {/* ── Greeting + streak pill ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="text-2xl sm:text-[28px] font-extrabold leading-[1.05] tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, #7dd3c0, #e7eaf0, #f7bb51)' }}
          >
            {firstName ? `Nice work, ${firstName}` : 'Your progress'}
          </h2>
          <p className="text-xs text-muted mt-1.5">
            {empty
              ? 'Log your first session in Train to start climbing the leaderboard'
              : stats.this_week.sessions > 0
                ? `${stats.this_week.sessions} session${stats.this_week.sessions === 1 ? '' : 's'} this week · keep it rolling`
                : 'No sessions yet this week — log one to defend your streak'}
          </p>
        </div>
        {streakDays >= 2 && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap px-2.5 py-1.5 rounded-full"
            style={{
              border: '1px solid rgba(247,187,81,0.4)',
              background: 'rgba(247,187,81,0.12)',
              color: '#f7bb51',
            }}
          >
            <Flame size={12} strokeWidth={2.4} />
            {streakDays} day{streakDays === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* ── Week summary hero ──────────────────────────────────────── */}
      <TrainStatsHero
        hours={stats.this_week.hours}
        lastWeekHours={lastWeekHours}
        percentile={stats.percentile_this_week}
        cohort={stats.cohort}
        sessions={stats.this_week.sessions}
      />

      {/* ── Leaderboard (centerpiece) ──────────────────────────────── */}
      <TrainLeaderboard cohort={stats.cohort} />

      {/* ── Recent activity feed ───────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted mb-2.5">
          Recent activity
        </p>
        <TrainRecentSessions refreshKey={refreshKey} />
      </div>

      {/* ── Bottom row: trend + PRs (compact, lower priority) ──────── */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
        <div className="sm:col-span-3">
          <TrainTrendChart trend={stats.trend_8_weeks} />
        </div>
        <div className="sm:col-span-2">
          {!empty && stats.personal_records ? (
            <div className="h-full rounded-xl border border-outline bg-panel p-3 grid grid-cols-3 gap-2 text-center content-center">
              <div>
                <p className="text-sm font-extrabold text-text tabular-nums">{stats.personal_records.longest_streak_days}d</p>
                <p className="text-[10px] uppercase tracking-wider text-muted/80 mt-0.5">Streak</p>
              </div>
              <div>
                <p className="text-sm font-extrabold text-text tabular-nums">{stats.personal_records.most_hours_in_week.toFixed(1)}h</p>
                <p className="text-[10px] uppercase tracking-wider text-muted/80 mt-0.5">Hrs / wk</p>
              </div>
              <div>
                <p className="text-sm font-extrabold text-text tabular-nums">{stats.personal_records.most_sessions_in_week}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted/80 mt-0.5">Sess / wk</p>
              </div>
            </div>
          ) : (
            <div className="h-full rounded-xl border border-outline bg-panel p-3 flex items-center justify-center">
              <p className="text-[10px] text-muted/60 text-center italic">PRs appear once you've logged sessions.</p>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}
