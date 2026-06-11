import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, CheckCircle2, XCircle, Hand, AlertTriangle, Activity } from 'lucide-react'
import BucketSources from './triage/BucketSources'
import QualifierChip from './triage/QualifierChip'
import { splitBucketTitle } from '../lib/qualifierGlossary'
import Surface from './ui/Surface'
import Eyebrow from './ui/Eyebrow'

// Section-name → icon + tone. Lets us treat the API's plan dict generically
// while still giving each section a recognisable feel. Unknown sections fall
// through to the default theme.
const PLAN_SECTION_THEMES = {
  'Immediate next 7–10 days': { icon: Activity, color: 'text-accent',  badge: 'bg-accent/15 border-accent/30' },
  'Immediate next 7-10 days': { icon: Activity, color: 'text-accent',  badge: 'bg-accent/15 border-accent/30' },
  'What to avoid for now':    { icon: XCircle,  color: 'text-accent2', badge: 'bg-accent2/10 border-accent2/30' },
  'Avoid':                    { icon: XCircle,  color: 'text-accent2', badge: 'bg-accent2/10 border-accent2/30' },
  'When to escalate':         { icon: AlertTriangle, color: 'text-accent3', badge: 'bg-accent3/12 border-accent3/30' },
  default:                    { icon: CheckCircle2,  color: 'text-text',    badge: 'bg-panel/60 border-outline' },
}

// Severity-driven hero card theming, Almanac palette. Null-safe via the
// .mild fallback. severe → clay, moderate → ochre, mild → sage, all rendered
// as soft parchment field-cards rather than saturated gradients.
const SEVERITY_HERO_THEME = {
  severe: {
    bg:     'bg-card bg-clay/[0.07] shadow-[0_2px_10px_rgba(42,39,34,0.05)]',
    border: 'border-clay/45',
    pillBg: 'bg-clay/20',
    pillBd: 'border-clay/45',
    pillTx: 'text-clay-deep',
  },
  moderate: {
    bg:     'bg-card bg-ochre/[0.07] shadow-[0_2px_10px_rgba(42,39,34,0.05)]',
    border: 'border-ochre/45',
    pillBg: 'bg-ochre/20',
    pillBd: 'border-ochre/45',
    pillTx: 'text-clay-deep',
  },
  mild: {
    bg:     'bg-card bg-sage/[0.07] shadow-[0_2px_10px_rgba(42,39,34,0.05)]',
    border: 'border-sage/40',
    pillBg: 'bg-sage/18',
    pillBd: 'border-sage/40',
    pillTx: 'text-sage-deep',
  },
}

// Heuristic chip extractor for the hero "quick-action" grid.
// Pattern-matches common phrasings in the immediate plan + avoid list and
// turns each into a short ✓ / ✗ chip. Caps at 4. Returns [] when fewer than
// 2 chips can be extracted — caller falls back to the plain guidance list.
export function extractActionChips(plan) {
  if (!plan) return []
  const immediate = plan['Immediate next 7–10 days']
                 ?? plan['Immediate next 7-10 days']
                 ?? []
  const avoid     = plan['What to avoid for now']
                 ?? plan['Avoid']
                 ?? []
  const chips = []

  for (const raw of immediate) {
    const s = String(raw).trim()
    if (chips.length >= 4) break
    const low = s.toLowerCase()
    if (/(^|\b)rest\b.*?\d+/i.test(s)) {
      const m = s.match(/(\d+\s*[-–]?\s*\d*)\s*days?/i)
      chips.push({ kind: 'do', text: m ? `Rest ${m[1]} days` : 'Rest' })
    } else if (low.startsWith('ice') || /\bice\b/.test(low)) {
      chips.push({ kind: 'do', text: 'Ice 15 min' })
    } else if (/buddy[- ]?tape|tape\b/.test(low)) {
      chips.push({ kind: 'do', text: 'Buddy-tape' })
    } else if (/elevat/.test(low)) {
      chips.push({ kind: 'do', text: 'Elevate' })
    } else if (/open[- ]hand|antagonist|stretch/.test(low)) {
      chips.push({ kind: 'do', text: 'Light open-hand' })
    }
  }

  for (const raw of avoid) {
    const s = String(raw).trim()
    if (chips.length >= 4) break
    const low = s.toLowerCase()
    if (/crimp/.test(low))           chips.push({ kind: 'dont', text: 'No crimping' })
    else if (/hangboard/.test(low))  chips.push({ kind: 'dont', text: 'No hangboard' })
    else if (/campus/.test(low))     chips.push({ kind: 'dont', text: 'No campusing' })
    else if (/dyno|dynamic/.test(low)) chips.push({ kind: 'dont', text: 'No dynos' })
    else if (/heel hook/.test(low))  chips.push({ kind: 'dont', text: 'No heel hooks' })
    else if (/pull|pulling/.test(low)) chips.push({ kind: 'dont', text: 'No hard pulling' })
  }

  return chips.length >= 2 ? chips : []
}

