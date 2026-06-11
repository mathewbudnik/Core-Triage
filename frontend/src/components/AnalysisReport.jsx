import { useState } from 'react'
import { ChevronRight, Activity, AlertTriangle, Circle, ChevronDown, Sparkles, CheckCircle2, Layers, ThumbsDown } from 'lucide-react'
import TopTakeaway, { rankFindings } from './TopTakeaway'
import { findCompoundMoments, bodyRegionLabel } from '../lib/compoundFindings'
import {
  loadFeedback, markFindingWrong, unmarkFindingWrong, isFindingWrong,
} from '../lib/findingFeedback'

/**
 * Analysis report — renders below the video in READY state.
 *
 * Information architecture (digestibility-first):
 *   • Top takeaway: the single highest-ranked FLAG (mistake to correct),
 *     pulled to the top with a thumbnail and jump CTA. Only appears
 *     when there are at least 2 flags — with one flag, the takeaway
 *     just duplicates the only card below.
 *   • Other findings: collapsed flag summaries — name, cue, thumbnail,
 *     instance count. The user can scan the list quickly. Tap any
 *     card to expand the why-it-matters / how-to-fix / when-you-see-it
 *     paragraphs.
 *   • What worked: compact positive-feedback section for `kind: 'win'`
 *     findings. Single-line per win, no expand, mint accent. Surfaces
 *     the technique moments the climber should reinforce.
 *
 * Per the locked report spec (docs/movement-analyzer/feature-spec.md §4):
 *   • Single card per finding, all timestamps listed inside
 *   • Severity color codes (lucide Circle, no emojis)
 *   • Tap a timestamp → video jumps to that frame
 *   • Fall-proximal findings show a "Near fall" pill
 */

// Threshold at which the per-card "you've marked this wrong before"
// hint surfaces. Set low so a couple of bad reports trigger it; this
// is meant to give the climber confidence that we noticed.
const MISFIRE_HINT_THRESHOLD = 3

const SEVERITY_VISUALS = {
  critical: {
    label: 'Critical',
    dotClass:    'text-red-500',
    border:      'border-red-500/40',
    bg:          'bg-red-500/10',
    badgeText:   'text-red-500',
  },
  important: {
    label: 'Important',
    dotClass:    'text-clay-deep',
    border:      'border-clay/40',
    bg:          'bg-clay/10',
    badgeText:   'text-clay-deep',
  },
  polish: {
    label: 'Polish',
    dotClass:    'text-ink-soft',
    border:      'border-ct-rim',
    bg:          'bg-side',
    badgeText:   'text-ink-soft',
  },
}

/**
 * @param {Object} props
 * @param {Array} props.findings — output from runRules() (flags + wins)
 * @param {Object<string, string>} props.thumbnails — { [ruleId]: dataURL }
 * @param {(timestampMs: number) => void} props.onJumpTo
 */
