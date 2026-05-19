import { useState } from 'react'
import { ChevronDown, BookOpen, ExternalLink, FlaskConical, UserCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Trust + transparency panel for a single diagnosis bucket. Renders:
 *   - `reasoning_basis` — short paragraph explaining the clinical signature
 *     (why the app flags this diagnosis from the literature, not just
 *     "the app says so").
 *   - `sources[]`       — list of references (peer-reviewed papers + named
 *     climbing-medicine experts) with optional external links.
 *
 * The whole thing is collapsed by default so it doesn't drown the primary
 * "what should I do about this" content for users who just want a quick
 * answer — but it's one tap away for users who want to verify where the
 * guidance comes from before trusting it.
 *
 * Renders nothing if both fields are empty (gracefully no-ops on buckets
 * we haven't populated citations for yet).
 *
 * Props:
 *   - reasoningBasis: string | undefined
 *   - sources:        Array<{type:'paper'|'expert', title, authors?, year?, venue?, url?}>
 *   - defaultOpen?:   boolean (default false). Set true to expand on mount
 *                     for the primary/most-likely diagnosis where trust
 *                     building matters most.
 */
export default function BucketSources({ reasoningBasis = '', sources = [], defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasReasoning = reasoningBasis && reasoningBasis.trim().length > 0
  const hasSources   = Array.isArray(sources) && sources.length > 0
  if (!hasReasoning && !hasSources) return null

  const sourceCount = sources.length

  return (
    <div className="pt-3 mt-3 border-t border-outline/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted font-semibold">
          <BookOpen size={11} />
          <span>Sources &amp; reasoning</span>
          {hasSources && (
            <span className="ml-1 text-[9px] font-bold text-muted/70 tabular-nums">
              · {sourceCount}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="text-muted/60"
        >
          <ChevronDown size={12} strokeWidth={2.4} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3.5">
              {hasReasoning && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted/80 mb-1.5">
                    Why this diagnosis
                  </p>
                  <p className="text-xs text-text/85 leading-relaxed">
                    {reasoningBasis}
                  </p>
                </div>
              )}

              {hasSources && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted/80 mb-2">
                    References
                  </p>
                  <ul className="space-y-2">
                    {sources.map((s, i) => (
                      <SourceRow key={i} source={s} />
                    ))}
                  </ul>
                  <p className="text-[10px] text-muted/50 mt-2.5 leading-snug italic">
                    Educational summaries drawn from these references. Not a substitute for evaluation by a qualified clinician.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Single citation row. Paper vs expert get distinct icons + slightly different
// metadata layout so users can quickly tell research literature from named
// authorities at a glance.
function SourceRow({ source }) {
  const isPaper = source.type === 'paper'
  const Icon = isPaper ? FlaskConical : UserCheck
  const iconColor = isPaper ? 'text-accent' : 'text-accent3'

  const meta = [source.authors, source.year, source.venue].filter(Boolean).join(' · ')

  const inner = (
    <>
      <Icon size={11} className={`${iconColor} shrink-0 mt-0.5`} strokeWidth={2.4} />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] text-text/90 leading-snug font-medium">
          {source.title}
          {source.url && (
            <ExternalLink size={9} className="inline ml-1 -mt-0.5 text-muted/60" />
          )}
        </p>
        {meta && (
          <p className="text-[10px] text-muted/70 leading-snug mt-0.5">
            {meta}
          </p>
        )}
      </div>
    </>
  )

  if (source.url) {
    return (
      <li>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-white/[0.04] transition-colors"
        >
          {inner}
        </a>
      </li>
    )
  }
  return (
    <li className="flex items-start gap-2 px-2 py-1.5 -mx-2">
      {inner}
    </li>
  )
}
