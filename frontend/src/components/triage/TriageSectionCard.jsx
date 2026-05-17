import { motion } from 'framer-motion'

/**
 * State-aware glass card container. Owns the visual state of one section.
 *
 * States:
 *   'dim'      — unvisited. opacity 0.45.
 *   'focused'  — current. opacity 1, teal glow border.
 *   'visited'  — opened then moved on without compressing. opacity 1, default border.
 *   'passed'   — compressed. Caller should swap to <TriageSummaryPill> instead;
 *                this card renders nothing in 'passed' state to avoid double-render.
 *
 * Props:
 *   state:     'dim' | 'focused' | 'visited' | 'passed'
 *   eyebrow:   "Essentials · 1 of 4"
 *   children:  the section's content
 *   innerRef:  ref to the wrapper for autoscroll targeting
 */
export default function TriageSectionCard({ state, eyebrow, children, innerRef }) {
  if (state === 'passed') return null

  const isFocused = state === 'focused'
  const isDim = state === 'dim'

  return (
    <motion.section
      ref={innerRef}
      layout
      transition={{ duration: 0.2, ease: 'easeOut' }}
      initial={false}
      animate={{ opacity: isDim ? 0.45 : 1 }}
      className={`bg-black/35 backdrop-blur-md rounded-2xl p-4 mb-2.5
                  border-[0.5px] transition-[border,box-shadow] duration-200
                  ${isFocused
                    ? 'border-[rgba(20,184,166,0.40)] shadow-[0_8px_24px_rgba(20,184,166,0.08)]'
                    : 'border-white/[0.10]'}`}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.10em]
                    text-[var(--tier-light)] mb-2.5">
        {eyebrow}
      </p>
      {children}
    </motion.section>
  )
}
