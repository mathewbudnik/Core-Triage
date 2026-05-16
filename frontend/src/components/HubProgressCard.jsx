import { Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Replaces HubSocialStrip. Folds three jobs into one card:
 *  - leaderboard rank
 *  - hardest-send PR badges per discipline
 *  - top 3 grades from this month's boulder pyramid (or route if no boulder)
 *
 * Props:
 *   rank:           { rank, hours, display_name } | null
 *   hardestSends:   { boulder: string|null, route: string|null }
 *   pyramidPreview: [{ grade, s, f, p }]   — top 3 rows for the mini pyramid
 */
export default function HubProgressCard({ rank, hardestSends, pyramidPreview }) {
  const navigate = useNavigate()
  const hasAnyClimbs = !!(pyramidPreview && pyramidPreview.length)
  const hasRank      = !!(rank && rank.rank)
  const empty        = !hasRank && !hasAnyClimbs

  if (empty) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                      bg-panel2/50 border border-outline text-xs text-muted">
        <span>Log your first session to see how you stack up.</span>
        <button
          type="button"
          onClick={() => navigate('/train')}
          className="text-accent text-[11px] font-bold hover:underline"
        >
          Go to Train ›
        </button>
      </div>
    )
  }

  const prParts = []
  if (hardestSends?.boulder) prParts.push(`${hardestSends.boulder} boulder`)
  if (hardestSends?.route)   prParts.push(`${hardestSends.route} route`)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate('/progress')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/progress') }}
      className="px-4 py-3 rounded-xl bg-panel2/50 border border-outline cursor-pointer
                 hover:border-accent/30 transition-colors focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2 text-muted">
          {hasRank ? (
            <>
              <Trophy size={14} strokeWidth={2.2} className="text-accent3" />
              Ranked <strong className="text-text font-bold">#{rank.rank}</strong> this week
            </>
          ) : (
            <span>This month</span>
          )}
        </span>
        {prParts.length > 0 && (
          <span className="text-text font-bold">{prParts.join(' · ')}</span>
        )}
      </div>

      {hasAnyClimbs && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {pyramidPreview.map(({ grade, s }) => (
              <span key={grade} className="text-[11px] text-muted flex items-center gap-1.5">
                <span className="text-text font-bold tabular-nums">{grade}</span>
                <span className="inline-flex gap-[2px]">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={`inline-block w-1.5 h-2.5 rounded-[1px] ${
                        i < Math.min(s, 5) ? 'bg-accent' : 'bg-outline'
                      }`}
                    />
                  ))}
                </span>
              </span>
            ))}
          </div>
          <span className="text-accent text-[11px] font-bold">See progress ›</span>
        </div>
      )}
    </div>
  )
}
