import { useMemo, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Loader2, ArrowRight, Sparkles } from 'lucide-react'
import { saveProfile, getTrainingLogs } from '../api'
import { deriveStyleProfile } from '../lib/styleProfile'
import { getStyleLabel } from '../lib/styleColors'
import { UnitToggle, MeasurementField, defaultUnit } from './Measurements'

// ── Static option data ─────────────────────────────────────────────────────
const EXPERIENCE_LEVELS = [
  { value: 'beginner',     label: 'Beginner',     sub: 'Less than 2 years',  years: 1  },
  { value: 'intermediate', label: 'Intermediate', sub: '2 to 5 years',       years: 3  },
  { value: 'advanced',     label: 'Advanced',     sub: '5 to 10 years',      years: 7  },
  { value: 'elite',        label: 'Elite',        sub: '10+ years',          years: 12 },
]

const DISCIPLINES = [
  { value: 'bouldering',  label: 'Bouldering',  sub: 'Power & problem solving' },
  { value: 'sport',       label: 'Sport',       sub: 'Endurance & redpointing' },
  { value: 'trad',        label: 'Trad',        sub: 'Adventure & gear placement' },
  { value: 'competition', label: 'Competition', sub: 'Structured performance' },
]

const BOULDER_GRADES = ['V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11','V12','V13','V14','V15','V16','V17']
const ROUTE_GRADES   = ['5.9','5.10a','5.10b','5.10c','5.10d','5.11a','5.11b','5.11c','5.11d','5.12a','5.12b','5.12c','5.12d','5.13a','5.13b','5.13c','5.13d','5.14a','5.14b','5.14c','5.14d','5.15a']

const EQUIPMENT = [
  { value: 'hangboard',      label: 'Hangboard' },
  { value: 'home_wall',      label: 'Home wall' },
  { value: 'gym_membership', label: 'Gym' },
  { value: 'outdoor_crag',   label: 'Outdoor crag' },
  { value: 'campus_board',   label: 'Campus board' },
  { value: 'system_wall',    label: 'System wall' },
]

const WEAKNESSES = [
  { value: 'fingers',     label: 'Finger strength' },
  { value: 'power',       label: 'Power / contact' },
  { value: 'endurance',   label: 'Endurance / pump' },
  { value: 'footwork',    label: 'Footwork' },
  { value: 'mental',      label: 'Mental game' },
  { value: 'core',        label: 'Core tension' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'technique',   label: 'Technique' },
]

const GOALS = [
  { value: 'grade_progression', label: 'Grade Progression', sub: 'Send a target grade' },
  { value: 'route_endurance',   label: 'Route Endurance',   sub: 'Link more, pump less' },
  { value: 'competition',       label: 'Competition',       sub: 'Peak for an event' },
  { value: 'injury_prevention', label: 'Injury Prevention', sub: 'Train smart, stay healthy' },
  { value: 'general',           label: 'General Fitness',   sub: 'Well-rounded improvement' },
]

const WEEKDAYS = [
  { value: 'monday',    short: 'M', long: 'Mon' },
  { value: 'tuesday',   short: 'T', long: 'Tue' },
  { value: 'wednesday', short: 'W', long: 'Wed' },
  { value: 'thursday',  short: 'T', long: 'Thu' },
  { value: 'friday',    short: 'F', long: 'Fri' },
  { value: 'saturday',  short: 'S', long: 'Sat' },
  { value: 'sunday',    short: 'S', long: 'Sun' },
]

// ── Reusable inline atoms ──────────────────────────────────────────────────
function ProgressBar({ pct }) {
  return (
    <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: '#d97757' }}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
      />
    </div>
  )
}

