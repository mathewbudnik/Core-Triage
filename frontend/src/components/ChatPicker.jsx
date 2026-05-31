import { motion } from 'framer-motion'
import { ArrowRight, Bot, Activity } from 'lucide-react'

/**
 * Chat tab landing screen — three equal-size cards: Coach, AI, Movement
 * Analyzer.
 *
 * Tier-aware coach-card CTA:
 *   anonymous → "Sign in to apply"           (calls onSelectCoach; parent opens AuthModal)
 *   free / pro → "Apply — $89/mo"            (calls onSelectCoach; parent opens UpgradeModal)
 *   coaching subscriber → "Open chat"        (calls onSelectCoach; parent switches to coach view)
 *
 * AI card always shows "Start chatting →" — parent switches to AI view.
 *
 * Movement Analyzer CTA mirrors the trial gate:
 *   anonymous → "Sign in to analyze"
 *   expired   → "Upgrade to analyze"          (parent opens UpgradeModal)
 *   everyone else → "Get started"             (parent switches to analyzer view)
 */
export default function ChatPicker({ user, onSelectCoach, onSelectAI, onSelectAnalyzer }) {
  const tier = user?.tier ?? 'anonymous'
  const isAnon = !user
  const isCoachingSub = tier === 'coaching'
  const subState = user?.subscription_state?.state

  let coachCtaLabel
  if (isAnon) coachCtaLabel = 'Sign in to apply'
  else if (isCoachingSub) coachCtaLabel = 'Open chat with Budnik'
  else coachCtaLabel = 'Apply — $89/mo'

  let analyzerCtaLabel
  if (isAnon) analyzerCtaLabel = 'Sign in to analyze'
  else if (subState === 'expired') analyzerCtaLabel = 'Upgrade to analyze'
  else analyzerCtaLabel = 'Get started'

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 md:px-6 py-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center mb-8"
      >
        <h2 className="text-xl font-bold text-ct-cream">How do you want to chat?</h2>
        <p className="text-sm text-ct-cream/60 mt-1.5 max-w-md mx-auto">
          Both options stay available — pick whichever fits right now.
        </p>
      </motion.div>

      {/* Two equal cards (stacked on mobile, side-by-side ≥ sm) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl"
      >
        {/* Coach card */}
        <button
          type="button"
          onClick={onSelectCoach}
          className="group flex flex-col items-center text-center gap-3 px-5 py-6 rounded-xl border bg-[linear-gradient(180deg,rgba(217,119,87,0.10),rgba(217,119,87,0.04))] border-ct-terracotta/25 hover:border-ct-terracotta/50 hover:shadow-glow transition-all duration-150"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold bg-ct-terra-tint border border-ct-terracotta/40 text-ct-terra-soft">
            M
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-ct-cream">Talk to Budnik</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-ct-terra-tint text-ct-terra-soft border border-ct-terracotta/30">
                Coaching
              </span>
            </div>
            <p className="text-xs text-ct-cream/60 mt-1.5 leading-relaxed">
              Send video of your project — get a beta breakdown and training feedback from an outdoor V13 boulderer and USAC-certified routesetter with a decade in the sport. Plus direct messaging for return-to-climb and load-management calls.
            </p>
            <p className="text-[10px] text-ct-cream/50 mt-2">
              Replies in 24–48h
            </p>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-ct-terracotta text-ct-cream group-hover:opacity-90 transition-opacity">
            {coachCtaLabel}
            <ArrowRight size={12} />
          </span>
        </button>

        {/* AI card */}
        <button
          type="button"
          onClick={onSelectAI}
          className="group flex flex-col items-center text-center gap-3 px-5 py-6 rounded-xl border bg-[linear-gradient(180deg,rgba(217,119,87,0.06),rgba(217,119,87,0.02))] border-ct-terracotta/20 hover:border-ct-terracotta/40 hover:shadow-glow transition-all duration-150"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-ct-terra-tint border border-ct-terracotta/30 text-ct-terra-soft">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-ct-cream">Ask the AI</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-ct-terra-tint text-ct-terra-soft border border-ct-terracotta/20">
                Free trial
              </span>
            </div>
            <p className="text-xs text-ct-cream/60 mt-1.5 leading-relaxed">
              Climbing-trained assistant — technique, training, movement, and injury triage. 5 free answers, then unlimited during your 14-day trial and with a subscription.
            </p>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-ct-terracotta/30 text-ct-terra-soft bg-ct-terra-tint group-hover:bg-[rgba(217,119,87,0.12)] transition-colors">
            Start chatting
            <ArrowRight size={12} />
          </span>
        </button>

        {/* Movement Analyzer card */}
        <button
          type="button"
          onClick={onSelectAnalyzer}
          className="group flex flex-col items-center text-center gap-3 px-5 py-6 rounded-xl border bg-[linear-gradient(180deg,rgba(217,119,87,0.06),rgba(217,119,87,0.02))] border-ct-terracotta/20 hover:border-ct-terracotta/40 hover:shadow-glow transition-all duration-150"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-ct-terra-tint border border-ct-terracotta/30 text-ct-terra-soft">
            <Activity size={20} />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-ct-cream">Movement Analyzer</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-ct-terra-tint text-ct-terra-soft border border-ct-terracotta/20">
                Beta
              </span>
            </div>
            <p className="text-xs text-ct-cream/60 mt-1.5 leading-relaxed">
              Upload a climbing clip and see a frame-by-frame skeleton overlay of your movement. Runs entirely on your device — no upload to a server.
            </p>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-ct-terracotta/30 text-ct-terra-soft bg-ct-terra-tint group-hover:bg-[rgba(217,119,87,0.12)] transition-colors">
            {analyzerCtaLabel}
            <ArrowRight size={12} />
          </span>
        </button>
      </motion.div>

      <p className="text-[10px] text-ct-cream/30 mt-6 text-center max-w-md">
        Educational only — not a medical diagnosis. If symptoms are severe or worsening, seek professional evaluation.
      </p>
    </div>
  )
}
