import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Lock, FileText, Dumbbell, Clock, Activity, MessageSquare, UserCircle2, ChevronRight, Loader2 } from 'lucide-react'
import { createCheckoutSession } from '../api'

const PRO_BENEFITS = [
  { icon: Dumbbell,      text: 'Full rehab protocols — all three phases' },
  { icon: FileText,      text: 'PDF triage reports — bring to your physio or doctor' },
  { icon: Clock,         text: 'Unlimited saved sessions & history' },
  { icon: Activity,      text: 'Unlimited AI chat' },
  { icon: MessageSquare, text: 'AI-generated training plans' },
]

const COACHING_BENEFITS = [
  { icon: UserCircle2,   text: 'Direct 1:1 async messaging with Mathew' },
  { icon: Activity,      text: 'Personal review of your triage results' },
  { icon: Dumbbell,      text: 'Custom return-to-climb plan built around you' },
  { icon: Clock,         text: 'Includes everything in Pro for the month' },
]

const PLAN_META = {
  pro: {
    label: 'Pro',
    price: '$10',
    cadence: '/ month',
    headline: 'Unlock the full app',
    sub: 'Full rehab library, AI training plans, and PDF reports — everything you need to recover and train smarter.',
    benefits: PRO_BENEFITS,
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/25',
    icon: Lock,
    note: 'Cancel anytime from your account settings.',
  },
  coaching: {
    label: 'Coaching',
    price: '$89',
    cadence: '/ month · application only',
    headline: 'Work 1:1 with Mathew',
    sub: '1:1 coaching from an outdoor V13 boulderer and USAC-certified routesetter with over a decade of climbing experience. Personal injury review and a return-to-climb plan built around you. Apply and we\'ll talk.',
    benefits: COACHING_BENEFITS,
    mailSubject: 'CoreTriage Coaching — Application',
    mailBody: "Hi Mathew, I'd like to apply for 1:1 coaching. Here's a bit about my situation:\n\n- Injury / goal:\n- Climbing background:\n- What you'd want help with:\n\n",
    cta: 'Apply for Coaching',
    color: 'text-accent3',
    bg: 'bg-accent3/10',
    border: 'border-accent3/25',
    icon: UserCircle2,
    note: 'Application reviewed personally — limited spots available.',
  },
}

function triggerToView(trigger) {
  return trigger === 'coaching' ? 'coaching' : 'pro'
}

export default function UpgradeModal({ onClose, trigger = 'feature', user, onSignInClick }) {
  const [activeView, setActiveView] = useState(triggerToView(trigger))
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)
  const meta = PLAN_META[activeView]
  const otherView = activeView === 'pro' ? 'coaching' : 'pro'
  const otherMeta = PLAN_META[otherView]
  const Icon = meta.icon

  const handleSubscribe = async () => {
    setCheckoutError(null)
    if (!user) {
      onSignInClick && onSignInClick()
      return
    }
    setCheckoutLoading(true)
    try {
      const { url } = await createCheckoutSession('pro')
      window.location.href = url
    } catch (err) {
      setCheckoutError(err.message)
      setCheckoutLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.08 }}
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
            <Icon size={22} className={meta.color} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">{meta.headline}</h2>
            <p className="text-xs text-muted mt-1 max-w-[260px] mx-auto">{meta.sub}</p>
          </div>
        </div>

        {/* Price */}
        <div className="text-center">
          <span className={`text-2xl font-bold ${meta.color}`}>{meta.price}</span>
          <span className="text-sm text-muted"> {meta.cadence}</span>
        </div>

        {/* Benefits */}
        <ul className="space-y-2.5">
          {meta.benefits.map(({ icon: BenefitIcon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <div className={`w-5 h-5 rounded-md ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5`}>
                <BenefitIcon size={11} className={meta.color} />
              </div>
              <span className="text-xs text-muted leading-relaxed">{text}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="space-y-2 pt-1">
          {activeView === 'pro' ? (
            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {checkoutLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Opening checkout…</>
              ) : (
                user ? 'Subscribe — $10/mo' : 'Sign in to subscribe'
              )}
            </button>
          ) : (
            <a
              href={`mailto:mathewbudnik@gmail.com?subject=${encodeURIComponent(meta.mailSubject)}&body=${encodeURIComponent(meta.mailBody)}`}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              {meta.cta}
            </a>
          )}
          {checkoutError && (
            <p className="text-xs text-accent2 text-center">{checkoutError}</p>
          )}
          <button
            onClick={onClose}
            className="btn-secondary w-full text-sm"
          >
            Maybe later
          </button>
        </div>

        {/* Cross-sell to the other product */}
        <button
          onClick={() => setActiveView(otherView)}
          className="w-full flex items-center justify-center gap-1 text-[11px] text-muted/60 hover:text-muted transition-colors"
        >
          {otherView === 'coaching' ? 'Want personal 1:1 coaching?' : 'Just want the app?'}
          <span className="font-medium text-muted">{otherMeta.label} ({otherMeta.price}{otherView === 'coaching' ? '/mo' : '/mo'})</span>
          <ChevronRight size={10} />
        </button>

        <p className="text-[10px] text-center text-muted/50 -mt-2">{meta.note}</p>
      </motion.div>
    </div>
  )
}
