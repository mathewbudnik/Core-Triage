import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Strava-flavored week summary. The single hero stat (this week's hours)
 * is paired with a week-over-week delta and the user's cohort percentile.
 *
 * Color roles (kept disciplined to avoid the teal-everywhere problem):
 *   - Teal       → identity / "you" (just the gradient number's left edge)
 *   - Gold/amber → achievement (positive delta, percentile callout)
 *   - Coral      → regression (negative delta only)
 *   - Neutral    → flat delta and the surface itself
 */
export default function TrainStatsHero({ hours, lastWeekHours = 0, percentile, cohort, sessions = 0 }) {
  const top = percentile != null ? 100 - percentile : null
  const cohortLabel = cohort ? `${cohort} climbers` : 'climbers'
  const delta = hours - lastWeekHours
  const deltaAbs = Math.abs(delta)
  const deltaSign = deltaAbs < 0.05 ? 'flat' : (delta > 0 ? 'up' : 'down')
  const DeltaIcon = deltaSign === 'up' ? TrendingUp : deltaSign === 'down' ? TrendingDown : Minus
  // Direction-driven color: gold for positive (an achievement), coral for
  // negative (a regression), gray for flat. Teal is reserved for "you"
  // identity treatment elsewhere — keeping it out here is what makes the
  // page feel less monochromatic.
  const deltaColor =
    deltaSign === 'up'   ? '#f7bb51' :
    deltaSign === 'down' ? '#f47272' :
                           '#8a93a6'
  const deltaLabel =
    deltaSign === 'flat' ? 'Same as last week' :
    deltaSign === 'up'   ? `+${deltaAbs.toFixed(1)}h vs last week` :
                           `−${deltaAbs.toFixed(1)}h vs last week`

  return (
    <div className="relative overflow-hidden rounded-2xl border border-outline bg-panel p-5 sm:p-6">
      {/* Subtle warm glow in the corner — gold-leaning instead of teal so
          the surface reads as "achievement" not "more teal". */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full blur-[44px]"
        style={{ background: 'rgba(247,187,81,0.10)' }}
      />

      <div className="relative">
        <span className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-muted/80">
          This week
        </span>

        <div className="leading-none mt-2 flex items-baseline gap-2">
          <span
            className="text-5xl sm:text-6xl font-extrabold bg-clip-text text-transparent tracking-tight"
            style={{
              backgroundImage: 'linear-gradient(90deg, #7dd3c0, #e7eaf0, #f7bb51)',
            }}
          >
            {hours.toFixed(1)}
          </span>
          <span className="text-base text-muted font-medium">hrs</span>
          <span className="text-xs text-muted/70 ml-2">
            · {sessions} session{sessions === 1 ? '' : 's'}
          </span>
        </div>

        {/* Delta + percentile row */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: `${deltaColor}1a`,
              color: deltaColor,
              border: `1px solid ${deltaColor}55`,
            }}
          >
            <DeltaIcon size={12} strokeWidth={2.6} />
            {deltaLabel}
          </span>
          {percentile > 0 && (
            <span className="text-xs text-text/85">
              Top <b className="text-accent3 font-bold">{top}%</b> of {cohortLabel}
            </span>
          )}
          {(!percentile || percentile === 0) && (
            <span className="text-xs text-muted">Log a few sessions to see where you rank.</span>
          )}
        </div>
      </div>
    </div>
  )
}
