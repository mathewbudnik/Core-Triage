import { useState } from 'react'
import { Target, ChevronRight, ChevronDown } from 'lucide-react'

/**
 * Top Takeaway — the single most important finding, pulled to the top
 * of the report. Per the locked spec (feature-spec.md §4):
 *
 *   Top takeaway is mandatory. One per report. Picked by:
 *     rank = severity_weight × frequency × fall_proximity
 *
 * The ranking algorithm lives in rankFindings() below. The component
 * just renders the winner.
 *
 * Note on layout: the top finding is REMOVED from the "Other findings"
 * list (AnalysisReport.jsx slices it off), so the why/how/when content
 * is only reachable here. Hence the expandable "Show details" affordance
 * — without it, the climber sees a one-line cue with nowhere to go for
 * an explanation.
 *
 * Renders nothing when there are 0 or 1 findings — with one finding,
 * the takeaway is redundant with the only card below.
 */

const SEVERITY_WEIGHT = { critical: 3, important: 2, polish: 1 }

/**
 * Sort findings by descending importance. Returns a new array.
 *
 * Score components:
 *   • Severity (3 / 2 / 1)
 *   • log₂(instance count + 1) — repeated patterns are more important
 *   • +2 if any instance was within ±2s of a marked fall
 *
 * Ties broken by: more instances → earlier first timestamp.
 */
export function rankFindings(findings) {
  if (!findings) return []
  const scored = findings.map((f) => ({
    finding: f,
    score: (SEVERITY_WEIGHT[f.severity] ?? 0)
         + Math.log2((f.instanceCount ?? 1) + 1)
         + (f.isFallProximal ? 2 : 0),
  }))
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    const ac = a.finding.instanceCount ?? 0
    const bc = b.finding.instanceCount ?? 0
    if (ac !== bc) return bc - ac
    return (a.finding.timestamps?.[0] ?? 0) - (b.finding.timestamps?.[0] ?? 0)
  })
  return scored.map((s) => s.finding)
}

export default function TopTakeaway({ finding, thumbnail, onJumpTo, onFocusFinding }) {
  const [expanded, setExpanded] = useState(false)
  if (!finding) return null
  const firstTs = finding.timestamps?.[0] ?? 0
  const count = finding.instanceCount ?? 0
  const instancesStr = count === 1
    ? '1 instance'
    : `${count} instances`
  const hasDetails =
    !!finding.whyItMatters || !!finding.howToFix || !!finding.whenYouSeeIt

  return (
    <div className="ct-surface rounded-2xl border-clay/40 p-4 md:p-5 flex flex-col gap-3">
      {/* Label */}
      <div className="flex items-center gap-2">
        <Target size={14} className="text-clay-deep" />
        <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-clay-deep">
          Biggest takeaway
        </span>
      </div>

      {/* Thumbnail + content row */}
      <div className="flex items-start gap-3">
        {thumbnail && (
          <button
            type="button"
            onClick={() => onJumpTo(firstTs)}
            className="flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden bg-side border border-clay/30 hover:border-clay transition-colors"
            aria-label={`Jump to ${formatTime(firstTs)}`}
          >
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold font-serif text-ink">{finding.name}</h3>
          <p className="text-sm text-ink-soft mt-1 leading-snug">{finding.cue}</p>
          <p className="text-[11px] text-ink-soft ct-tnum mt-2">
            {instancesStr} · first at {formatTime(firstTs)}
            {finding.isFallProximal && ' · near your fall'}
          </p>
        </div>
      </div>

      {/* Expanded details — same content shape as FindingCard, just
          rendered inline since the top takeaway has nowhere else to
          link to. */}
      {expanded && hasDetails && (
        <div className="border-t border-ct-hairline pt-3 flex flex-col gap-3">
          {finding.whyItMatters && (
            <DetailSection label="Why it matters">{finding.whyItMatters}</DetailSection>
          )}
          {finding.howToFix && (
            <DetailSection label="How to fix">{finding.howToFix}</DetailSection>
          )}
          {finding.whenYouSeeIt && (
            <DetailSection label="When you see it">{finding.whenYouSeeIt}</DetailSection>
          )}
        </div>
      )}

      {/* Actions row: primary jump CTA + secondary details toggle. */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onJumpTo(firstTs)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-clay text-cream hover:brightness-110 transition"
        >
          Jump to first
          <ChevronRight size={12} />
        </button>
        {onFocusFinding && (
          <button
            type="button"
            onClick={() => onFocusFinding(finding)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-clay text-cream hover:brightness-110 transition"
          >
            Show me
          </button>
        )}
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-ct-rim text-ink-soft hover:text-ink hover:border-clay/60 transition-colors"
          >
            {expanded ? 'Hide details' : 'What this means'}
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
    </div>
  )
}

function DetailSection({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-ink-soft">
        {label}
      </span>
      <p className="text-xs text-ink-soft leading-relaxed">{children}</p>
    </div>
  )
}

function formatTime(ms) {
  const total = ms / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}
