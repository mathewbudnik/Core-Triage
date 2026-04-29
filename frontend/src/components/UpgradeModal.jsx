import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, FileText, Dumbbell, Clock, Activity, MessageSquare, UserCircle2, ChevronRight } from 'lucide-react'

const CORE_BENEFITS = [
  { icon: Dumbbell,     text: 'Full rehab protocols — all three phases' },
  { icon: FileText,     text: 'PDF triage reports — bring to your physio or doctor' },
  { icon: Clock,        text: 'Unlimited saved sessions & history' },
  { icon: Activity,     text: 'Unlimited AI chat' },
  { icon: MessageSquare, text: 'One training plan' },
]

const PRO_BENEFITS = [
  { icon: UserCircle2,  text: 'Direct 1:1 coaching from Mathew — async messaging' },
  { icon: Activity,     text: 'Personal injury review of your triage results' },
  { icon: Dumbbell,     text: 'Custom return-to-climb plan built around you' },
  { icon: MessageSquare, text: 'Unlimited training plans' },
  { icon: Clock,        text: 'Everything in Core' },
]

const TIER_META = {
  core: {
    label: 'Core',
    price: '$6',
    headline: 'Unlock the full rehab library',
    sub: 'Everything you need to rehab and train smarter.',
    benefits: CORE_BENEFITS,
    mailSubject: 'CoreTriage Core Tier — Waitlist',
    mailBody: "Hi, I'd like to join the Core tier waitlist.",
    cta: 'Join Core Waitlist',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/25',
  },
  pro: {
    label: 'Pro',
    price: '$14',
    headline: 'Work 1:1 with a climbing coach',
    sub: 'Get direct access to Mathew — real answers that an algorithm can\'t give you.',
    benefits: PRO_BENEFITS,
    mailSubject: 'CoreTriage Pro Coaching — Application',
    mailBody: "Hi Mathew, I'd like to apply for Pro coaching. Here's a bit about my situation:\n\n",
    cta: 'Apply for Coaching',
    color: 'text-accent3',
    bg: 'bg-accent3/10',
    border: 'border-accent3/25',
  },
}

function triggerToTier(trigger) {
  return trigger === 'coaching' ? 'pro' : 'core'
}

export default function UpgradeModal({ onClose, trigger = 'feature' }) {
  const [activeTier, setActiveTier] = useState(triggerToTier(trigger))
  const meta = TIER_META[activeTier]
  const otherTier = activeTier === 'core' ? 'pro' : 'core'
  const otherMeta = TIER_META[otherTier]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.12 }}
        className="relative w-full max-w-sm mx-4 bg-panel2 border border-outline rounded-2xl shadow-xl p-6 space-y-5"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon + headline */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className={`w-14 h-14 rounded-2xl ${meta.bg} border ${meta.border} flex items-center justify-center`}>
            {activeTier === 'pro'
              ? <UserCircle2 size={22} className={meta.color} />
              : <Lock size={22} className={meta.color} />
            }
          </div>
          <div>
            <h2 className="text-base font-bold text-text">{meta.headline}</h2>
            <p className="text-xs text-muted mt-1 max-w-[240px] mx-auto">{meta.sub}</p>
          </div>
        </div>

        {/* Price */}
        <div className="text-center">
          <span className={`text-2xl font-bold ${meta.color}`}>{meta.price}</span>
          <span className="text-sm text-muted"> / month · {meta.label}</span>
        </div>

        {/* Benefits */}
        <ul className="space-y-2.5">
          {meta.benefits.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <div className={`w-5 h-5 rounded-md ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon size={11} className={meta.color} />
              </div>
              <span className="text-xs text-muted leading-relaxed">{text}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="space-y-2 pt-1">
          <a
            href={`mailto:mathewbudnik@gmail.com?subject=${encodeURIComponent(meta.mailSubject)}&body=${encodeURIComponent(meta.mailBody)}`}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            {meta.cta}
          </a>
          <button
            onClick={onClose}
            className="btn-secondary w-full text-sm"
          >
            Maybe later
          </button>
        </div>

        {/* Cross-sell to other tier */}
        <button
          onClick={() => setActiveTier(otherTier)}
          className="w-full flex items-center justify-center gap-1 text-[11px] text-muted/60 hover:text-muted transition-colors"
        >
          {otherTier === 'pro' ? 'Want personal coaching?' : 'Just need the basics?'}
          <span className="font-medium text-muted">{otherMeta.label} ({otherMeta.price}/mo)</span>
          <ChevronRight size={10} />
        </button>

        <p className="text-[10px] text-center text-muted/50 -mt-2">
          No payment required — we'll reach out when ready.
        </p>
      </motion.div>
    </div>
  )
}