export default function AnalysisReport({ findings, thumbnails, onJumpTo }) {
  const flags = (findings ?? []).filter((f) => f.kind !== 'win')
  const wins  = (findings ?? []).filter((f) => f.kind === 'win')
  // Per-finding feedback state — loaded from localStorage so it
  // persists across page reloads. The thumbs-down on each card writes
  // into this record keyed by (ruleId, first instance timestamp).
  const [feedback, setFeedback] = useState(() => loadFeedback())
  const handleMarkWrong = (ruleId, ts) => {
    setFeedback((cur) => markFindingWrong(cur, ruleId, ts))
  }
  const handleUnmarkWrong = (ruleId, ts) => {
    setFeedback((cur) => unmarkFindingWrong(cur, ruleId, ts))
  }

  // Empty: no flags AND no wins. Surface the existing neutral state.
  if (flags.length === 0 && wins.length === 0) {
    return (
      <div className="ct-surface rounded-2xl p-5 flex items-start gap-3">
        <Activity size={16} className="text-clay-deep flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-ink">Nothing to call out on this clip.</p>
          <p className="text-xs text-ink-soft mt-1 leading-snug">
            The analyzer didn't find any sustained technique flags or notable wins.
            Try a clip with a longer attempt or a different angle — early detectors
            only catch a few specific patterns.
          </p>
        </div>
      </div>
    )
  }

  const rankedFlags = rankFindings(flags)
  const topFlag = rankedFlags[0]
  const restFlags = rankedFlags.length > 1 ? rankedFlags.slice(1) : []
  const showTakeaway = rankedFlags.length >= 2
  // Compound moments: 2+ flag rules firing on the same move. These are
  // the cascade signals coaches care about most — a single move that
  // exposes several technique issues at once is higher-leverage to
  // study than the same issues spread across the clip.
  const compoundMoments = findCompoundMoments(flags)

  return (
    <div className="flex flex-col gap-4">
      {showTakeaway && (
        <TopTakeaway
          finding={topFlag}
          thumbnail={thumbnails?.[topFlag.ruleId]}
          onJumpTo={onJumpTo}
        />
      )}

      {compoundMoments.length > 0 && (
        <CompoundMoments moments={compoundMoments} onJumpTo={onJumpTo} />
      )}

      {/* Flags list. Hidden entirely when there are zero flags — the
          WhatWorked section below carries the report on its own. */}
      {rankedFlags.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-semibold text-ink">
              {showTakeaway ? 'Other findings' : 'Findings'}{' '}
              <span className="text-ink-muted font-normal">
                ({showTakeaway ? restFlags.length : rankedFlags.length})
              </span>
            </h3>
            <p className="text-[10px] text-ink-muted">
              Tap a card for details
            </p>
          </div>
          <RegionSummary flags={rankedFlags} />
          <ul className="flex flex-col gap-2">
            {(showTakeaway ? restFlags : rankedFlags).map((finding) => (
              <FindingCard
                key={finding.ruleId}
                finding={finding}
                thumbnail={thumbnails?.[finding.ruleId]}
                onJumpTo={onJumpTo}
                feedback={feedback}
                onMarkWrong={handleMarkWrong}
                onUnmarkWrong={handleUnmarkWrong}
              />
            ))}
          </ul>
        </div>
      )}

      {wins.length > 0 && (
        <WhatWorked wins={wins} onJumpTo={onJumpTo} />
      )}
    </div>
  )
}

/**
 * RegionSummary — at-a-glance distribution of flag findings across
 * the four body regions. Lets the climber see "where the work is"
 * before diving into individual cards. Hidden when only one body
 * region is represented (the count would be redundant).
 *
 * Each chip aggregates instance counts (not finding counts) so that
 * a rule that fired 5 times reads as more weight than a rule that
 * fired once. Sorted by descending count.
 */
const REGION_TINTS = {
  'shoulders-arms': 'border-ct-rim text-ink-soft bg-side',
  'hips-core':       'border-clay/40 text-clay-deep bg-clay/10',
  'knees-feet':      'border-ct-rim text-ink-soft bg-side',
  'head-gaze':       'border-ct-rim text-ink-soft bg-side',
}

