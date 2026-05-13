/**
 * Personal stats hero card — top of TrainStatsPanel. Big gradient hours
 * number for this week + percentile bar + percentile blurb.
 *
 * Props:
 *   - hours: number (this week's training hours)
 *   - percentile: number 0-100 (where the user sits in their cohort)
 *   - cohort: string label ("intermediate", "advanced", etc.) or null
 */
export default function TrainStatsHero({ hours, percentile, cohort }) {
  const top = percentile != null ? 100 - percentile : null
  const cohortLabel = cohort ? `${cohort} climbers` : 'climbers'
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(125,211,192,0.3)] bg-[linear-gradient(135deg,rgba(125,211,192,0.18),rgba(247,187,81,0.08))] p-4 sm:p-5">
      {/* Decorative glow blob */}
      <div className="pointer-events-none absolute -top-5 -right-5 w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(125,211,192,0.15),transparent_70%)]" />

      <div className="relative">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(125,211,192,0.2)] text-accent border border-[rgba(125,211,192,0.3)] mb-2">
          This week
        </span>

        <div className="leading-none">
          <span
            className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, #7dd3c0, #e7eaf0, #f7bb51)' }}
          >
            {hours.toFixed(1)}
          </span>
          <span className="ml-1.5 text-sm text-muted font-medium">hrs</span>
        </div>

        {/* Percentile bar */}
        {percentile > 0 && (
          <>
            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#7dd3c0,#f7bb51)]"
                style={{ width: `${Math.max(2, percentile)}%` }}
              />
            </div>
            <p className="text-xs text-text/85 mt-2">
              Top <b className="text-accent3 font-bold">{top}%</b> of {cohortLabel} · {percentile}th percentile
            </p>
          </>
        )}
        {(!percentile || percentile === 0) && (
          <p className="text-xs text-muted mt-3">
            Log a few sessions to see where you rank.
          </p>
        )}
      </div>
    </div>
  )
}
