import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, MessageSquare, ChevronRight, Mountain, Dumbbell, UserCircle2, ArrowRight, CheckCircle, Stethoscope } from 'lucide-react'
import Logo from './Logo'
import UpgradeModal from './UpgradeModal'

const FEATURES = [
  {
    icon: Dumbbell,
    color: 'text-ct-terra-soft',
    bg: 'bg-ct-terracotta/10 border-ct-terracotta/20',
    glow: 'hover:border-ct-terracotta/50 hover:bg-ct-terracotta/15',
    title: 'Training Plans',
    desc: 'Personalised 4-week climbing plans built around your goals, current grades, available days, and injury history. Adapts as you progress — from base-building to projecting.',
    tab: 'train',
    cta: 'Build my plan',
  },
  {
    icon: Stethoscope,
    color: 'text-ct-terra-soft',
    bg: 'bg-ct-terracotta/10 border-ct-terracotta/20',
    glow: 'hover:border-ct-terracotta/50 hover:bg-ct-terracotta/15',
    title: 'Recover',
    desc: 'Quick injury screen and phase-based rehab in one place. Daily-reset checkoffs so the plan stays alive between sessions — open the app, see today\'s exercises, tick them off.',
    tab: 'recover',
    cta: 'Run a screen',
  },
  {
    icon: MessageSquare,
    color: 'text-ct-terra-soft',
    bg: 'bg-ct-terracotta/10 border-ct-terracotta/20',
    glow: 'hover:border-ct-terracotta/40 hover:bg-ct-terracotta/12',
    title: 'AI Assistant',
    desc: 'Ask anything about training, climbing injuries, load management, or recovery — backed by a curated climbing-specific knowledge base.',
    tab: 'chat',
    cta: 'Ask a question',
  },
]

