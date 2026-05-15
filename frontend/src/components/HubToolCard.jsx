import { ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { TOOLS, ACCENT_CLASSES } from '../data/hubTools'
import HubPattern from './HubPatterns'

/**
 * Small status card. Used in the right-hand stack. Tapping it should call
 * `onTap(toolKey)` so the parent can promote it to the featured slot.
 *
 * Props:
 *   toolKey:  'triage' | 'rehab' | 'train' | 'chat'
 *   status:   string          — status line under the label
 *   isLive:   boolean         — show the pulsing dot before the status
 *   progress: number | null   — 0..1, renders a mini progress bar under status
 *   onTap:    () => void
 */
export default function HubToolCard({ toolKey, status, isLive = false, progress = null, onTap }) {
  const tool = TOOLS[toolKey]
  const c = ACCENT_CLASSES[tool.accent]
  const Icon = tool.icon

  // Plain fade-in on remount. `layoutId` was originally used here to FLIP
  // between this slot and the featured slot, but Framer couldn't morph
  // the two layouts (compact-horizontal vs. tall-multi-section) and the
  // featured card ended up blank after a swap. Caller passes `key={toolKey}`
  // so the rendered set remounts cleanly when the user promotes a card.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTap?.()
    }
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border ${c.borderSoft} ${c.bgGradient}
                  flex items-center gap-3 px-4 py-3.5 min-h-[86px] text-left cursor-pointer
                  hover:-translate-y-0.5 transition-transform group w-full
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40`}
    >
      {/* glow orb (behind pattern + content) */}
      <span className={`pointer-events-none absolute -top-10 -right-10 w-[140px] h-[140px]
                        rounded-full blur-[40px] ${c.glow} z-0`} />
      {/* pattern layer */}
      <HubPattern pattern={tool.pattern} />

      <span className={`relative z-10 inline-flex items-center justify-center w-9 h-9
                        rounded-xl border ${c.border} ${c.iconBg} ${c.text} shrink-0`}>
        <Icon size={18} strokeWidth={2} />
      </span>

      <div className="relative z-10 flex-1 min-w-0">
        <p className="text-sm font-bold text-text leading-tight">{tool.label}</p>
        <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
          {isLive && <span className={`w-1.5 h-1.5 rounded-full ${c.dotClass} shrink-0`} />}
          <span className="truncate">{status}</span>
        </p>
        {progress != null && (
          <div className="relative mt-1 h-[3px] w-[70%] rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${c.progressBar}`}
                 style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>

      <ChevronRight
        size={14}
        strokeWidth={2.4}
        className="relative z-10 text-text/25 group-hover:text-text/60 group-hover:translate-x-0.5
                   transition-all shrink-0"
      />
    </motion.div>
  )
}