function BucketDetail({ bucket, isPrimary = false }) {
  const hasMatches = bucket.matches_if && bucket.matches_if.length > 0
  const hasNotLikely = bucket.not_likely_if && bucket.not_likely_if.length > 0
  const hasQuickTest = bucket.quick_test && bucket.quick_test.trim().length > 0
  const hasSources   = (bucket.reasoning_basis && bucket.reasoning_basis.trim().length > 0)
                    || (Array.isArray(bucket.sources) && bucket.sources.length > 0)
  if (!hasMatches && !hasNotLikely && !hasQuickTest && !hasSources) return null
  return (
    <div className="space-y-3 pt-3 mt-3 border-t border-outline/40">
      {hasMatches && (
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-accent font-semibold mb-1.5">
            <CheckCircle2 size={11} /> Matches if
          </div>
          <ul className="space-y-1">
            {bucket.matches_if.map((m, mi) => (
              <li key={mi} className="text-xs text-ink-soft leading-relaxed flex items-start gap-1.5">
                <span className="text-accent mt-0.5">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasNotLikely && (
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-soft font-semibold mb-1.5">
            <XCircle size={11} /> Probably not this if
          </div>
          <ul className="space-y-1">
            {bucket.not_likely_if.map((m, mi) => (
              <li key={mi} className="text-xs text-ink-muted leading-relaxed flex items-start gap-1.5">
                <span className="text-ink-muted mt-0.5">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasQuickTest && (
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-accent3 font-semibold mb-1.5">
            <Hand size={11} /> Quick self-check
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">{bucket.quick_test}</p>
        </div>
      )}
      {/* Sources & reasoning — collapsed by default for differentials,
          expanded for the primary/most-likely diagnosis where trust
          building matters most. */}
      <BucketSources
        reasoningBasis={bucket.reasoning_basis}
        sources={bucket.sources}
        defaultOpen={isPrimary}
      />
    </div>
  )
}

export function ResultsHero({ result, form }) {
  const [expanded, setExpanded] = useState(false)
  const severityKey = result.severity?.level ?? 'mild'
  const theme = SEVERITY_HERO_THEME[severityKey] ?? SEVERITY_HERO_THEME.mild
  const topBucket = result.buckets?.[0]
  const title = topBucket?.title || 'Your guidance'
  const lead  = topBucket?.why
             || result.severity?.action
             || 'Follow the plan in the tabs below to recover and return to climbing.'
  const chips = extractActionChips(result.plan)
  const severityLabel = result.severity?.label
                     || severityKey.charAt(0).toUpperCase() + severityKey.slice(1)
  const hasDetail = topBucket && (
    (topBucket.matches_if && topBucket.matches_if.length > 0)
    || (topBucket.not_likely_if && topBucket.not_likely_if.length > 0)
    || (topBucket.quick_test && topBucket.quick_test.trim().length > 0)
  )

  return (
    <div className={`rounded-2xl border ${theme.border} ${theme.bg} p-4 sm:p-5`}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.pillBg} ${theme.pillTx} border ${theme.pillBd}`}>
          {severityLabel}
        </span>
        {form?.region && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sage/15 text-sage-deep border border-sage/40">
            {form.region}
          </span>
        )}
        {form?.onset && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-paper text-ink-muted border border-ct-hairline">
            {form.onset} onset
          </span>
        )}
      </div>

      {/* Split the bucket title into the base name + qualifier so the
          qualifier renders as a tappable chip with a plain-English tooltip
          instead of a confusing em-dash suffix. Graceful fallback to the
          original title when no qualifier is present. */}
      {(() => {
        const { baseTitle, qualifier } = splitBucketTitle(title)
        return (
          <h3 className="text-base sm:text-lg font-bold text-ink leading-snug flex items-baseline flex-wrap gap-x-2 gap-y-1">
            <span>{baseTitle}</span>
            {qualifier && <QualifierChip qualifier={qualifier} />}
          </h3>
        )
      })()}
      <p className="text-xs sm:text-sm text-ink-soft mt-1.5 leading-relaxed">{lead}</p>

      {chips.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3.5">
          {chips.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-paper border border-ct-hairline rounded-lg px-2.5 py-1.5"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                c.kind === 'do'
                  ? 'bg-sage/18 text-sage-deep'
                  : 'bg-clay/15 text-clay-deep'
              }`}>
                {c.kind === 'do' ? '✓' : '✗'}
              </span>
              <span className="text-[11px] text-ink leading-tight">{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {hasDetail && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft hover:text-ink transition-colors"
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Hide self-check' : 'Why this might be you'}</span>
            <ChevronDown
              size={12}
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="detail"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <BucketDetail bucket={topBucket} isPrimary />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

export function OtherPossibilities({ buckets }) {
  const [expandedIdx, setExpandedIdx] = useState(() => new Set())
  if (!buckets || buckets.length < 2) return null
  const others = buckets.slice(1)
  const toggle = (idx) => {
    setExpandedIdx((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }
  return (
    <div className="space-y-2">
      <Eyebrow>Also possible</Eyebrow>
      <div className="space-y-2">
        {others.map((b, i) => {
          const hasDetail = (b.matches_if && b.matches_if.length > 0)
            || (b.not_likely_if && b.not_likely_if.length > 0)
            || (b.quick_test && b.quick_test.trim().length > 0)
          const isExpanded = expandedIdx.has(i)
          return (
            <Surface
              key={i}
              tier="flat"
              padding="sm"
              rounded="rounded-xl"
              className={`p-3 ${hasDetail ? 'cursor-pointer hover:border-ct-terracotta/30 transition-colors' : ''}`}
              onClick={hasDetail ? () => toggle(i) : undefined}
              role={hasDetail ? 'button' : undefined}
              tabIndex={hasDetail ? 0 : undefined}
              onKeyDown={hasDetail ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle(i)
                }
              } : undefined}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {(() => {
                    const { baseTitle, qualifier } = splitBucketTitle(b.title)
                    return (
                      <p className="text-sm font-semibold text-ink leading-snug flex items-baseline flex-wrap gap-x-1.5 gap-y-1">
                        <span>{baseTitle}</span>
                        {qualifier && <QualifierChip qualifier={qualifier} size="sm" />}
                      </p>
                    )
                  })()}
                  {b.why && (
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{b.why}</p>
                  )}
                </div>
                {hasDetail && (
                  <ChevronDown
                    size={14}
                    className={`text-ink-soft shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                )}
              </div>
              <AnimatePresence initial={false}>
                {hasDetail && isExpanded && (
                  <motion.div
                    key="detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <BucketDetail bucket={b} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Surface>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Renders the API's plan dict as titled lists. The plan is the practical
 * companion to the diagnosis hero — it's *what to actually do*. We render
 * every key the backend returns (Immediate / Avoid / Escalate / etc.) so
 * new sections don't need a frontend change to surface.
 */
export function ActionPlan({ plan }) {
  if (!plan) return null
  const entries = Object.entries(plan).filter(([, items]) => Array.isArray(items) && items.length > 0)
  if (entries.length === 0) return null
  return (
    <Surface tier="default" padding="md" rounded="rounded-2xl" className="sm:p-5 space-y-4">
      <Eyebrow>Your action plan</Eyebrow>
      <div className="space-y-4">
        {entries.map(([section, items]) => {
          const theme = PLAN_SECTION_THEMES[section] ?? PLAN_SECTION_THEMES.default
          const Icon = theme.icon
          return (
            <div key={section}>
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${theme.badge} mb-2`}>
                <Icon size={11} className={theme.color} strokeWidth={2.4} />
                <span className={`text-[10px] font-bold uppercase tracking-wide ${theme.color}`}>{section}</span>
              </div>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink leading-relaxed">
                    <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${theme.color.replace('text-', 'bg-')}`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Surface>
  )
}

/**
 * Drop-in diagnosis block: top-bucket hero, action plan, then "Also possible".
 *
 * Props:
 *   result      — triage API response
 *   form        — { region, severity, onset } for hero pill rendering
 *   revealMode  — 'instant' (default): everything mounts at once.
 *                 'cascade': choreographed reveal — hero rises first,
 *                            then ActionPlan, then OtherPossibilities,
 *                            each ~250ms apart. Used by SmartTriageCard
 *                            inline reveal. /body page uses 'instant'.
 */
export default function TriageDiagnosis({ result, form, revealMode = 'instant' }) {
  if (!result) return null
  if (revealMode !== 'cascade') {
    return (
      <div className="space-y-3">
        <ResultsHero result={result} form={form} />
        <ActionPlan plan={result.plan} />
        <OtherPossibilities buckets={result.buckets} />
      </div>
    )
  }
  // Cascade reveal: parent stagger orchestrates the three children. Disable
  // gracefully under prefers-reduced-motion via Framer Motion's automatic
  // useReducedMotion respect when transitions use the spring/tween defaults.
  return (
    <motion.div
      className="space-y-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden:  { opacity: 1 },
        visible: { opacity: 1, transition: { staggerChildren: 0.25, delayChildren: 0.05 } },
      }}
    >
      <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.2, 0.7, 0.2, 1] } } }}>
        <ResultsHero result={result} form={form} />
      </motion.div>
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] } } }}>
        <ActionPlan plan={result.plan} />
      </motion.div>
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] } } }}>
        <OtherPossibilities buckets={result.buckets} />
      </motion.div>
    </motion.div>
  )
}
