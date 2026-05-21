import { motion } from 'framer-motion'
import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'

/**
 * State-aware glass card container. Owns the visual state of one section.
 *
 * States:
 *   'dim'      — unvisited. opacity 0.45.
 *   'focused'  — current. opacity 1, terracotta glow border.
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
    >
      <Surface
        tier="default"
        padding="md"
        rounded="rounded-2xl"
        className={`mb-2.5 transition-[border-color,box-shadow] duration-200
                    ${isFocused
                      ? 'border-ct-terracotta/40 shadow-[0_8px_24px_rgba(217,119,87,0.08)]'
                      : ''}`}
      >
        <Eyebrow className="mb-2.5">{eyebrow}</Eyebrow>
        {children}
      </Surface>
    </motion.section>
  )
}
