import { Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Bottom strip showing the user's leaderboard rank with a drill-in link.
 * Empty state (no rank yet) is friendlier — invites them to log a session.
 *
 * Props:
 *   rank: { rank, hours, display_name } | null
 */
export default function HubSocialStrip({ rank }) {
  const navigate = useNavigate()

  if (!rank || !rank.rank) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                      bg-panel2/50 border border-outline text-xs text-muted">
        <span>Log your first session to see how you stack up.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                    bg-panel2/50 border border-outline text-xs text-muted">
      <span className="flex items-center gap-2">
        <Trophy size={14} strokeWidth={2.2} className="text-accent3" />
        Ranked <strong className="text-text font-bold">#{rank.rank}</strong> this week
      </span>
      <button
        type="button"
        onClick={() => navigate('/train')}
        className="text-accent text-[11px] font-bold hover:underline"
      >
        See leaderboard ›
      </button>
    </div>
  )
}
