import { useState } from 'react'
import { ChevronDown, Check, AlertCircle, Stethoscope } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import BucketSources from './BucketSources'
import QualifierChip from './QualifierChip'
import { splitBucketTitle } from '../../lib/qualifierGlossary'
import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'

/**
 * Ranked list of differential diagnoses below the primary hero.
 * Each row expands inline on tap to surface why-it-might-match,
 * why-it-might-not, and a quick self-test.
 *
 * Props:
 *   items:    Array<{
 *     title: string,
 *     subtitle?: string,
 *     matches_if?: string[],
 *     not_likely_if?: string[],
 *     quick_test?: string,
 *   }>
 *   severity: 'mild' | 'moderate' | 'severe'   — drives the rank pill color
 */
const RANK_TONE = {
  mild:     { bg: 'rgba(20,184,166,0.15)',  fg: '#5eead4', border: 'rgba(20,184,166,0.35)' },
  moderate: { bg: 'rgba(20,184,166,0.15)',  fg: '#5eead4', border: 'rgba(20,184,166,0.35)' },
  severe:   { bg: 'rgba(251,113,133,0.15)', fg: '#fda4af', border: 'rgba(251,113,133,0.35)' },
}

export default function TriageDifferentials({ items = [], severity = 'moderate' }) {
  const [openIdx, setOpenIdx] = useState(null)
  if (items.length === 0) return null
  const t = RANK_TONE[severity] || RANK_TONE.moderate

  return (
    <Surface tier="default" padding="md" rounded="rounded-2xl" as="section" className="mb-3">
      <Eyebrow className="mb-2.5">Other possibilities</Eyebrow>
      <ul className="space-y-1.5">
        {items.map((item, i) => {
          const isOpen = openIdx === i
          const hasSources = (item.reasoning_basis && item.reasoning_basis.trim().length > 0)
                          || (Array.isArray(item.sources) && item.sources.length > 0)
          const hasDetail = (item.matches_if?.length || 0) > 0
                          || (item.not_likely_if?.length || 0) > 0
                          || !!item.quick_test
                          || hasSources
          return (
            <li key={i}>
              <div className="rounded-xl bg-white/[0.03] border-[0.5px] border-white/[0.08]
                              overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-3
                             px-3.5 py-3 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex items-center justify-center w-[22px] h-[22px]
                                     rounded-full text-[11px] font-extrabold shrink-0 border-[0.5px]"
                          style={{ background: t.bg, color: t.fg, borderColor: t.border }}>
                      {i + 2}
                    </span>
                    <div className="min-w-0">
                      {/* Split title to render the qualifier as a chip with
                          tooltip instead of an embedded em-dash suffix. */}
                      {(() => {
                        const { baseTitle, qualifier } = splitBucketTitle(item.title)
                        return (
                          <p className="text-[13px] font-bold leading-tight flex items-baseline flex-wrap gap-x-1.5 gap-y-1">
                            <span>{baseTitle}</span>
                            {qualifier && <QualifierChip qualifier={qualifier} size="sm" />}
                          </p>
                        )
                      })()}
                      {item.subtitle && !isOpen && (
                        <p className="text-[10px] text-ct-cream/60 font-semibold mt-0.5 truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                    className="shrink-0 text-ct-cream/30"
                  >
                    <ChevronDown size={16} strokeWidth={2.4} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && hasDetail && (
                    <motion.div
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-ct-hairline">
                        {item.subtitle && (
                          <p className="text-[11.5px] text-ct-cream/60 leading-snug mt-2">
                            {item.subtitle}
                          </p>
                        )}

                        {item.matches_if?.length > 0 && (
                          <Block
                            icon={<Check size={12} strokeWidth={2.6} className="text-teal-300" />}
                            label="Looks like this if"
                          >
                            <ul className="space-y-1">
                              {item.matches_if.map((line, k) => (
                                <li key={k} className="text-[11.5px] text-text/85 leading-snug
                                                       flex gap-1.5">
                                  <span className="text-teal-300/60 shrink-0">•</span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          </Block>
                        )}

                        {item.not_likely_if?.length > 0 && (
                          <Block
                            icon={<AlertCircle size={12} strokeWidth={2.6} className="text-amber-300" />}
                            label="Less likely if"
                          >
                            <ul className="space-y-1">
                              {item.not_likely_if.map((line, k) => (
                                <li key={k} className="text-[11.5px] text-text/85 leading-snug
                                                       flex gap-1.5">
                                  <span className="text-amber-300/60 shrink-0">•</span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          </Block>
                        )}

                        {item.quick_test && (
                          <Block
                            icon={<Stethoscope size={12} strokeWidth={2.4} className="text-ct-terra-soft" />}
                            label="Quick self-check"
                          >
                            <p className="text-[11.5px] text-text/85 leading-snug">
                              {item.quick_test}
                            </p>
                          </Block>
                        )}

                        {/* Sources & reasoning — collapsed by default on
                            differentials (these are secondary diagnoses,
                            user is just browsing). One more tap to see
                            citations, keeps the surface clean. */}
                        <BucketSources
                          reasoningBasis={item.reasoning_basis}
                          sources={item.sources}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          )
        })}
      </ul>
    </Surface>
  )
}

function Block({ icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-ct-cream/50">
          {label}
        </p>
      </div>
      {children}
    </div>
  )
}
