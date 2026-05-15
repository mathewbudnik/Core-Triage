import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check, EyeOff } from 'lucide-react'
import { saveProfile, setLeaderboardPrivate } from '../api'

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', sub: '< 2 years', desc: 'Learning movement fundamentals, building base fitness', years: 1 },
  { value: 'intermediate', label: 'Intermediate', sub: '2–5 years', desc: 'Consistent training, projecting moderates', years: 3 },
  { value: 'advanced', label: 'Advanced', sub: '5–10 years', desc: 'Structured training, chasing hard grades', years: 7 },
  { value: 'elite', label: 'Elite', sub: '10+ years', desc: 'High-performance training, competition or V10+ / 8b+', years: 12 },
]

const DISCIPLINES = [
  { value: 'bouldering', label: 'Bouldering', sub: 'Power & problem solving' },
  { value: 'sport', label: 'Sport', sub: 'Endurance & redpointing' },
  { value: 'trad', label: 'Trad', sub: 'Adventure & gear placement' },
  { value: 'competition', label: 'Competition', sub: 'Structured performance' },
]

const BOULDER_GRADES = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17']
const ROUTE_GRADES = ['5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a']

const EQUIPMENT = [
  { value: 'hangboard', label: 'Hangboard' },
  { value: 'home_wall', label: 'Home wall' },
  { value: 'gym_membership', label: 'Gym' },
  { value: 'outdoor_crag', label: 'Outdoor crag' },
  { value: 'campus_board', label: 'Campus board' },
  { value: 'system_wall', label: 'System wall' },
]

const WEAKNESSES = [
  { value: 'fingers', label: 'Finger strength' },
  { value: 'power', label: 'Power / contact' },
  { value: 'endurance', label: 'Endurance / pump' },
  { value: 'footwork', label: 'Footwork' },
  { value: 'mental', label: 'Mental game' },
  { value: 'core', label: 'Core tension' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'technique', label: 'Technique' },
]

const GOALS = [
  { value: 'grade_progression', label: 'Grade Progression', sub: 'Send a target grade' },
  { value: 'route_endurance', label: 'Route Endurance', sub: 'Link more, pump less' },
  { value: 'competition', label: 'Competition', sub: 'Peak for an event' },
  { value: 'injury_prevention', label: 'Injury Prevention', sub: 'Train smart, stay healthy' },
  { value: 'general', label: 'General Fitness', sub: 'Well-rounded improvement' },
]

const STEP_LABELS = ['Background', 'Grades', 'Logistics', 'Weaknesses', 'Goal']

function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < current
              ? 'w-2 h-2 bg-accent'
              : i === current
              ? 'w-4 h-2 bg-accent'
              : 'w-2 h-2 bg-outline'
          }`}
        />
      ))}
    </div>
  )
}

function OptionCard({ label, sub, desc, selected, onClick, accent = 'teal' }) {
  const accentClass = accent === 'coral'
    ? 'border-accent2 bg-accent2/10 shadow-[0_0_12px_rgba(251,113,133,0.15)]'
    : 'border-accent bg-accent/10 shadow-glow'
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-all duration-200 ${
        selected
          ? accentClass
          : 'border-outline bg-panel hover:border-accent/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={`text-sm font-semibold ${selected ? 'text-text' : 'text-text/80'}`}>{label}</p>
          {sub && <p className={`text-xs mt-0.5 ${selected ? 'text-muted' : 'text-muted/70'}`}>{sub}</p>}
          {desc && selected && <p className="text-xs text-muted mt-1">{desc}</p>}
        </div>
        {selected && <Check size={14} className="text-accent shrink-0" />}
      </div>
    </button>
  )
}

function MultiSelectChip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 ${
        selected
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-outline bg-panel text-muted hover:border-accent/40 hover:text-text'
      }`}
    >
      {label}
    </button>
  )
}

