import { scoreClip } from '../lib/movementScore'
import { bodyRegionLabel } from '../lib/compoundFindings'

/**
 * Directional movement read for the analyzer report. Rolls the findings up into
 * an overall + per-region score (see lib/movementScore). It is explicitly a
 * directional signal from heuristic checks, never a graded/learned score —
 * the label says so. Renders nothing when there are no flags to score.
 */
const REGION_ORDER = ['shoulders-arms', 'hips-core', 'knees-feet', 'head-gaze']

function barColor(v) {
  if (v >= 80) return 'var(--ct-sage-deep, #5f7a4e)'
  if (v >= 60) return 'var(--ct-ochre, #d7ac5b)'
  return '#b85c44' // power — low region
}

export default function MovementScoreCard({ findings }) {
  const flags = (findings ?? []).filter((f) => f.kind !== 'win')
  if (flags.length === 0) return null

  const { overall, perRegion } = scoreClip(findings)
  const regions = REGION_ORDER.filter((r) => r in perRegion)
  const ringCirc = 2 * Math.PI * 26
  const ringOffset = ringCirc * (1 - overall / 100)

  return (
    <div className="ct-surface rounded-2xl p-4 md:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-clay-deep">Movement read</p>
      <div className="flex items-center justify-between gap-3 mt-1">
        <div className="font-serif font-semibold text-[44px] leading-none text-ink">
          {overall}<span className="text-[15px] font-sans font-semibold text-ink-muted"> / 100</span>
        </div>
        <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden="true">
          <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(42,39,34,0.12)" strokeWidth="6" />
          <circle cx="31" cy="31" r="26" fill="none" stroke="var(--ct-ochre, #d7ac5b)" strokeWidth="6"
            strokeLinecap="round" strokeDasharray={ringCirc} strokeDashoffset={ringOffset}
            transform="rotate(-90 31 31)" />
        </svg>
      </div>

      <div className="flex flex-col gap-2.5 mt-3">
        {regions.map((region) => {
          const v = perRegion[region]
          return (
            <div key={region} data-testid="region-row" className="grid grid-cols-[88px_1fr_30px] items-center gap-2.5">
              <span className="text-[11.5px] font-semibold text-ink-soft">{bodyRegionLabel(region)}</span>
              <span className="h-[6px] rounded-full bg-ink/[0.10] overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${v}%`, background: barColor(v) }} />
              </span>
              <span className="text-[11px] font-bold text-ink text-right ct-tnum">{v}</span>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-ink-muted mt-3 pt-3 border-t border-ct-hairline">
        Directional · rolled up from the movement checks, not a graded score.
      </p>
    </div>
  )
}
