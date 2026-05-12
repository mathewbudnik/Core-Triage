import { motion } from 'framer-motion'
import { ArrowRight, Bot } from 'lucide-react'

/**
 * Chat tab landing screen — two equal-size cards: Coach vs AI.
 *
 * Tier-aware coach-card CTA:
 *   anonymous → "Sign in to apply"           (calls onSelectCoach; parent opens AuthModal)
 *   free / pro → "Apply — $89/mo"            (calls onSelectCoach; parent opens UpgradeModal)
 *   coaching subscriber → "Open chat"        (calls onSelectCoach; parent switches to coach view)
 *
 * AI card always shows "Start chatting →" — parent switches to AI view.
 */
export default function ChatPicker({ user, onSelectCoach, onSelectAI }) {
  const tier = user?.tier ?? 'anonymous'
  const isAnon = !user
  const isCoachingSub = tier === 'coaching'

  let coachCtaLabel
  if (isAnon) coachCtaLabel = 'Sign in to apply'
  else if (isCoachingSub) coachCtaLabel = 'Open chat with Mathew'
  else coachCtaLabel = 'Apply — $89/mo'

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 md:px-6 py-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center mb-8"
      >
        <h2 className="text-xl font-bold text-text">How do you want to chat?</h2>
        <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">
          Both options stay available — pick whichever fits right now.
        </p>
      </motion.div>

      {/* Two equal cards (stacked on mobile, side-by-side ≥ sm) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl"
      >
        {/* Coach card */}
        <button
          type="button"
          onClick={onSelectCoach}
          className="group flex flex-col items-center text-center gap-3 px-5 py-6 rounded-xl border bg-[linear-gradient(180deg,rgba(247,187,81,0.08),rgba(244,114,114,0.04))] border-[rgba(247,187,81,0.25)] hover:border-[rgba(247,187,81,0.5)] hover:shadow-glow transition-all duration-150"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold bg-[rgba(247,187,81,0.15)] border border-[rgba(247,187,81,0.4)] text-accent3">
            M
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-text">Talk to Mathew</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[rgba(247,187,81,0.15)] text-accent3 border border-[rgba(247,187,81,0.3)]">
                Coaching
              </span>
            </div>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              A real climbing coach. Personalised plans, technique advice, return-to-climb decisions.
            </p>
            <p className="text-[10px] text-muted/70 mt-2">
              Replies in 24–48h
            </p>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-accent2 to-accent3 text-bg group-hover:opacity-90 transition-opacity">
            {coachCtaLabel}
            <ArrowRight size={12} />
          </span>
        </button>

        {/* AI card */}
        <button
          type="button"
          onClick={onSelectAI}
          className="group flex flex-col items-center text-center gap-3 px-5 py-6 rounded-xl border bg-[linear-gradient(180deg,rgba(125,211,192,0.08),rgba(125,211,192,0.02))] border-[rgba(125,211,192,0.25)] hover:border-[rgba(125,211,192,0.5)] hover:shadow-glow transition-all duration-150"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[rgba(125,211,192,0.15)] border border-[rgba(125,211,192,0.4)] text-accent">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-text">Ask the AI</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[rgba(125,211,192,0.15)] text-accent border border-[rgba(125,211,192,0.3)]">
                Free
              </span>
            </div>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              Instant climbing-injury lookups (free), or AI-synthesized answers (5 free / unlimited Pro).
            </p>
            <p className="text-[10px] text-muted/70 mt-2">
              Lookup is unlimited
            </p>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-accent/40 text-accent bg-[rgba(125,211,192,0.1)] group-hover:bg-[rgba(125,211,192,0.18)] transition-colors">
            Start chatting
            <ArrowRight size={12} />
          </span>
        </button>
      </motion.div>

      <p className="text-[10px] text-muted/50 mt-6 text-center max-w-md">
        Educational only — not a medical diagnosis. If symptoms are severe or worsening, seek professional evaluation.
      </p>
    </div>
  )
}
