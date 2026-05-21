import { STYLE_ORDER, STYLE_COLOR, getStyleLabel } from '../../lib/styleColors'

/**
 * Compact style-mix strip — stacked horizontal bar showing what styles
 * the climber has been doing, plus a setter-voice insight line.
 *
 * Folded into HubHero (was a standalone card pre-Phase-1). Hidden when
 * profile.confidence is 'low' (insufficient data) or profile is missing.
 *
 * Props:
 *   profile: { pct, counts, total, dominant, weakest, confidence }
 */
export default function HubStyleStrip({ profile }) {
  if (!profile || profile.confidence === 'low') return null

  const insight = (() => {
    const dom = getStyleLabel(profile.dominant)
    const weak = getStyleLabel(profile.weakest)
    if (dom && weak && profile.dominant !== profile.weakest) {
      return <>Mostly <b className="text-ct-cream">{dom}</b>. <b className="text-ct-terra-soft">{weak}</b> is the gap.</>
    }
    if (dom) return <>Mostly <b className="text-ct-cream">{dom}</b>. Keep mixing.</>
    return null
  })()

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="ct-meta">STYLE · LAST 30D</p>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
        {STYLE_ORDER.map((s) => (
          <div
            key={s}
            className="h-full"
            style={{ width: `${profile.pct[s]}%`, background: STYLE_COLOR[s].c }}
            aria-label={`${getStyleLabel(s)} ${profile.pct[s]} percent`}
          />
        ))}
      </div>
      {insight && (
        <p className="text-[11px] text-ct-cream-soft leading-snug mt-2">
          {insight}
        </p>
      )}
    </div>
  )
}
