import { motion } from 'framer-motion'
import { Shield, MessageSquare, ChevronRight, Mountain, Dumbbell, UserCircle2, ArrowRight } from 'lucide-react'
import Logo from './Logo'

const FEATURES = [
  {
    icon: Shield,
    color: 'text-accent2',
    bg: 'bg-accent2/10 border-accent2/20',
    glow: 'hover:border-accent2/50 hover:bg-accent2/15',
    title: 'Injury Triage',
    desc: 'Answer a few questions and get red flag screening, likely injury patterns, and a return-to-climb plan.',
    tab: 'triage',
    cta: 'Start triage',
  },
  {
    icon: Dumbbell,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    glow: 'hover:border-accent/50 hover:bg-accent/15',
    title: 'Training Plans',
    desc: 'Get a personalised 4-week climbing plan built around your goals, grades, and injury history.',
    tab: 'train',
    cta: 'Build my plan',
  },
  {
    icon: UserCircle2,
    color: 'text-accent3',
    bg: 'bg-accent3/10 border-accent3/20',
    glow: 'hover:border-accent3/50 hover:bg-accent3/15',
    title: 'Coach Chat',
    desc: 'Get advice from a climber and routesetter with nearly a decade of experience. Message directly for a plan built around you.',
    tab: 'chat',
    cta: 'Message the coach',
  },
  {
    icon: MessageSquare,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    glow: 'hover:border-accent/40 hover:bg-accent/12',
    title: 'AI Knowledge Base',
    desc: 'Ask anything about climbing injuries, load management, and rehab — backed by a curated knowledge base.',
    tab: 'chat',
    cta: 'Ask a question',
  },
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
            Injury triage
          </span>
          <br />
          <span className="text-text">built for climbing.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={item}
          className="text-muted text-base md:text-lg max-w-xl leading-relaxed mb-3"
        >
          From injury triage to personalised training plans — everything a climber needs to get back on the wall and keep progressing.
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

        {/* Injury areas */}
        <motion.div variants={item} className="mt-10 flex flex-wrap gap-2 justify-center">
          {['Fingers', 'Wrist', 'Elbow', 'Shoulder', 'Knee', 'Hip', 'Lower Back'].map((area) => (
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
    </div>
  )
}
