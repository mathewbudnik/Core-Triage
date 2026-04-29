import { motion } from 'framer-motion'
import { Shield, Dumbbell, MessageSquare, UserCircle2, AlertTriangle, Mountain, Heart } from 'lucide-react'
import Logo from './Logo'

const FEATURES = [
  {
    icon: Shield,
    color: 'text-accent2',
    bg: 'bg-accent2/10 border-accent2/20',
    title: 'Injury Triage',
    desc: 'Step through a guided intake to screen for red flags, identify likely injury patterns, and get a conservative return-to-climbing plan — all tailored to climbing-specific mechanics.',
  },
  {
    icon: Dumbbell,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    title: 'Personalised Training Plans',
    desc: 'Build a 4-week training plan around your goals, current grade, available days, and injury history. Plans adapt to your level — from beginner to advanced — with full exercise detail and rest periods.',
  },
  {
    icon: UserCircle2,
    color: 'text-accent3',
    bg: 'bg-accent3/10 border-accent3/20',
    title: 'Coach Chat',
    desc: 'Message directly with an experienced climber and routesetter. Get personalised advice on training, technique, and recovery — not an AI, a real person who has been climbing for nearly a decade.',
  },
  {
    icon: MessageSquare,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
    title: 'AI Knowledge Base',
    desc: 'Ask anything about climbing injuries, load management, and rehab. Responses are grounded in a curated climbing-specific knowledge base and kept intentionally conservative.',
  },
]

const INJURY_AREAS = [
  'Fingers', 'Wrist', 'Elbow', 'Shoulder', 'Chest',
  'Hip', 'Knee', 'Ankle', 'Lower Back',
]

export default function AboutTab() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <Logo size={40} dark />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
            CoreTriage
          </h2>
        </div>
        <p className="text-muted leading-relaxed max-w-2xl">
          CoreTriage helps climbers navigate injury — from the moment something goes wrong to getting back on the wall stronger. Built by climbers, for climbers.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted/60">
          <Mountain size={12} />
          <span>Educational only · Not a medical diagnosis · Always seek professional evaluation if unsure</span>
        </div>
      </motion.div>

      {/* What we cover */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">What CoreTriage covers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card flex gap-4"
            >
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${f.bg}`}>
                <f.icon size={16} className={f.color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">{f.title}</p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Injury areas */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">Injury areas covered</h3>
        <div className="flex flex-wrap gap-2">
          {INJURY_AREAS.map((area) => (
            <span
              key={area}
              className="text-xs bg-panel border border-outline rounded-full px-3 py-1.5 text-muted"
            >
              {area}
            </span>
          ))}
        </div>
      </div>

      {/* Coach bio */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-panel border border-outline rounded-xl p-6 flex gap-5"
      >
        <div className="w-10 h-10 rounded-xl bg-accent3/20 border border-accent3/30 flex items-center justify-center shrink-0">
          <UserCircle2 size={20} className="text-accent3" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text mb-1">About the Coach</p>
          <p className="text-xs text-muted leading-relaxed">
            Mathew has been climbing for nearly a decade across bouldering, sport, and competition formats. As a routesetter and coach he has worked with climbers at all levels — from first-timers to regional competitors. The Coach Chat feature connects you directly with him for advice on training, technique, injury management, and getting back on the wall safely.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-accent3">
            <Heart size={11} />
            <span>Real person · Not an AI · Typically responds within 24 hours</span>
          </div>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-accent3/5 border border-accent3/20 rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={13} className="text-accent3" />
          <p className="text-xs font-semibold text-accent3 uppercase tracking-wide">Important Disclaimer</p>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          CoreTriage is an educational tool and does not provide medical diagnosis or treatment. Guidance is intentionally conservative and designed to support appropriate medical referral when needed. If your symptoms are severe, worsening, involve neurological signs, or follow significant trauma — seek professional evaluation immediately. Do not delay medical care based on anything in this app.
        </p>
      </motion.div>
    </div>
  )
}