export default function ProfileSetup({ onComplete, user }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    experience_level: '',
    primary_discipline: '',
    max_grade_boulder: 'V4',
    max_grade_route: '5.11a',
    days_per_week: 3,
    session_length_min: 90,
    equipment: [],
    weaknesses: [],
    primary_goal: '',
    goal_grade: '',
  })

  // Leaderboard privacy is stored on the user row, not the profile. We
  // initialize from the current user state and PATCH it separately on
  // finish if it changed. Defaults to public (false) for first-time setup.
  const initialPrivate = !!user?.leaderboard_private
  const [leaderboardPrivate, setLeaderboardPrivateState] = useState(initialPrivate)

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function toggleList(key, val) {
    setForm((f) => {
      const cur = f[key]
      return { ...f, [key]: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val] }
    })
  }

  function canAdvance() {
    if (step === 0) return form.experience_level && form.primary_discipline
    if (step === 4) return !!form.primary_goal
    return true
  }

  async function handleFinish() {
    setSaving(true)
    setError(null)
    try {
      const years_climbing = EXPERIENCE_LEVELS.find((l) => l.value === form.experience_level)?.years ?? 3
      const payload = { ...form, years_climbing }
      await saveProfile(payload)
      // Persist privacy only when it changed — avoids an unnecessary PATCH.
      if (leaderboardPrivate !== initialPrivate) {
        try { await setLeaderboardPrivate(leaderboardPrivate) } catch (_) {
          // Non-fatal — profile is already saved. The toggle will look
          // out-of-sync until the next /me refresh; acceptable.
        }
      }
      onComplete(payload)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const steps = [
    // Step 0: Background
    <div key="bg" className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Experience level</p>
        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map((o) => (
            <OptionCard
              key={o.value}
              label={o.label}
              sub={o.sub}
              desc={o.desc}
              selected={form.experience_level === o.value}
              onClick={() => set('experience_level', o.value)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Primary discipline</p>
        <div className="grid grid-cols-2 gap-2">
          {DISCIPLINES.map((o) => (
            <OptionCard
              key={o.value}
              label={o.label}
              sub={o.sub}
              selected={form.primary_discipline === o.value}
              onClick={() => set('primary_discipline', o.value)}
            />
          ))}
        </div>
      </div>
    </div>,

    // Step 1: Grades
    <div key="grades" className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Max boulder grade</p>
          <span className="text-sm font-bold text-accent">{form.max_grade_boulder}</span>
        </div>
        <input
          type="range"
          min={0}
          max={BOULDER_GRADES.length - 1}
          value={BOULDER_GRADES.indexOf(form.max_grade_boulder)}
          onChange={(e) => set('max_grade_boulder', BOULDER_GRADES[+e.target.value])}
          className="w-full accent-teal-400"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>V0</span><span>V8</span><span>V17</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Max route grade</p>
          <span className="text-sm font-bold text-accent">{form.max_grade_route}</span>
        </div>
        <input
          type="range"
          min={0}
          max={ROUTE_GRADES.length - 1}
          value={ROUTE_GRADES.indexOf(form.max_grade_route)}
          onChange={(e) => set('max_grade_route', ROUTE_GRADES[+e.target.value])}
          className="w-full accent-teal-400"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>5.9</span><span>5.12a</span><span>5.15a</span>
        </div>
      </div>
    </div>,

    // Step 2: Logistics
    <div key="logistics" className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Training days / week</p>
          <span className="text-sm font-bold text-accent">{form.days_per_week} day{form.days_per_week !== 1 ? 's' : ''}</span>
        </div>
        <input
          type="range"
          min={1}
          max={6}
          value={form.days_per_week}
          onChange={(e) => set('days_per_week', +e.target.value)}
          className="w-full accent-teal-400"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>1</span><span>3</span><span>6</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Session length</p>
          <span className="text-sm font-bold text-accent">{form.session_length_min} min</span>
        </div>
        <input
          type="range"
          min={30}
          max={180}
          step={15}
          value={form.session_length_min}
          onChange={(e) => set('session_length_min', +e.target.value)}
          className="w-full accent-teal-400"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>30 min</span><span>90 min</span><span>3 hr</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Available equipment</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => (
            <MultiSelectChip
              key={e.value}
              label={e.label}
              selected={form.equipment.includes(e.value)}
              onClick={() => toggleList('equipment', e.value)}
            />
          ))}
        </div>
      </div>
    </div>,

    // Step 3: Weaknesses
    <div key="weaknesses" className="space-y-4">
      <p className="text-sm text-muted">
        Select the areas you most want to improve. Your plan will emphasise these.
      </p>
      <div className="flex flex-wrap gap-2">
        {WEAKNESSES.map((w) => (
          <MultiSelectChip
            key={w.value}
            label={w.label}
            selected={form.weaknesses.includes(w.value)}
            onClick={() => toggleList('weaknesses', w.value)}
          />
        ))}
      </div>
    </div>,

    // Step 4: Goal
    <div key="goal" className="space-y-3">
      {GOALS.map((g) => (
        <OptionCard
          key={g.value}
          label={g.label}
          sub={g.sub}
          selected={form.primary_goal === g.value}
          onClick={() => set('primary_goal', g.value)}
        />
      ))}
      {form.primary_goal === 'grade_progression' && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3"
        >
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Target grade (optional)</p>
          <input
            type="text"
            placeholder="e.g. V8 or 5.13a"
            value={form.goal_grade}
            onChange={(e) => set('goal_grade', e.target.value)}
            className="w-full bg-transparent border-b border-outline text-sm text-text placeholder:text-muted/50 pb-1 outline-none focus:border-accent"
          />
        </motion.div>
      )}

      {/* Leaderboard privacy — saved to user row on Finish, not part of the
          profile payload. Stats still aggregate into the cohort either way; the
          toggle only hides the display name on public leaderboards. */}
      <label
        className="flex items-start gap-3 px-4 py-3 rounded-xl border border-outline bg-panel hover:border-accent/30 transition-colors cursor-pointer"
      >
        <input
          type="checkbox"
          checked={leaderboardPrivate}
          onChange={(e) => setLeaderboardPrivateState(e.target.checked)}
          className="mt-0.5 accent-teal-400 shrink-0"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <EyeOff size={12} className="text-muted" />
            <p className="text-sm font-medium text-text">Hide my name on leaderboards</p>
          </div>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Your stats still count toward the cohort comparison — your row just shows as <span className="text-text">Private climber</span> instead of your display name.
          </p>
        </div>
      </label>
    </div>,
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted">{STEP_LABELS[step]} · {step + 1} of {steps.length}</p>
          <StepDots total={steps.length} current={step} />
        </div>
        <h2 className="text-xl font-bold text-text">
          {step === 0 && 'Tell us about your climbing'}
          {step === 1 && 'What are your current grades?'}
          {step === 2 && 'Training logistics'}
          {step === 3 && 'What do you want to improve?'}
          {step === 4 && 'What\'s your primary goal?'}
        </h2>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p className="mt-4 text-xs text-accent2">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={!canAdvance() || saving}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Build my plan'}
            {!saving && <Check size={15} />}
          </button>
        )}
      </div>
    </div>
  )
}
