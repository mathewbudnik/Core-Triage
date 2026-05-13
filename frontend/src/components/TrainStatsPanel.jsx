import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, BarChart3, History } from 'lucide-react'
import { getTrainingStats } from '../api'
import TrainStatsHero from './TrainStatsHero'
import TrainStatTiles from './TrainStatTiles'
import TrainTrendChart from './TrainTrendChart'
import TrainLeaderboard from './TrainLeaderboard'
import TrainRecentSessions from './TrainRecentSessions'

/**
 * Composes the Train tab's new stats + leaderboard surface.
 * Mounts beneath the existing PlanView. Only renders for signed-in users
 * with an athlete profile + display_name set; callers gate accordingly.
 *
 * Props:
 *   - refreshKey (optional): bump to re-fetch stats (e.g. after the user
 *     logs a session inside the panel via PlanView).
 */
export default function TrainStatsPanel({ refreshKey = 0 }) {
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
    return (
      <div className="text-xs text-accent2 text-center py-6">{error}</div>
    )
  }
  if (!stats) return null

  const empty = stats.all_time?.sessions === 0
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-3.5"
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={14} className="text-accent" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-text">Your stats</h3>
      </div>

      <TrainStatsHero
        hours={stats.this_week.hours}
        percentile={stats.percentile_this_week}
        cohort={stats.cohort}
      />

      <TrainStatTiles
        streakDays={stats.current_streak_days}
        sessionsThisWeek={stats.this_week.sessions}
        allTimeHours={stats.all_time.hours}
      />

      <TrainTrendChart trend={stats.trend_8_weeks} />

      {/* Personal records — small inline summary, no separate header */}
      {!empty && stats.personal_records && (
        <div className="bg-panel border border-outline rounded-xl px-3 py-2.5 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-extrabold text-text tabular-nums">{stats.personal_records.longest_streak_days}d</p>
            <p className="text-[9px] uppercase tracking-wider text-muted/80 mt-0.5">Longest streak</p>
          </div>
          <div>
            <p className="text-sm font-extrabold text-text tabular-nums">{stats.personal_records.most_hours_in_week.toFixed(1)}h</p>
            <p className="text-[9px] uppercase tracking-wider text-muted/80 mt-0.5">Most hrs / wk</p>
          </div>
          <div>
            <p className="text-sm font-extrabold text-text tabular-nums">{stats.personal_records.most_sessions_in_week}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted/80 mt-0.5">Most sessions / wk</p>
          </div>
        </div>
      )}

      {/* Leaderboard section */}
      <div className="pt-2">
        <TrainLeaderboard cohort={stats.cohort} />
      </div>

      {/* Recent sessions */}
      <div className="pt-2 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <History size={11} className="text-accent" />
          Recent sessions
        </p>
        <TrainRecentSessions refreshKey={refreshKey} />
      </div>
    </motion.section>
  )
}
