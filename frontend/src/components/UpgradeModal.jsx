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
  { icon: MessageSquare, text: 'Send video of your project — get a beta breakdown with technique + sequence ideas' },
  { icon: UserCircle2,   text: 'Direct 1:1 async messaging with Budnik — outdoor V13 boulderer, Momentum Houston routesetter (USAC L1 + L2 certified)' },
  { icon: Dumbbell,      text: 'Training plan shaped around your project, goals, and weaknesses' },
  { icon: Activity,      text: 'Injury and load-management calls when you need them' },
  { icon: Clock,         text: 'Includes the full app for the month' },
]

const PLAN_META = {
  pro: {
    label: 'Subscription',
    price: '$7.99',
    cadence: '/ month · 14-day free trial',
    headline: 'Keep your full access',
    sub: 'New accounts get 14 days of unlimited access. Subscribe to keep AI training plans, full rehab progressions, and unlimited AI chat after your trial ends.',
    benefits: PRO_BENEFITS,
    color: 'text-ct-terra-soft',
    bg: 'bg-ct-terra-tint',
    border: 'border-ct-terracotta/30',
    icon: Lock,
    note: 'Cancel anytime from your account settings.',
  },
  coaching: {
    label: 'Coaching',
    price: '$89',
    cadence: '/ month · application only',
    headline: 'Inside knowledge, climber to climber',
    sub: 'Send video of your project and get the kind of feedback that only comes from years inside the sport — beta breakdowns, technique fixes, and a training plan shaped around your weaknesses. Plus direct messaging for the calls an algorithm can\'t make: load management, return-to-climb, the small technique tweaks that change everything. Budnik climbs V13 outdoors, sets at Momentum Houston, and has spent a decade figuring out what works.',
    benefits: COACHING_BENEFITS,
    mailSubject: 'CoreTriage Coaching — Application',
    mailBody: "Hi Budnik, I'd like to apply for 1:1 coaching. A bit about me:\n\n- Current project / goal:\n- Climbing background (grades, years, disciplines):\n- What you'd want help with (beta breakdown, training plan, injury, technique):\n- Link to a recent project video (optional but recommended):\n\n",
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
      className="fixed inset-0 z-[110] flex items-center justify-center bg-bg/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.08 }}
        className="relative w-full max-w-sm mx-4 bg-ct-forest-deep border border-ct-hairline rounded-2xl shadow-xl p-6 space-y-5"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ct-cream/60 hover:text-ct-cream transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon + headline */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className={`w-14 h-14 rounded-2xl ${meta.bg} border ${meta.border} flex items-center justify-center`}>
            <Icon size={22} className={meta.color} />
          </div>
          <div>
            <h2 className="text-base font-bold text-ct-cream">{meta.headline}</h2>
            <p className="text-xs text-ct-cream/60 mt-1 max-w-[260px] mx-auto">{meta.sub}</p>
          </div>
        </div>

        {/* Price */}
        <div className="text-center">
          <span className={`text-2xl font-bold ${meta.color}`}>{meta.price}</span>
          <span className="text-sm text-ct-cream/60"> {meta.cadence}</span>
        </div>

        {/* Benefits */}
        <ul className="space-y-2.5">
          {meta.benefits.map(({ icon: BenefitIcon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <div className={`w-5 h-5 rounded-md ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5`}>
                <BenefitIcon size={11} className={meta.color} />
              </div>
              <span className="text-xs text-ct-cream/80 leading-relaxed">{text}</span>
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
                user ? 'Subscribe — $7.99/mo' : 'Sign in to subscribe'
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
            <p className="text-xs text-red-400 text-center">{checkoutError}</p>
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
          className="w-full flex items-center justify-center gap-1 text-[11px] text-ct-cream/50 hover:text-ct-cream/80 transition-colors"
        >
          {otherView === 'coaching' ? 'Want personal 1:1 coaching?' : 'Just want the app?'}
          <span className="font-medium text-ct-cream/80">{otherMeta.label} ({otherMeta.price}{otherView === 'coaching' ? '/mo' : '/mo'})</span>
          <ChevronRight size={10} />
        </button>

        <p className="text-[10px] text-center text-ct-cream/40 -mt-2">{meta.note}</p>
      </motion.div>
    </div>
  )
}