function StepHeader({ stepIndex, totalSteps, title, subtitle }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-ct-cream/60">
        Step {stepIndex + 1} of {totalSteps}
      </p>
      <h2 className="mt-2 text-[28px] sm:text-[30px] font-extrabold -tracking-[0.025em] leading-[1.1]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-[13px] font-semibold text-ct-cream/60 leading-snug">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// One row in a single-select list. Plain rows separated by hairlines.
function SelectRow({ label, sub, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="w-full flex items-center justify-between gap-3 py-4 px-1
                 text-left border-b-[0.5px] border-white/[0.06] last:border-b-0
                 hover:bg-white/[0.02] transition-colors"
    >
      <div className="min-w-0">
        <p className={`text-[15px] font-extrabold leading-tight ${selected ? '' : 'text-ct-cream'}`}
           style={selected ? { color: '#f0a875' } : {}}>
          {label}
        </p>
        {sub && (
          <p className="text-[12px] font-semibold text-ct-cream/50 leading-snug mt-1">
            {sub}
          </p>
        )}
      </div>
      <span
        aria-hidden="true"
        className="w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0
                   border-[1.5px]"
        style={selected
          ? { background: '#d97757', borderColor: '#d97757', color: '#f0f5ed' }
          : { borderColor: 'rgba(255,255,255,0.18)' }
        }
      >
        {selected && <Check size={13} strokeWidth={3} />}
      </span>
    </button>
  )
}

// Multi-select pill that lays out in a wrap grid.
function MultiPill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="px-3.5 py-2 rounded-full border-[0.5px] text-[12px] font-bold transition-colors"
      style={selected
        ? {
            background: 'rgba(217,119,87,0.14)',
            borderColor: 'rgba(217,119,87,0.45)',
            color: '#f0a875',
          }
        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)', color: '#e8e8ec' }
      }
    >
      {label}
    </button>
  )
}

// Grade slider — big tabular value above a tier-colored range input.
function GradeSlider({ value, options, onChange }) {
  const idx = Math.max(0, options.indexOf(value))
  return (
    <div className="px-1">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[28px] font-extrabold tabular-nums -tracking-[0.025em]"
           style={{ color: '#f0a875' }}>
          {value}
        </p>
        <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-ct-cream/40">
          {idx + 1} of {options.length}
        </p>
      </div>
      <input
        type="range"
        min={0}
        max={options.length - 1}
        value={idx}
        onChange={(e) => onChange(options[+e.target.value])}
        className="w-full"
        style={{ accentColor: '#d97757' }}
      />
      <div className="flex justify-between mt-2 text-[11px] font-bold text-ct-cream/40 tabular-nums">
        <span>{options[0]}</span>
        <span>{options[Math.floor(options.length / 2)]}</span>
        <span>{options[options.length - 1]}</span>
      </div>
    </div>
  )
}

