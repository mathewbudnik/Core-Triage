import { motion } from 'framer-motion'
import { Shield, Dumbbell, MessageSquare, UserCircle2, AlertTriangle, Mountain, Heart, Stethoscope } from 'lucide-react'
import Logo from './Logo'

const FEATURES = [
  {
    icon: Dumbbell,
    color: 'text-ct-terracotta',
    bg: 'bg-ct-terra-tint border-ct-terracotta/20',
    title: 'Personalised Training Plans',
    desc: 'Build a 4-week training plan around your goals, current grade, available days, and injury history. Plans adapt to your level — from base-building to limit projects — with full exercise detail, rest periods, and progression cues.',
  },
  {
    icon: Shield,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    title: 'Injury Triage',
    desc: 'Step through a guided intake to screen for red flags, identify likely injury patterns, and get a conservative return-to-climbing plan — tailored to climbing-specific mechanics like crimp loading, heel hooks, and dynamic catches.',
  },
  {
    icon: Stethoscope,
    color: 'text-ct-terracotta',
    bg: 'bg-ct-terra-tint border-ct-terracotta/20',
    title: 'Rehab Library',
    desc: 'Week-by-week exercise protocols for every injury area. Phase 1 (gentle reactivation) is always free; Phase 2 and 3 (progressive loading and sport-specific reload) are part of the subscription — included in your 14-day free trial.',
  },
  {
    icon: UserCircle2,
    color: 'text-ct-terra-soft',
    bg: 'bg-ct-terra-tint border-ct-terracotta/20',
    title: 'Coach Chat',
    desc: 'Direct messaging with an outdoor V13 boulderer and USAC-certified routesetter with over a decade of climbing experience. Personalised advice on training, technique, and recovery — not an AI, a real climber who has lived through the injuries you\'re working through.',
  },
  {
    icon: MessageSquare,
    color: 'text-ct-terracotta',
    bg: 'bg-ct-terra-tint border-ct-terracotta/20',
    title: 'AI Knowledge Base',
    desc: 'Ask anything about training, climbing injuries, load management, and rehab. Responses are grounded in a curated climbing-specific knowledge base and kept intentionally conservative.',
  },
]

const INJURY_AREAS = [
  // Upper body
  'Fingers', 'Wrist', 'Elbow', 'Triceps', 'Shoulder', 'Chest',
  // Trunk
  'Abs', 'Upper Back', 'Lats', 'Lower Back',
  // Lower body
  'Hip', 'Glutes', 'Hamstrings', 'Knee', 'Calves', 'Ankle',
  // Cervical
  'Neck',
]

export default function AboutTab() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <Logo size={40} dark />
          <h2
            className="text-3xl font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, #d97757, #f0a875, #f0f5ed)' }}
          >
            CoreTriage
          </h2>
        </div>
        <p className="text-ink-soft leading-relaxed max-w-2xl">
          CoreTriage is the complete app for climbers — <span className="text-ct-cream font-medium">personalised training plans</span>, <span className="text-ct-cream font-medium">injury triage and rehab</span>, and <span className="text-ct-cream font-medium">1:1 coaching</span>. Whether you're chasing your next grade, working through an injury, or both at once, it's all built around climbing-specific demands. Built by climbers, for climbers.
        </p>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Mountain size={12} />
          <span>Built by an outdoor V13 boulderer · Climbing-specific from the ground up</span>
        </div>
      </motion.div>

      {/* What we cover */}
      <div>
        <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-4">What CoreTriage covers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="ct-surface p-4 flex gap-4"
            >
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${f.bg}`}>
                <f.icon size={16} className={f.color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ct-cream">{f.title}</p>
                <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Injury areas */}
      <div>
        <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-4">Injury areas covered</h3>
        <div className="flex flex-wrap gap-2">
          {INJURY_AREAS.map((area) => (
            <span
              key={area}
              className="text-xs bg-ct-hairline border border-ct-rim rounded-full px-3 py-1.5 text-ink-soft"
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
        className="ct-surface p-6 flex gap-5"
      >
        <div className="w-10 h-10 rounded-xl bg-ct-terra-tint border border-ct-terracotta/30 flex items-center justify-center shrink-0">
          <UserCircle2 size={20} className="text-ct-terracotta" />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ct-cream">About the Coach</p>

          <p className="text-xs text-ink-soft leading-relaxed">
            Budnik is an <span className="text-ct-cream font-medium">outdoor V13 boulderer</span> with over a decade of climbing experience across bouldering, sport, and competition. He's been <span className="text-ct-cream font-medium">routesetting at Momentum Houston for the past five years</span>, holds <span className="text-ct-cream font-medium">USAC L1 and L2 routesetting certifications</span>, and has coached climbers from first-timers to regional competitors. That combination — climbing at a high level AND setting at scale — gives him a rare view of movement from both sides of the wall: how holds load the body, where positions force compromise, and why certain patterns chronically injure climbers.
          </p>

          <p className="text-xs text-ink-soft leading-relaxed">
            He's also lived through the injuries climbers actually get on the way up: the slow comeback from a pulley, the elbow flares that won't quite let go, the wrist that flares whenever volume creeps up. CoreTriage exists because he wished a tool like it had existed during his own rehabs.
          </p>

          <p className="text-xs text-ink-soft leading-relaxed">
            Coach Chat connects you directly with him for the work an algorithm can't do: <span className="text-ct-cream font-medium">beta breakdowns from video of your project</span>, a training plan shaped around it, plus async messaging for load management, return-to-climbing calls, and technique tweaks — feedback from an <span className="text-ct-cream font-medium">outdoor V13 boulderer</span> and USAC-certified routesetter who's been at this for a decade.
          </p>

          <div className="pt-1 flex items-center gap-1.5 text-xs text-ct-terra-soft">
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
        className="bg-ct-terra-tint border border-ct-terracotta/20 rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={13} className="text-ct-terra-soft" />
          <p className="text-xs font-semibold text-ct-terra-soft uppercase tracking-wide">Important Disclaimer</p>
        </div>
        <p className="text-sm text-ink-soft leading-relaxed">
          CoreTriage is an educational tool and does not provide medical diagnosis or treatment. Guidance is intentionally conservative and designed to support appropriate medical referral when needed. If your symptoms are severe, worsening, involve neurological signs, or follow significant trauma — seek professional evaluation immediately. Do not delay medical care based on anything in this app.
        </p>
      </motion.div>
    </div>
  )
}
