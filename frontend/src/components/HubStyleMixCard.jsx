import { ChevronRight } from 'lucide-react'
import { STYLE_ORDER, STYLE_COLOR, getStyleLabel } from '../lib/styleColors'

/**
 * Hub card showing the user's style mix as a single stacked bar plus a
 * one-line summary. Hidden entirely when profile.confidence is 'low'
 * (caller is responsible for the conditional render).
 *
 * Props:
 *   profile: { pct, counts, total, dominant, weakest, confidence }
 *   onOpen:  () => void   — fires when the user taps the card to drill in
 */
export default function HubStyleMixCard({ profile, onOpen }) {
  if (!profile || profile.confidence === 'low') return null

  const summary = (() => {
    const dom = getStyleLabel(profile.dominant)
    const weak = getStyleLabel(profile.weakest)
    if (dom && weak && profile.dominant !== profile.weakest) {
      return <>Mostly <b>{dom}</b>. <b>{weak}</b> is your gap — your plan can emphasise it.</>
    }
    if (dom) return <>Mostly <b>{dom}</b>. Keep mixing styles to see your gap.</>
    return null
  })()

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-black/35 backdrop-blur-md
                 border-[0.5px] border-white/[0.10] p-4 mb-3
                 hover:bg-black/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]
                      text-[var(--tier-light)]">
          Style mix
        </p>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text/45 inline-flex items-center gap-0.5">
          Last 30 days
          <ChevronRight size={11} strokeWidth={2.4} className="opacity-70" />
        </span>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.04] mb-3">
        {STYLE_ORDER.map((s) => (
          <div
            key={s}
            className="h-full"
            style={{ width: `${profile.pct[s]}%`, background: STYLE_COLOR[s].c }}
            aria-label={`${getStyleLabel(s)} ${profile.pct[s]} percent`}
          />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1 mb-2">
        {STYLE_ORDER.map((s) => (
          <div key={s} className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: STYLE_COLOR[s].c }} />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-text/55 truncate">
              {getStyleLabel(s)}
            </span>
            <span className="text-[10px] font-extrabold tabular-nums ml-auto"
                  style={{ color: STYLE_COLOR[s].light }}>
              {profile.pct[s]}%
            </span>
          </div>
        ))}
      </div>

      {summary && (
        <p className="text-[11.5px] font-semibold text-text/60 leading-snug mt-2">
          {summary}
        </p>
      )}
    </button>
  )
}