// 7-day weekday picker (mirrors the TrainWeekStrip aesthetic).
function WeekdayPicker({ value, onToggle }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((d) => {
        const selected = value.includes(d.value)
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => onToggle(d.value)}
            aria-pressed={selected}
            className="flex flex-col items-center justify-center py-3 rounded-2xl
                       border-[0.5px] min-h-[60px] transition-colors"
            style={selected
              ? {
                  background: 'linear-gradient(180deg, rgba(217,119,87,0.18), rgba(217,119,87,0.04))',
                  borderColor: 'rgba(217,119,87,0.42)',
                }
              : { borderColor: 'transparent', background: 'transparent' }
            }
          >
            <span className="text-[10px] font-extrabold uppercase tracking-[0.06em]"
                  style={{ color: selected ? '#f0a875' : 'rgba(240,245,237,0.35)' }}>
              {d.short}
            </span>
            <span className="text-[13px] font-bold mt-1"
                  style={{ color: selected ? '#f0a875' : 'rgba(240,245,237,0.7)' }}>
              {d.long}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Numeric slider with a big value display (used for session length).
function NumberSlider({ value, min, max, step = 5, unit, onChange, hint }) {
  return (
    <div className="px-1">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[28px] font-extrabold tabular-nums -tracking-[0.025em]"
           style={{ color: '#f0a875' }}>
          {value} <span className="text-[14px] font-bold text-ct-cream/60">{unit}</span>
        </p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full"
        style={{ accentColor: '#d97757' }}
      />
      <div className="flex justify-between mt-2 text-[11px] font-bold text-ct-cream/40 tabular-nums">
        <span>{min} {unit}</span>
        <span>{Math.round((min + max) / 2)} {unit}</span>
        <span>{max} {unit}</span>
      </div>
      {hint && <p className="text-[11px] font-semibold text-ct-cream/40 mt-3 leading-snug">{hint}</p>}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
// 10 steps: experience, body, discipline, boulder grade, route grade,
// training days, session length, equipment, weaknesses, goal. The "body"
// step (1) collects height + ape index so they're available app-wide —
// Movement Analyzer uses them for body-relative rule calibration; future
// training-rec features will use them for grade normalization + reach.
const TOTAL_STEPS = 10

export default function ProfileSetup({ onComplete }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [logs, setLogs] = useState(null)   // null = not loaded; [] = loaded empty

  useEffect(() => {
    let cancelled = false
    getTrainingLogs(60)
      .then((data) => { if (!cancelled) setLogs(data || []) })
      .catch(() => { if (!cancelled) setLogs([]) })
    return () => { cancelled = true }
  }, [])

  const styleProfile = useMemo(
    () => logs ? deriveStyleProfile(logs) : null,
    [logs],
  )

  useEffect(() => {
    if (!styleProfile || styleProfile.confidence === 'low') return
    if (!styleProfile.weakest) return
    const map = { power: 'power', dynamic: 'power', technical: 'technique', endurance: 'endurance' }
    const w = map[styleProfile.weakest]
    if (!w) return
    setForm((f) =>
      f.weaknesses.includes(w) ? f : { ...f, weaknesses: [...f.weaknesses, w] }
    )
  }, [styleProfile])

  const [form, setForm] = useState({
    experience_level: '',
    primary_discipline: '',
    max_grade_boulder: 'V4',
    max_grade_route: '5.11a',
    training_days: ['monday', 'wednesday', 'saturday'],
    session_length_min: 90,
    equipment: [],
    weaknesses: [],
    primary_goal: '',
    goal_grade: '',
    // Body measurements — used by Movement Analyzer + future
    // training rec features. Stored as integer cm. Optional: the
    // wizard's body step can be skipped without blocking completion.
    height_cm: null,
    ape_index_cm: null,
    unit_preference: defaultUnit(),
  })

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  const toggleList = (key, val) => setForm((f) => {
    const cur = f[key] || []
    return { ...f, [key]: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val] }
  })

  // Per-step gating. Optional steps (body measurements, equipment,
  // weaknesses) always advance.
  function canAdvance() {
    switch (step) {
      case 0: return !!form.experience_level
      case 1: return true                                                  // body measurements optional
      case 2: return !!form.primary_discipline
      case 3: return !!form.max_grade_boulder
      case 4: return !!form.max_grade_route
      case 5: return (form.training_days?.length || 0) >= 1
      case 6: return !!form.session_length_min
      case 7: return true                                                  // equipment is optional
      case 8: return true                                                  // weaknesses is optional
      case 9: return !!form.primary_goal
      default: return false
    }
  }

  async function handleFinish() {
    setSaving(true)
    setError(null)
    try {
      const years_climbing = EXPERIENCE_LEVELS.find((l) => l.value === form.experience_level)?.years ?? 3
      const payload = { ...form, years_climbing }
      await saveProfile(payload)
      onComplete(payload)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  function next() {
    if (!canAdvance()) return
    if (step === TOTAL_STEPS - 1) { handleFinish(); return }
    setStep((s) => s + 1)
  }
  function back() {
    setStep((s) => Math.max(0, s - 1))
  }

  const pct = ((step + 1) / TOTAL_STEPS) * 100
  const isLast = step === TOTAL_STEPS - 1

  const stepBody = useMemo(() => {
    switch (step) {
      case 0: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="How long have you been climbing?"
                      subtitle="We'll calibrate sessions and intensity to your level." />
          <div>
            {EXPERIENCE_LEVELS.map((o) => (
              <SelectRow key={o.value} label={o.label} sub={o.sub}
                         selected={form.experience_level === o.value}
                         onClick={() => setField('experience_level', o.value)} />
            ))}
          </div>
        </>
      )
      case 1: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="A bit about your body"
                      subtitle="Used so the Movement Analyzer measures your technique relative to YOUR proportions — and so training reccs can normalize grade ranges to your reach. Optional." />
          <div className="flex items-center justify-end mb-3">
            <UnitToggle
              unit={form.unit_preference || 'cm'}
              onChange={(u) => setField('unit_preference', u)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MeasurementField
              label={`Height (${form.unit_preference || 'cm'})`}
              unit={form.unit_preference || 'cm'}
              valueCm={form.height_cm}
              placeholder={form.unit_preference === 'in' ? '69' : '175'}
              onCommitCm={(cm) => setField('height_cm', cm)}
            />
            <MeasurementField
              label={`Ape index (${form.unit_preference || 'cm'})`}
              hint="Arm span − height. Most climbers know this."
              unit={form.unit_preference || 'cm'}
              valueCm={form.ape_index_cm}
              placeholder="0"
              onCommitCm={(cm) => setField('ape_index_cm', cm)}
              allowNegative
            />
          </div>
          <p className="text-[11px] text-ct-cream/45 mt-3 leading-snug">
            Skip this if you don't have the numbers handy — you can fill them in later from the Movement Analyzer or your profile.
          </p>
        </>
      )
      case 2: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="What's your primary discipline?"
                      subtitle="Plans emphasise the skills your discipline rewards." />
          <div>
            {DISCIPLINES.map((o) => (
              <SelectRow key={o.value} label={o.label} sub={o.sub}
                         selected={form.primary_discipline === o.value}
                         onClick={() => setField('primary_discipline', o.value)} />
            ))}
          </div>
        </>
      )
      case 3: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="What's your hardest boulder send?"
                      subtitle="Roughly — the grade you've sent more than once." />
          <GradeSlider value={form.max_grade_boulder} options={BOULDER_GRADES}
                       onChange={(v) => setField('max_grade_boulder', v)} />
        </>
      )
      case 4: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="What's your hardest route send?"
                      subtitle="Slide to skip if you don't sport climb." />
          <GradeSlider value={form.max_grade_route} options={ROUTE_GRADES}
                       onChange={(v) => setField('max_grade_route', v)} />
        </>
      )
      case 5: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="Which days can you train?"
                      subtitle="Skip days you have work, family, or rest commitments — your plan won't schedule anything on those." />
          <WeekdayPicker value={form.training_days}
                         onToggle={(v) => toggleList('training_days', v)} />
          <p className="text-[12px] font-bold mt-4"
             style={{ color: '#f0a875' }}>
            {form.training_days.length} day{form.training_days.length === 1 ? '' : 's'} / week
          </p>
        </>
      )
      case 6: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="How long is a typical session?"
                      subtitle="We'll size each workout to fit." />
          <NumberSlider value={form.session_length_min} min={30} max={180} step={15} unit="min"
                        onChange={(v) => setField('session_length_min', v)}
                        hint="Includes warm-up and cool-down." />
        </>
      )
      case 7: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="What gear do you have access to?"
                      subtitle="Optional. Plans use what you select — leave blank for body-weight-only." />
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <MultiPill key={e.value} label={e.label}
                         selected={form.equipment.includes(e.value)}
                         onClick={() => toggleList('equipment', e.value)} />
            ))}
          </div>
        </>
      )
      case 8: {
        const conf = styleProfile?.confidence
        const weakLabel = getStyleLabel(styleProfile?.weakest)
        const domLabel  = getStyleLabel(styleProfile?.dominant)
        return (
          <>
            <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                        title="What do you want to improve?"
                        subtitle="Optional. Sessions will lean into these areas." />

            {conf === 'medium' && weakLabel && (
              <div className="mb-4 px-3.5 py-3 rounded-2xl
                              bg-[rgba(217,119,87,0.08)]
                              border-[0.5px] border-[rgba(217,119,87,0.22)]">
                <p className="text-[11.5px] font-semibold text-ct-cream/80 leading-snug">
                  Based on <b className="tabular-nums">{styleProfile.total}</b> tagged climbs, your
                  weakest style looks like <b style={{ color: '#f0a875' }}>{weakLabel}</b>.
                  We've pre-checked it — adjust if you disagree.
                </p>
              </div>
            )}

            {conf === 'high' && weakLabel && domLabel && (
              <div className="mb-4 px-3.5 py-3 rounded-2xl
                              bg-[rgba(217,119,87,0.08)]
                              border-[0.5px] border-[rgba(217,119,87,0.22)]">
                <p className="text-[11.5px] font-semibold text-ct-cream/80 leading-snug mb-2">
                  From <b className="tabular-nums">{styleProfile.total}</b> tagged climbs:
                  <b style={{ color: '#f0a875' }}> {domLabel}</b>-heavy,
                  <b style={{ color: '#f0a875' }}> {weakLabel}</b> is your gap.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {WEAKNESSES.map((w) => (
                <MultiPill key={w.value} label={w.label}
                           selected={form.weaknesses.includes(w.value)}
                           onClick={() => toggleList('weaknesses', w.value)} />
              ))}
            </div>
          </>
        )
      }
      case 9: return (
        <>
          <StepHeader stepIndex={step} totalSteps={TOTAL_STEPS}
                      title="What's your primary goal?"
                      subtitle="Pick the outcome you're aiming for over the next 4 weeks." />
          <div>
            {GOALS.map((g) => (
              <SelectRow key={g.value} label={g.label} sub={g.sub}
                         selected={form.primary_goal === g.value}
                         onClick={() => setField('primary_goal', g.value)} />
            ))}
          </div>
          {form.primary_goal === 'grade_progression' && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-ct-cream/40 mb-2">
                Target grade
              </p>
              <input
                type="text"
                placeholder="V6, 5.12b, etc."
                value={form.goal_grade}
                onChange={(e) => setField('goal_grade', e.target.value)}
                className="w-full bg-transparent border-b-[0.5px] border-white/[0.10]
                           text-base sm:text-[15px] font-bold py-2 outline-none transition-colors
                           focus:border-[#d97757]"
              />
            </div>
          )}
        </>
      )
      default: return null
    }
  }, [step, form, styleProfile])

  return (
    <div className="relative max-w-lg mx-auto px-4 py-6 md:py-10 min-h-[calc(100vh-4rem)] flex flex-col"
         style={{
           background:
             'radial-gradient(circle at 50% -10%, rgba(217,119,87,0.22) 0%, transparent 55%)',
         }}>
      {/* Top progress + Train title */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[20px] font-extrabold -tracking-[0.025em]"
             style={{ textShadow: '0 0 14px rgba(217,119,87,0.45)' }}>
            Train.
          </p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                           text-[10.5px] font-extrabold uppercase tracking-[0.06em]"
                style={{
                  background: 'rgba(217,119,87,0.12)',
                  border: '0.5px solid rgba(217,119,87,0.35)',
                  color: '#f0a875',
                }}>
            <Sparkles size={11} strokeWidth={2.6} />
            Build my plan
          </span>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {/* Step body */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.20, ease: [0, 0, 0.2, 1] }}
          >
            {stepBody}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-5 text-[12px] font-bold text-[#fb7185]">{error}</p>
        )}
      </div>

      {/* Bottom action bar — sits on the page (no opaque backdrop) */}
      <div className="sticky bottom-0 pt-4
                      pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {(() => {
          const ready = canAdvance() && !saving
          return (
            <motion.button
              type="button"
              onClick={next}
              disabled={!ready}
              whileTap={ready ? { scale: 0.97 } : undefined}
              className="w-full inline-flex items-center justify-center gap-2
                         px-5 py-3.5 rounded-2xl font-extrabold text-[13.5px] -tracking-[0.01em]
                         transition-colors"
              style={ready
                ? { background: '#d97757', color: '#f0f5ed' }
                : {
                    background: 'rgba(217,119,87,0.14)',
                    border: '0.5px solid rgba(217,119,87,0.32)',
                    color: 'rgba(240,168,117,0.55)',
                    cursor: 'not-allowed',
                  }
              }
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : isLast
                  ? <>Build my plan <ArrowRight size={14} strokeWidth={2.6} /></>
                  : <>Continue <ChevronRight size={14} strokeWidth={2.6} /></>
              }
            </motion.button>
          )
        })()}
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || saving}
          className="mt-3 w-full inline-flex items-center justify-center gap-1
                     text-[11px] font-extrabold uppercase tracking-[0.10em]
                     text-ct-cream/60 hover:text-ct-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={12} strokeWidth={2.6} />
          Back
        </button>
      </div>
    </div>
  )
}
