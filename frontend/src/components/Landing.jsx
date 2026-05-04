import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, MessageSquare, ChevronRight, Mountain, Dumbbell, UserCircle2, ArrowRight, CheckCircle, Stethoscope } from 'lucide-react'
import Logo from './Logo'
import UpgradeModal from './UpgradeModal'

const FEATURES = [
  {
    icon: Dumbbell,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    glow: 'hover:border-accent/50 hover:bg-accent/15',
    title: 'Training Plans',
    desc: 'Personalised 4-week climbing plans built around your goals, current grades, available days, and injury history. Adapts as you progress — from base-building to projecting.',
    tab: 'train',
    cta: 'Build my plan',
  },
  {
    icon: Shield,
    color: 'text-accent2',
    bg: 'bg-accent2/10 border-accent2/20',
    glow: 'hover:border-accent2/50 hover:bg-accent2/15',
    title: 'Injury Triage',
    desc: 'Hurt yourself? Answer a few questions and get red flag screening, likely injury patterns, and a return-to-climb plan — designed for climbing-specific mechanics.',
    tab: 'triage',
    cta: 'Start triage',
  },
  {
    icon: Stethoscope,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    glow: 'hover:border-accent/50 hover:bg-accent/15',
    title: 'Rehab Library',
    desc: 'Week-by-week exercise protocols for every injury area — gentle Phase 1 exercises free for everyone, full periodised rehab for Pro.',
    tab: 'rehab',
    cta: 'Browse exercises',
  },
  {
    icon: MessageSquare,
    color: 'text-accent3',
    bg: 'bg-accent3/10 border-accent3/20',
    glow: 'hover:border-accent3/40 hover:bg-accent3/12',
    title: 'AI Assistant',
    desc: 'Ask anything about training, climbing injuries, load management, or recovery — backed by a curated climbing-specific knowledge base.',
    tab: 'chat',
    cta: 'Ask a question',
  },
]

const COACHING_INCLUDES = [
  'Personal review of your triage results',
  'Custom return-to-climb timeline',
  'Direct async messaging — real answers',
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
    <div className="min-h-screen bg-bg flex flex-col relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-accent2/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-accent3/6 rounded-full blur-3xl" />
      </div>

      {/* Nav bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-outline bg-panel2/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Logo size={32} dark />
          <span className="font-bold text-text">CoreTriage</span>
        </div>
        <button
          onClick={() => onEnter()}
          className="btn-primary flex items-center gap-1.5 text-sm"
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
          <span className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent">
            <Mountain size={12} />
            Built for climbers, by climbers
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-4"
        >
          <span className="bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
            Train. Recover. Progress.
          </span>
          <br />
          <span className="text-text">Built for climbing.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={item}
          className="text-muted text-base md:text-lg max-w-xl leading-relaxed mb-3"
        >
          Personalised training plans, injury triage and rehab, and 1:1 coaching from an outdoor V13 boulderer — three tools every climber needs, in one app.
        </motion.p>

        {/* Disclaimer pill */}
        <motion.p variants={item} className="text-xs text-muted/60 mb-10">
          Educational only · Not a medical diagnosis · Always seek professional evaluation if unsure
        </motion.p>

        {/* CTA */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 items-center mb-16">
          <button
            onClick={() => onEnter('triage')}
            className="btn-primary flex items-center gap-2 text-base px-8 py-3"
          >
            Start Triage <ChevronRight size={16} />
          </button>
          <p className="text-xs text-muted">Free to use · No account needed</p>
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
              className={`card flex flex-col gap-3 text-left transition-all duration-200 cursor-pointer group border border-outline ${f.glow}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${f.bg}`}>
                  <f.icon size={16} className={f.color} />
                </div>
                <ArrowRight size={14} className="text-muted/40 group-hover:text-muted group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">{f.title}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{f.desc}</p>
              </div>
              <p className={`text-xs font-medium ${f.color} flex items-center gap-1`}>
                {f.cta} <ChevronRight size={11} />
              </p>
            </button>
          ))}
        </motion.div>

        {/* Coaching section */}
        <motion.div variants={item} className="mt-10 max-w-3xl w-full">
          <div className="relative rounded-2xl border border-accent3/30 bg-gradient-to-br from-accent3/8 to-accent/5 p-6 md:p-8 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent3/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent3/15 text-accent3 border border-accent3/25">
                  <UserCircle2 size={11} />
                  1:1 Coaching · $89/mo
                </span>
                <span className="text-[11px] text-muted/70">application only</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-text mb-2">
                Work 1:1 with a climbing coach
              </h2>
              <p className="text-sm text-muted leading-relaxed mb-5 max-w-lg">
                Not an algorithm. Mathew is an outdoor V13 boulderer, USAC-certified routesetter at Momentum, and coach with over a decade of climbing experience. Get your triage results reviewed, a plan built around your actual schedule, and direct access for the questions an AI can't answer.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mb-6">
                {COACHING_INCLUDES.map((point) => (
                  <div key={point} className="flex items-center gap-2 text-xs text-muted">
                    <CheckCircle size={12} className="text-accent3 shrink-0" />
                    {point}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowCoaching(true)}
                className="flex items-center gap-2 text-sm font-semibold text-accent3 hover:text-accent3/80 transition-colors group"
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
              onClick={() => onEnter('triage')}
              className="text-xs bg-panel border border-outline rounded-full px-3 py-1.5 text-muted hover:text-accent hover:border-accent/40 transition-colors"
            >
              {area}
            </button>
          ))}
          <span className="text-xs text-muted/50 self-center">injury areas covered</span>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-outline px-6 py-4 text-center text-xs text-muted/50">
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
