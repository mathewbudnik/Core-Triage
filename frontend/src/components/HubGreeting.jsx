import { Flame } from 'lucide-react'
import { rehabProgress } from '../lib/rehabHeuristic'

// Renders the gradient greeting + the streak pill. The streak pill is hidden
// for streaks below 2 days (a streak of 1 doesn't deserve the spotlight).

function formatToday() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long' })
}

function subtitleFor(data) {
  const rp = rehabProgress(data.lastTriage?.created_at)
  if (rp && data.lastTriage) {
    return `${formatToday()} · Day ${rp.dayInPhase} of ${data.lastTriage.injury_area.toLowerCase()} rehab`
  }
  if (data.todaySession && !data.todayLogged) {
    return `${formatToday()} · Today's session is ready`
  }
  if (data.todayLogged) {
    return `${formatToday()} · Logged today — nice work`
  }
  return formatToday()
}

export default function HubGreeting({ user, data }) {
  const name = user?.display_name || user?.email?.split('@')[0] || 'climber'
  const streak = data?.stats?.current_streak_days || 0
  const showStreak = streak >= 2

  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight
                       bg-gradient-to-r from-accent via-text to-accent2
                       bg-clip-text text-transparent">
          Welcome back,<br />{name}
        </h1>
        <p className="text-xs text-muted mt-1">{subtitleFor(data)}</p>
      </div>
      {showStreak && (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold
                         px-3 py-1.5 rounded-full whitespace-nowrap
                         border border-accent3/40 bg-accent3/10 text-accent3 shrink-0">
          <Flame size={12} strokeWidth={2.4} />
          {streak} days
        </span>
      )}
    </div>
  )
}
