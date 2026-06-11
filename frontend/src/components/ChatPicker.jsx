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

// Per-card accent palette. Coach leans clay (the flagship CTA), AI sage,
// Analyzer ochre — so each field-card carries its own readable tint instead
// of the old uniform terracotta wash.
const CARDS_ACCENT = {
  coach:    { dot: 'bg-clay',  ring: 'border-clay/40',  soft: 'text-clay-deep', tint: 'bg-clay/10' },
  ai:       { dot: 'bg-sage',  ring: 'border-sage/40',  soft: 'text-sage-deep', tint: 'bg-sage/10' },
  analyzer: { dot: 'bg-ochre', ring: 'border-ochre/50', soft: 'text-clay-deep', tint: 'bg-ochre/15' },
}

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
    <div className="h-full flex flex-col items-center justify-center px-4 md:px-6 py-8 max-w-2xl mx-auto w-full text-ink">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
        className="text-center mb-8"
      >
        <p className="ct-eyebrow">Coach</p>
        <h2 className="text-2xl font-serif font-semibold text-ink mt-1">How do you want to chat?</h2>
        <p className="text-sm text-ink-soft mt-1.5 max-w-md mx-auto">
          Both options stay available — pick whichever fits right now.
        </p>
      </motion.div>

      {/* Three field-cards (stacked on mobile, side-by-side ≥ sm) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl">
        {/* Coach card */}
        <PickerCard
          accent={CARDS_ACCENT.coach}
          delay={0.04}
          onClick={onSelectCoach}
          icon={<span className="text-base font-bold">M</span>}
          title="Talk to Budnik"
          badge="Coaching"
          description="Send video of your project — get a beta breakdown and training feedback from an outdoor V13 boulderer and USAC-certified routesetter with a decade in the sport. Plus direct messaging for return-to-climb and load-management calls."
          meta="Replies in 24–48h"
          cta={coachCtaLabel}
          ctaPrimary
        />

        {/* AI card */}
        <PickerCard
          accent={CARDS_ACCENT.ai}
          delay={0.1}
          onClick={onSelectAI}
          icon={<Bot size={20} />}
          title="Ask the AI"
          badge="Free trial"
          description="Climbing-trained assistant — technique, training, movement, and injury triage. 5 free answers, then unlimited during your 14-day trial and with a subscription."
          cta="Start chatting"
        />

        {/* Movement Analyzer card */}
        <PickerCard
          accent={CARDS_ACCENT.analyzer}
          delay={0.16}
          onClick={onSelectAnalyzer}
          icon={<Activity size={20} />}
          title="Movement Analyzer"
          badge="Beta"
          description="Upload a climbing clip and see a frame-by-frame skeleton overlay of your movement. Runs entirely on your device — no upload to a server."
          cta={analyzerCtaLabel}
        />
      </div>

      <p className="text-[11px] text-ink-muted mt-6 text-center max-w-md leading-relaxed">
        Educational only — not a medical diagnosis. If symptoms are severe or worsening, seek professional evaluation.
      </p>
    </div>
  )
}

function PickerCard({ accent, delay, onClick, icon, title, badge, description, meta, cta, ctaPrimary }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, delay, ease: [0.2, 0.7, 0.2, 1] }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`group ct-surface flex flex-col items-center text-center gap-3 px-5 py-6 hover:border-clay/40 transition-colors duration-150`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${accent.ring} ${accent.tint} ${accent.soft}`}>
        {icon}
      </div>
      <div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${accent.tint} ${accent.soft} border ${accent.ring}`}>
            {badge}
          </span>
        </div>
        <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
          {description}
        </p>
        {meta && (
          <p className="text-[10px] text-ink-muted mt-2">{meta}</p>
        )}
      </div>
      <span
        className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
          ctaPrimary
            ? 'bg-clay text-cream group-hover:brightness-105'
            : `bg-card border border-ct-rim text-ink group-hover:border-clay/50 group-hover:text-clay-deep`
        }`}
      >
        {cta}
        <ArrowRight size={12} />
      </span>
    </motion.button>
  )
}