const COACHING_INCLUDES = [
  'Video beta breakdown — send a project, get technique + sequence ideas',
  'Training plan shaped around your project and weaknesses',
  'Direct 1:1 async messaging with an outdoor V13 boulderer',
  'Injury + load-management calls when you need them',
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Landing({ onEnter }) {
  const [showCoaching, setShowCoaching] = useState(false)

  return (
    <div className="min-h-screen bg-ct-forest-deep flex flex-col relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-ct-terracotta/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-ct-terra-soft/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-ct-moss/6 rounded-full blur-3xl" />
      </div>

      {/* Nav bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-ct-hairline bg-ct-forest/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Logo size={32} dark />
          <span className="font-bold text-ct-cream">CoreTriage</span>
        </div>
        <button
          onClick={() => onEnter()}
          className="bg-ct-terracotta text-ct-cream flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-semibold hover:bg-ct-terracotta/90 transition-colors"
        >
          Open App <ChevronRight size={15} />
        </button>
      </nav>

      {/* Hero */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16 md:py-24"
      >
        {/* Badge */}
        <motion.div variants={item} className="mb-6">
          <span className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full border border-ct-terracotta/30 bg-ct-terracotta/10 text-ct-terra-soft">
            <Mountain size={12} />
            Built for climbers, by climbers
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="ct-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-4"
        >
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, #f0a875, #f0f5ed, #d97757)' }}
          >
            Train. Recover. Progress.
          </span>
          <br />
          <span className="text-ct-cream">Built for climbing.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={item}
          className="text-ct-cream/80 text-base md:text-lg max-w-xl leading-relaxed mb-3"
        >
          Personalised training plans, injury triage and rehab, and 1:1 coaching from an outdoor V13 boulderer — three tools every climber needs, in one app.
        </motion.p>

        {/* Tagline pill */}
        <motion.p variants={item} className="text-xs text-ct-cream/50 mb-10">
          Plans · Triage · Rehab · Coaching · Built by an outdoor V13 boulderer
        </motion.p>

        {/* CTA */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 items-center mb-16">
          <button
            onClick={() => onEnter('triage')}
            className="bg-ct-terracotta text-ct-cream flex items-center gap-2 text-base px-8 py-3 rounded-lg font-semibold hover:bg-ct-terracotta/90 transition-colors"
          >
            Start Triage <ChevronRight size={16} />
          </button>
          <p className="text-xs text-ct-cream/60">Free to use · No account needed</p>
        </motion.div>

        {/* Feature cards — clickable */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl w-full text-left"
        >
          {FEATURES.map((f) => (
            <button
              key={f.title}
              onClick={() => onEnter(f.tab)}
              className={`ct-surface p-4 flex flex-col gap-3 text-left transition-all duration-200 cursor-pointer group border border-ct-hairline ${f.glow}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${f.bg}`}>
                  <f.icon size={16} className={f.color} />
                </div>
                <ArrowRight size={14} className="text-ct-cream/30 group-hover:text-ct-cream/60 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ct-cream">{f.title}</p>
                <p className="text-xs text-ct-cream/60 mt-1 leading-relaxed">{f.desc}</p>
              </div>
              <p className={`text-xs font-medium ${f.color} flex items-center gap-1`}>
                {f.cta} <ChevronRight size={11} />
              </p>
            </button>
          ))}
        </motion.div>

        {/* Coaching section */}
        <motion.div variants={item} className="mt-10 max-w-3xl w-full">
          <div className="relative rounded-2xl border border-ct-terracotta/30 bg-gradient-to-br from-ct-terracotta/8 to-ct-forest/5 p-6 md:p-8 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-ct-terracotta/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-ct-terracotta/15 text-ct-terra-soft border border-ct-terracotta/25">
                  <UserCircle2 size={11} />
                  1:1 Coaching · $89/mo
                </span>
                <span className="text-[11px] text-ct-cream/50">application only</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-ct-cream mb-2">
                Inside knowledge, climber to climber
              </h2>
              <p className="text-sm text-ct-cream/60 leading-relaxed mb-5 max-w-lg">
                Send video of your project and get the kind of feedback that only comes from years inside the sport — a <span className="text-ct-cream font-medium">beta breakdown</span> with technique fixes and sequence ideas, plus a <span className="text-ct-cream font-medium">training plan shaped around your weaknesses</span>. Direct messaging covers everything an AI can't help with. Budnik climbs V13 outdoors, sets at Momentum Houston, and has spent a decade figuring out what actually works on the wall.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-6">
                {COACHING_INCLUDES.map((point) => (
                  <div key={point} className="flex items-start gap-2 text-xs text-ct-cream/60">
                    <CheckCircle size={12} className="text-ct-terra-soft shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowCoaching(true)}
                className="flex items-center gap-2 text-sm font-semibold text-ct-terra-soft hover:text-ct-terra-soft/80 transition-colors group"
              >
                Apply for coaching
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Injury areas */}
        <motion.div variants={item} className="mt-10 flex flex-wrap gap-2 justify-center">
          {[
            'Fingers', 'Wrist', 'Elbow', 'Triceps', 'Shoulder', 'Chest',
            'Upper Back', 'Lats', 'Lower Back',
            'Hip', 'Glutes', 'Hamstrings', 'Knee', 'Calves', 'Ankle', 'Neck',
          ].map((area) => (
            <button
              key={area}
              onClick={() => onEnter('recover')}
              className="text-xs bg-ct-forest border border-ct-hairline rounded-full px-3 py-1.5 text-ct-cream/60 hover:text-ct-terra-soft hover:border-ct-terracotta/40 transition-colors"
            >
              {area}
            </button>
          ))}
          <span className="text-xs text-ct-cream/30 self-center">injury areas covered</span>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-ct-hairline px-6 py-4 text-center text-xs text-ct-cream/30">
        CoreTriage is an educational tool and does not provide medical diagnosis or treatment.
      </footer>

      <AnimatePresence>
        {showCoaching && (
          <UpgradeModal onClose={() => setShowCoaching(false)} trigger="coaching" />
        )}
      </AnimatePresence>
    </div>
  )
}