function RegionSummary({ flags }) {
  // Aggregate instance counts per body region.
  const totals = new Map()
  for (const f of flags) {
    const region = f.bodyRegion || 'other'
    const count = f.instanceCount ?? f.timestamps?.length ?? 0
    totals.set(region, (totals.get(region) ?? 0) + count)
  }
  if (totals.size < 2) return null   // single-region summary is redundant

  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1])
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
        By region
      </span>
      {entries.map(([region, count]) => (
        <span
          key={region}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${REGION_TINTS[region] || REGION_TINTS['shoulders-arms']}`}
        >
          <span className="ct-tnum">{count}</span>
          <span>{bodyRegionLabel(region)}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * "Moments to study" — compound-finding surface.
 *
 * Each entry corresponds to a single move where 2+ flag rules fired
 * within a 1-second window. This is the highest-leverage coaching
 * pattern: a cascade of issues all happening at once usually has a
 * single root cause that fixing addresses multiple findings.
 *
 * Compact rendering: one row per moment, severity-tinted border,
 * shows the contributing rule names + jump-to-frame button. No
 * expand affordance — the individual rule cards below carry the
 * full coaching content.
 */
const SEVERITY_BORDER = {
  critical:  'border-red-500/40 bg-red-500/10',
  important: 'border-clay/40 bg-clay/10',
  polish:    'border-ct-rim bg-side',
}

const SEVERITY_DOT = {
  critical:  'text-red-500',
  important: 'text-clay-deep',
  polish:    'text-ink-soft',
}

function CompoundMoments({ moments, onJumpTo }) {
  return (
    <div className="ct-surface rounded-2xl border-clay/40 bg-clay/10 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Layers size={14} className="text-clay-deep" />
        <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-clay-deep">
          Moments to study
        </span>
        <span className="text-[10px] text-ink-muted ml-1">
          ({moments.length})
        </span>
      </div>
      <p className="text-[11px] text-ink-soft leading-snug -mt-1">
        Single moves where multiple issues fired together — usually one fix addresses them all.
      </p>
      <ul className="flex flex-col gap-2">
        {moments.map((moment, i) => (
          <CompoundMomentRow key={i} moment={moment} onJumpTo={onJumpTo} />
        ))}
      </ul>
    </div>
  )
}

function CompoundMomentRow({ moment, onJumpTo }) {
  const border = SEVERITY_BORDER[moment.severity] || SEVERITY_BORDER.polish
  const regions = moment.bodyRegions.length === 1
    ? bodyRegionLabel(moment.bodyRegions[0])
    : `${moment.bodyRegions.length} regions`
  return (
    <li className={`rounded-lg border ${border} p-3 flex items-start gap-3`}>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            {regions}
          </span>
          <span className="text-[10px] text-ink-muted">·</span>
          <span className="text-[10px] text-ink-soft ct-tnum">
            {formatTime(moment.ts)}
          </span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {moment.rules.map((r) => (
            <li key={r.ruleId} className="flex items-baseline gap-1.5 text-sm">
              <Circle
                size={7}
                strokeWidth={0}
                fill="currentColor"
                className={`flex-shrink-0 ${SEVERITY_DOT[r.severity] || SEVERITY_DOT.polish}`}
              />
              <span className="text-ink-soft leading-snug">{r.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => onJumpTo(moment.ts)}
        className="flex-shrink-0 flex items-center gap-1 self-start px-2.5 py-1 rounded-md text-[11px] font-bold bg-clay-deep text-cream hover:brightness-110 transition"
      >
        Jump
        <ChevronRight size={11} />
      </button>
    </li>
  )
}

/**
 * "What worked" — positive-reinforcement section. Compact by design:
 * single line per win, no expandable detail, mint accent. The cue text
 * carries the whole message; we don't need why/how/when paragraphs for
 * "you did the right thing — keep doing it."
 *
 * First timestamp is tap-jumpable, like flags. Instance count shown
 * inline so the climber can tell "I held that position once" from
 * "I held that position six times across the attempt."
 */
function WhatWorked({ wins, onJumpTo }) {
  return (
    <div className="ct-surface rounded-2xl border-sage/40 bg-sage/10 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-sage-deep" />
        <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-sage-deep">
          What worked
        </span>
        <span className="text-[10px] text-ink-muted ml-1">
          ({wins.length})
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {wins.map((win) => (
          <WinRow key={win.ruleId} win={win} onJumpTo={onJumpTo} />
        ))}
      </ul>
    </div>
  )
}

function WinRow({ win, onJumpTo }) {
  const firstTs = win.timestamps?.[0]
  const count = win.instanceCount ?? 0
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <CheckCircle2 size={14} className="text-sage-deep flex-shrink-0 mt-0.5" strokeWidth={2.2} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-sm text-ink leading-snug">
          <span className="font-semibold">{win.name}</span>
          <span className="text-ink-soft"> — {win.cue}</span>
        </p>
        {firstTs != null && (
          <button
            type="button"
            onClick={() => onJumpTo(firstTs)}
            className="self-start flex items-center gap-1 text-[10px] font-semibold text-sage-deep hover:text-clay-deep transition-colors ct-tnum"
          >
            {count > 1 ? `${count}× · first at ` : ''}{formatTime(firstTs)}
            <ChevronRight size={10} />
          </button>
        )}
      </div>
    </li>
  )
}

function FindingCard({ finding, thumbnail, onJumpTo, feedback, onMarkWrong, onUnmarkWrong }) {
  const [expanded, setExpanded] = useState(false)
  const visuals = SEVERITY_VISUALS[finding.severity] || SEVERITY_VISUALS.polish

  const toggle = () => setExpanded((e) => !e)

  // Per-card feedback state — keyed by (ruleId, first-instance ts).
  // The thumbs-down marks this rule's first instance on this clip as
  // wrong; persisted to localStorage so it survives a page reload.
  const firstTs = finding.timestamps?.[0]
  const markedWrong = firstTs != null && isFindingWrong(feedback, finding.ruleId, firstTs)
  // Aggregated misfire history: if the same rule has been marked wrong
  // ≥ MISFIRE_HINT_THRESHOLD times across all reports, surface a hint
  // so the climber treats this rule's verdict with extra skepticism.
  const totalWrong = feedback?.[finding.ruleId]?.totalWrong ?? 0
  const showMisfireHint = totalWrong >= MISFIRE_HINT_THRESHOLD && !markedWrong

  return (
    <li className={`rounded-xl border ${visuals.border} ${visuals.bg} overflow-hidden`}>
      {/* Always-visible summary row */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="w-full text-left p-3 flex items-start gap-3 hover:bg-ink/[0.04] transition-colors"
      >
        {thumbnail && (
          <div className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-side border border-ct-hairline">
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current ${visuals.badgeText}`}>
              <Circle size={8} strokeWidth={0} fill="currentColor" className={visuals.dotClass} />
              {visuals.label}
            </span>
            {finding.isFallProximal && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/40 text-red-500">
                <AlertTriangle size={9} />
                Near fall
              </span>
            )}
          </div>
          {/* Name + cue */}
          <div>
            <h4 className="text-sm font-bold text-ink leading-tight">{finding.name}</h4>
            <p className="text-sm text-ink-soft mt-0.5 leading-snug">{finding.cue}</p>
            {showMisfireHint && (
              <p className="text-[10px] text-ink-muted mt-1.5 leading-snug italic">
                You&rsquo;ve flagged this rule wrong {totalWrong} times before — does it fit this clip?
              </p>
            )}
          </div>
        </div>
        {/* Chevron */}
        <span className="flex-shrink-0 text-ink-muted mt-1">
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-ct-hairline px-3 py-3 flex flex-col gap-3 bg-ink/[0.04]">
          {finding.whyItMatters && <Section label="Why it matters">{finding.whyItMatters}</Section>}
          {finding.howToFix && <Section label="How to fix">{finding.howToFix}</Section>}
          {finding.whenYouSeeIt && <Section label="When you see it">{finding.whenYouSeeIt}</Section>}
        </div>
      )}

      {/* Instances row — always visible */}
      <div className="px-3 pb-3 pt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-ink-soft mr-1">
          {finding.instanceCount === 1 ? '1 instance' : `${finding.instanceCount} instances`}
        </span>
        {finding.timestamps.map((ms, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); onJumpTo(ms) }}
            className="flex items-center gap-1 text-[11px] font-semibold text-ink-soft hover:text-clay-deep bg-card hover:bg-side border border-ct-rim hover:border-clay/50 px-2 py-1 rounded-md transition-colors ct-tnum"
          >
            {formatTime(ms)}
            <ChevronRight size={10} />
          </button>
        ))}
        {/* Feedback affordance — discreet, right-aligned. Pushes the
            climber's signal into localStorage so we know which rules
            misfire on their footage. */}
        {firstTs != null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (markedWrong) onUnmarkWrong(finding.ruleId, firstTs)
              else             onMarkWrong(finding.ruleId, firstTs)
            }}
            className={`ml-auto flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${
              markedWrong
                ? 'bg-side border-ct-rim text-ink-soft'
                : 'border-transparent text-ink-muted hover:text-ink-soft hover:border-ct-rim'
            }`}
            aria-pressed={markedWrong}
            title={markedWrong ? 'You marked this as wrong — tap to undo' : 'Mark as wrong'}
          >
            <ThumbsDown size={11} />
            {markedWrong ? 'Marked wrong' : 'Was this wrong?'}
          </button>
        )}
      </div>
    </li>
  )
}

function Section({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-ink-muted">
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
