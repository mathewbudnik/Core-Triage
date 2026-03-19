import { motion } from 'framer-motion'
import { Activity, Shield, Search, MessageSquare, ChevronRight, Mountain } from 'lucide-react'

const FEATURES = [
  {
    icon: Shield,
    color: 'text-accent2',
    bg: 'bg-accent2/10 border-accent2/20',
    title: 'Red Flag Screening',
    desc: 'Instantly flags symptoms that need professional evaluation.',
  },
  {
    icon: Search,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    title: 'Injury Pattern Matching',
    desc: 'Identifies common climbing injury patterns by region and mechanism.',
  },
  {
    icon: MessageSquare,
    color: 'text-accent3',
    bg: 'bg-accent3/10 border-accent3/20',
    title: 'AI Chat Assistant',
    desc: 'Ask questions about symptoms, load management, and return to climbing.',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
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
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-glow">
            <Activity size={14} className="text-bg" />
          </div>
          <span className="font-bold text-text">CoreTriage</span>
        </div>
        <button
          onClick={onEnter}
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
          Answer a few questions about your injury and get conservative, climbing-specific guidance
          — red flag screening, likely injury patterns, and a return-to-climb plan.
        </motion.p>

        {/* Disclaimer pill */}
        <motion.p
          variants={item}
          className="text-xs text-muted/60 mb-10"
        >
          Educational only · Not a medical diagnosis · Always seek professional evaluation if unsure
        </motion.p>

        {/* CTA */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 items-center">
          <button
            onClick={onEnter}
            className="btn-primary flex items-center gap-2 text-base px-8 py-3"
          >
            Start Triage <ChevronRight size={16} />
          </button>
          <p className="text-xs text-muted">Free to use · No account needed</p>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl w-full text-left"
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${f.bg}`}>
                <f.icon size={16} className={f.color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">{f.title}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Injury areas */}
        <motion.div variants={item} className="mt-10 flex flex-wrap gap-2 justify-center">
          {['Fingers', 'Wrist', 'Elbow', 'Shoulder'].map((area) => (
            <span
              key={area}
              className="text-xs bg-panel border border-outline rounded-full px-3 py-1.5 text-muted"
            >
              {area}
            </span>
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
