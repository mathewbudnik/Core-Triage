import { ArrowRight, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { TOOLS, ACCENT_CLASSES } from '../data/hubTools'
import HubPattern from './HubPatterns'

/**
 * The big card on the left. Props mirror HubToolCard but with extra fields
 * for rich content: eyebrow, title, detail, subDetail, progress, ctaLabel.
 *
 * Props:
 *   toolKey:    'triage' | 'rehab' | 'train' | 'chat'
 *   eyebrow:    string                 — small label above title (e.g. "Today · Train")
 *   title:      string                 — primary headline (e.g. "Hangboard · 60 min")
 *   detail:     string                 — first paragraph
 *   subDetail:  string | null          — second paragraph (smaller, muted)
 *   progress:   { value: 0..1, label } | null
 *   ctaLabel:   string                 — button text (e.g. "Start session")
 *   onCta:      () => void
 */
export default function HubFeaturedCard({
  toolKey, eyebrow, title, detail, subDetail,
  progress, ctaLabel, onCta,
}) {
  const tool = TOOLS[toolKey]
  const c = ACCENT_CLASSES[tool.accent]
  const Icon = tool.icon

  return (
    // Plain fade/scale-in on remount. We previously used `layoutId` to FLIP
    // between the small + featured slots, but the two components have very
    // different internal layouts and Framer Motion couldn't morph them
    // cleanly — the featured slot rendered empty after a swap. Caller
    // passes `key={toolKey}` so React remounts on tool change and this
    // animation runs every time.
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bgGradient}
                  p-5 md:p-6 flex flex-col min-h-[280px]
                  ${c.outerGlowShadow}`}
    >
      <span className={`pointer-events-none absolute -top-12 -right-12 w-[180px] h-[180px]
                        rounded-full blur-[50px] ${c.glow} z-0`} />
      <HubPattern pattern={tool.pattern} />

      <div className="relative z-10 flex items-center gap-3 mb-1">
        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl
                          border ${c.border} ${c.iconBg} ${c.text}
                          ${c.iconShadow} shrink-0`}>
          <Icon size={24} strokeWidth={2} />
        </span>
        <div>
          <p className={`text-[10px] font-extrabold uppercase tracking-[0.15em] ${c.text}`}>
            <Target size={11} strokeWidth={2.4} className="inline mr-1 -mt-0.5" />
            {eyebrow}
          </p>
          <p className="text-lg font-extrabold text-text -tracking-[0.01em] leading-tight">{title}</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 mt-3">
        <p className="text-sm text-text leading-snug">{detail}</p>
        {subDetail && (
          <p className="text-[11px] text-muted mt-1.5">{subDetail}</p>
        )}

        {progress && (
          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${c.progressBar}`}
                   style={{ width: `${Math.round(progress.value * 100)}%` }} />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-[0.1em] font-bold text-muted">
              {progress.label}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCta}
        className={`relative z-10 self-start mt-5 inline-flex items-center gap-2
                    px-4 py-2.5 rounded-lg text-sm font-bold text-bg
                    ${c.solidBg}
                    hover:brightness-110 active:brightness-95 transition`}
      >
        {ctaLabel}
        <ArrowRight size={14} strokeWidth={2.6} />
      </button>
    </motion.div>
  )
}
