import { useState, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, ChevronLeft, AlertTriangle, CheckCircle,
  Download, Save, Loader2, BookOpen, ArrowRight,
  Clock, Zap, Grip, Target, TrendingUp, Mountain, ChevronsUp, HelpCircle,
  RotateCcw, RotateCw, ArrowUp, Maximize2, AlertCircle, FileText, Lock,
} from 'lucide-react'
import { triageIntake, saveSession } from '../api'
import BodyDiagram from './BodyDiagram'
import RehabProtocol from './RehabProtocol'
import UpgradeModal from './UpgradeModal'
import { downloadTriagePDF } from './TriageReport'

// ── Pre-submit input validation ──────────────────────────────────────────────
// Detects user-input issues that would lead to a misleading triage result.
// Each warning gives the user a chance to fix their input before it reaches
// the classifier, rather than discovering the problem in the output.

const HIGH_PAIN_LANG = [
  'worst pain', 'unbearable', '10/10', 'ten out of ten',
  'excruciating', 'agonizing', "can't sleep", 'cannot sleep',
]

const LOW_PAIN_LANG = [
  'tiny twinge', 'just a tiny', 'barely', 'no big deal',
  'feels fine', 'feels great', 'not bad', 'nothing serious',
  'no real pain', 'minor', "doesn't hurt much",
]

const JOKE_PHRASES = [
  'just testing', 'test test', 'checking the app', 'just checking',
  'this is a test', 'ignore this',
]

// Maps each region to the words a user is likely to use in free-text. Used
// to detect when the selected region doesn't match what they describe.
const REGION_KEYWORDS = {
  Finger:       ['finger', 'pulley', 'crimp', 'pip joint', 'a2', 'a4', 'knuckle'],
  Wrist:        ['wrist', 'forearm', 'tfcc', 'scaphoid', 'snuffbox'],
  Elbow:        ['elbow', 'epicondyle', 'tricep', 'bicep', 'cubital'],
  Shoulder:     ['shoulder', 'rotator', 'deltoid', 'scapula', 'clavicle'],
  Knee:         ['knee', 'meniscus', 'patella', 'lcl', 'mcl', 'acl', 'kneecap'],
  Hip:          ['hip', 'groin', 'flexor'],
  'Lower Back': ['back', 'lumbar', 'spine', 'sciatic'],
  Neck:         ['neck', 'cervical', 'trapezius'],
  Ankle:        ['ankle'],
  Foot:         ['foot', 'heel', 'plantar', 'toe', 'arch', 'achilles'],
  Chest:        ['chest', 'pec', 'sternum', 'rib'],
  Abs:          ['abs', 'abdominal', 'core', 'oblique'],
}

function validateBeforeSubmit(form) {
  const text = (form.free_text || '').toLowerCase()
  const warnings = []

  // ── #1 Pain slider mismatch ─────────────────────────────────────────────
  const sev = Number(form.severity) || 0
  if (sev <= 3 && HIGH_PAIN_LANG.some((p) => text.includes(p))) {
    warnings.push({
      kind: 'pain_too_low',
      title: 'Pain level looks low for what you described',
      message: `You set pain to ${sev}/10 but described it as severe ("${HIGH_PAIN_LANG.find((p) => text.includes(p))}"). Want to increase the slider?`,
    })
  }
  if (sev >= 7 && LOW_PAIN_LANG.some((p) => text.includes(p))) {
    warnings.push({
      kind: 'pain_too_high',
      title: 'Pain level looks high for what you described',
      message: `You set pain to ${sev}/10 but described it as minor. Want to lower the slider?`,
    })
  }

  // ── #7 Region vs free-text mismatch ─────────────────────────────────────
  // Only run if free-text is substantial enough to matter.
  if (text.length > 30) {
    const selectedKeywords = REGION_KEYWORDS[form.region] || []
    const mentionsSelected = selectedKeywords.some((w) => text.includes(w))
    if (!mentionsSelected) {
      // Find the first OTHER region whose keywords appear in the text.
      const otherMatch = Object.entries(REGION_KEYWORDS).find(
        ([region, words]) => region !== form.region && words.some((w) => text.includes(w)),
      )
      if (otherMatch) {
        warnings.push({
          kind: 'region_mismatch',
          title: 'Region might not match what you described',
          message: `You selected ${form.region}, but your description mentions ${otherMatch[0]}. Did you mean to switch regions?`,
        })
      }
    }
  }

  // ── #8 Joke / test input ────────────────────────────────────────────────
  if (JOKE_PHRASES.some((p) => text.includes(p))) {
    warnings.push({
      kind: 'joke_input',
      title: 'Looks like a test',
      message: 'It seems like this might be a test submission. Submit anyway?',
    })
  }

  return warnings
}

// ── Data ──────────────────────────────────────────────────────────────────────

const LOWER_BODY = ['Knee', 'Hip', 'Lower Back']

const MECHANISMS = {
  upper: [
    { value: 'Hard crimp',           label: 'Gripping a small hold',  desc: 'Crimping on small edges',       Icon: Grip       },
    { value: 'Dynamic catch',        label: 'Catching a big jump',    desc: 'Dynos or large throws',         Icon: Zap        },
    { value: 'Pocket',               label: 'Pocket hold',            desc: 'One or two-finger pockets',     Icon: Target     },
    { value: 'High volume pulling',  label: 'Lots of climbing',       desc: 'High mileage or long sessions', Icon: TrendingUp },
    { value: 'Steep climbing/board', label: 'Steep or overhang',      desc: 'Board climbing or cave routes', Icon: Mountain   },
    { value: 'Campusing',            label: 'No-feet moves',          desc: 'Campus board or laddering',     Icon: ChevronsUp },
    { value: 'Unknown/other',        label: 'Not sure',               desc: 'Came on gradually or unclear',  Icon: HelpCircle },
  ],
  lower: [
    { value: 'Heel hook',            label: 'Heel hook',        desc: 'Hooking your heel on a hold',      Icon: RotateCcw  },
    { value: 'Drop knee',            label: 'Drop knee',        desc: 'Knee twisting on a hold',          Icon: RotateCw   },
    { value: 'High step / rockover', label: 'High step',        desc: 'Stepping high or rocking over',    Icon: ArrowUp    },
    { value: 'Stemming / bridging',  label: 'Stemming',         desc: 'Wide bridging between walls',      Icon: Maximize2  },
    { value: 'High volume climbing', label: 'Lots of climbing', desc: 'High mileage or long sessions',    Icon: TrendingUp },
    { value: 'Fall',                 label: 'A fall',           desc: 'Fell or took an impact',           Icon: AlertCircle},
    { value: 'Unknown/other',        label: 'Not sure',         desc: 'Came on gradually or unclear',     Icon: HelpCircle },
  ],
}

const PAIN_TYPES = [
  { value: 'Dull/ache', label: 'Dull ache',  desc: 'Deep, throbbing or background pain' },
  { value: 'Sharp',     label: 'Sharp',       desc: 'Stabbing or shooting pain' },
  { value: 'Burning',   label: 'Burning',     desc: 'Hot or burning sensation' },
  { value: 'Tingling',  label: 'Tingling',    desc: 'Pins and needles' },
]

const SEVERITY_LABEL = (v) => {
  if (v === 0) return 'No pain'
  if (v <= 2)  return 'Very mild'
  if (v <= 4)  return 'Mild'
  if (v <= 6)  return 'Moderate'
  if (v <= 8)  return 'Severe'
  return 'Worst imaginable'
}

const SEVERITY_COLOR = (v) => v <= 3 ? 'text-accent' : v <= 6 ? 'text-accent3' : 'text-accent2'
const SEVERITY_BG    = (v) => v <= 3 ? 'bg-accent'   : v <= 6 ? 'bg-accent3'   : 'bg-accent2'

const STEP_TITLES = [
  { title: 'Where does it hurt?',    sub: 'Tap the area that is bothering you' },
  { title: 'How did it start?',      sub: 'Tell us when and what you were doing' },
  { title: 'How bad is the pain?',   sub: 'Rate your pain and describe what it feels like' },
  { title: 'Any other symptoms?',    sub: 'Check anything that applies to you' },
  { title: 'Anything else to add?',  sub: 'Optional — describe what happened in your own words' },
]

const TOTAL_STEPS = 5

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current     ? 'w-6 h-2 bg-accent' :
            i < current       ? 'w-2 h-2 bg-accent/50' :
                                'w-2 h-2 bg-outline'
          }`}
        />
      ))}
    </div>
  )
}

function OptionCard({ selected, onClick, className = '', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        selected
          ? 'border-accent bg-accent/10 shadow-glow'
          : 'border-outline bg-panel hover:border-accent/40 hover:bg-panel/80'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function AccordionSection({ title, items, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="border border-outline rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text hover:bg-panel/50 transition-colors"
      >
        <span>{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-muted" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ul className="px-4 pb-4 space-y-2 border-t border-outline">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted pt-3">
                  <span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function buildMarkdown(result) {
  const lines = ['# CoreTriage Summary (Educational)\n']
  lines.push('## Intake')
  Object.entries(result.intake).forEach(([k, v]) => lines.push(`- **${k}**: ${v}`))
  if (result.severity) {
    lines.push(`\n## Severity: ${result.severity.label}`)
    lines.push(`- **Action:** ${result.severity.action}`)
    lines.push(`- **Climbing:** ${result.severity.can_climb}`)
  }
  lines.push('\n## Red Flags')
  if (result.red_flags.length) result.red_flags.forEach((f) => lines.push(`- ${f}`))
  else lines.push('- None detected (still educational only)')
  lines.push('\n## What It Could Be')
  result.buckets.forEach((b) => lines.push(`- **${b.title}** — ${b.why}`))
  lines.push('\n## Conservative Plan')
  Object.entries(result.plan).forEach(([section, items]) => {
    lines.push(`\n### ${section}`)
    items.forEach((i) => lines.push(`- ${i}`))
  })
  if (result.training_modifications && Object.keys(result.training_modifications).length) {
    lines.push('\n## Training Modifications')
    Object.entries(result.training_modifications).forEach(([section, items]) => {
      lines.push(`\n### ${section}`)
      items.forEach((i) => lines.push(`- ${i}`))
    })
  }
  if (result.return_protocol && Object.keys(result.return_protocol).length) {
    lines.push('\n## Return to Climbing Protocol')
    Object.entries(result.return_protocol).forEach(([section, items]) => {
      lines.push(`\n### ${section}`)
      items.forEach((i) => lines.push(`- ${i}`))
    })
  }
  lines.push('\n## Knowledge Base Sources')
  if (result.citations.length) result.citations.forEach((c) => lines.push(`- ${c}`))
  else lines.push('- None')
  lines.push('\n---\nThis tool is educational only and does not provide medical diagnosis or treatment.')
  return lines.join('\n')
}

function downloadMarkdown(text) {
  const blob = new Blob([text], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'coretriage_summary.md'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Step 4: free-text + submit ────────────────────────────────────────────────
// Isolated into its own memo'd component so typing in the textarea only
// re-renders this subtree, not the entire TriageTab wizard.

const FreeTextStep = memo(function FreeTextStep({ initialValue, form, onCommit, onSubmit, error, loading }) {
  const [text, setText] = useState(initialValue)

  // Live validation — re-runs as the user types so warnings appear/disappear
  // alongside the text. Doesn't block submission, just gives the user a
  // chance to reconsider before getting an over-cautious result.
  const warnings = useMemo(
    () => validateBeforeSubmit({ ...form, free_text: text }),
    [form, text],
  )

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Describe what happened{' '}
          <span className="text-muted font-normal">(optional)</span>
        </label>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onCommit(text)}
          placeholder="E.g. felt a pop on a hard crimp, started aching after a long session, pain is worse in the morning…"
          className="input-base resize-none"
        />
        <p className="text-xs text-muted mt-1.5">
          The more detail you add, the more specific your guidance will be.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="bg-accent3/10 border border-accent3/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-accent3 text-sm font-semibold">
            <AlertCircle size={15} />
            Before you submit — quick check
          </div>
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li key={w.kind} className="text-xs text-muted leading-relaxed">
                <span className="text-text font-medium">{w.title}.</span>{' '}
                {w.message}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted/60 leading-snug">
            You can submit anyway, but small mismatches like these can lead to an over- or under-cautious result.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-accent2/10 border border-accent2/30 rounded-xl px-4 py-3 text-accent2 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <button
        onClick={() => onSubmit(text)}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
      >
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Analysing your symptoms…</>
          : warnings.length > 0
          ? <><ArrowRight size={18} /> Submit anyway</>
          : <><ArrowRight size={18} /> Get My Guidance</>
        }
      </button>

      <p className="text-xs text-muted text-center">
        Educational only · Not a medical diagnosis · Seek professional evaluation if unsure
      </p>
    </div>
  )
})

// ── Results ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  severe:   { bar: 'bg-accent2', border: 'border-accent2/30', bg: 'bg-accent2/8',  text: 'text-accent2', dot: 'bg-accent2' },
  moderate: { bar: 'bg-accent3', border: 'border-accent3/30', bg: 'bg-accent3/8',  text: 'text-accent3', dot: 'bg-accent3' },
  mild:     { bar: 'bg-accent',  border: 'border-accent/30',  bg: 'bg-accent/8',   text: 'text-accent',  dot: 'bg-accent'  },
}

function SeverityCard({ severity }) {
  if (!severity) return null
  const s = SEVERITY_STYLES[severity.level] ?? SEVERITY_STYLES.mild
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>
      <div className={`h-1 w-full ${s.bar}`} />
      <div className="px-4 py-3 flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className={`text-sm font-bold ${s.text}`}>{severity.label}</p>
          <p className="text-xs text-muted mt-0.5">{severity.action}</p>
        </div>
        <div className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text} border ${s.border}`}>
          Climbing: {severity.can_climb}
        </div>
      </div>
    </div>
  )
}

function Results({ result, form, onRestart, onSave, saveStatus, user }) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [pdfLoading, setPdfLoading]   = useState(false)

  async function handlePdfDownload() {
    if (user?.tier === 'core' || user?.tier === 'pro') {
      setPdfLoading(true)
      try {
        await downloadTriagePDF(result)
      } finally {
        setPdfLoading(false)
      }
    } else {
      setShowUpgrade(true)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text">Your Guidance</h2>
          <p className="text-xs text-muted mt-0.5">
            {form.region} · {form.onset} onset · {form.severity}/10 pain
          </p>
        </div>
        <button onClick={onRestart} className="btn-secondary text-xs">Start over</button>
      </div>

      <SeverityCard severity={result.severity} />

      {result.red_flags.length > 0 ? (
        <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-accent2 font-semibold mb-3">
            <AlertTriangle size={16} /> Important — consider seeing a professional
          </div>
          <ul className="space-y-1.5">
            {result.red_flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted">
                <span className="w-1 h-1 rounded-full bg-accent2 mt-2 shrink-0" />{f}
              </li>
            ))}
          </ul>
        </div>
      ) : result.severity?.level !== 'severe' ? (
        <div className="flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-accent text-sm">
          <CheckCircle size={16} /> No major red flags — follow the guidance below.
        </div>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">What it could be</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.buckets.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card"
            >
              <p className="text-sm font-semibold text-text mb-1">{b.title}</p>
              <p className="text-xs text-muted">{b.why}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">What to do</h3>
        <div className="space-y-2">
          {Object.entries(result.plan).map(([section, items], i) => (
            <AccordionSection key={section} title={section} items={items} defaultOpen={i === 0} />
          ))}
        </div>
      </div>

      {result.training_modifications && Object.keys(result.training_modifications).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Training modifications</h3>
          <div className="space-y-2">
            {Object.entries(result.training_modifications).map(([section, items]) => (
              <AccordionSection key={section} title={section} items={items} defaultOpen={false} />
            ))}
          </div>
        </div>
      )}

      {result.return_protocol && Object.keys(result.return_protocol).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Return to climbing</h3>
          <div className="space-y-2">
            {Object.entries(result.return_protocol).map(([section, items]) => (
              <AccordionSection key={section} title={section} items={items} defaultOpen={false} />
            ))}
          </div>
        </div>
      )}

      {result.citations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs text-muted uppercase tracking-wide mb-2">
            <BookOpen size={13} /> Sources
          </div>
          <div className="flex flex-wrap gap-2">
            {result.citations.map((c, i) => (
              <span key={i} className="text-xs bg-panel border border-outline rounded-full px-3 py-1 text-muted">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Rehab protocol — inline after results */}
      {result.intake?.region && (
        <div className="bg-panel2 border border-outline rounded-2xl p-5">
          <RehabProtocol
            region={result.intake.region}
            severity={result.severity?.level}
            user={user}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {/* PDF download — Pro tier gated */}
        <button
          onClick={handlePdfDownload}
          disabled={pdfLoading}
          className="btn-primary flex items-center gap-2"
        >
          {pdfLoading
            ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
            : user?.tier === 'core' || user?.tier === 'pro'
            ? <><FileText size={15} /> Download PDF</>
            : <><Lock size={13} /> PDF Report · Pro</>
          }
        </button>
        <button onClick={() => downloadMarkdown(buildMarkdown(result))} className="btn-secondary flex items-center gap-2">
          <Download size={15} /> Download .md
        </button>
        <button onClick={onSave} className="btn-secondary flex items-center gap-2">
          <Save size={15} />
          {saveStatus === 'saving'             && 'Saving…'}
          {saveStatus?.startsWith('saved:')   && `Saved #${saveStatus.split(':')[1]}`}
          {saveStatus?.startsWith('error:')   && 'Save failed'}
          {!saveStatus                         && 'Save to History'}
        </button>
      </div>

      <p className="text-xs text-muted border-t border-outline pt-4">
        Educational only — not a diagnosis or medical advice.
      </p>

      <AnimatePresence>
        {showUpgrade && (
          <UpgradeModal onClose={() => setShowUpgrade(false)} trigger="pdf" />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Wizard ────────────────────────────────────────────────────────────────────

const slideVariants = {
  enter:  (d) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit:   (d) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
}

const INITIAL_FORM = {
  region: '', onset: '', mechanism: '', pain_type: '',
  severity: 5, swelling: 'No', bruising: 'No',
  numbness: 'No', weakness: 'None', instability: 'No', free_text: '',
}

export default function TriageTab({ k, user }) {
  const [step, setStep]           = useState(0)
  const [direction, setDirection] = useState(1)
  const [form, setForm]           = useState(INITIAL_FORM)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)

  // Stable setter — only depends on setForm which is stable from useState
  const set = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), [])

  // Stable callback to sync free_text from FreeTextStep on blur
  const commitFreeText = useCallback((text) => set('free_text', text), [set])

  const mechanisms = LOWER_BODY.includes(form.region) ? MECHANISMS.lower : MECHANISMS.upper

  const advance = useCallback(() => { setDirection(1);  setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)) }, [])
  const retreat  = useCallback(() => { setDirection(-1); setStep((s) => Math.max(s - 1, 0)) }, [])

  const selectRegion = useCallback((value) => {
    const isLower  = LOWER_BODY.includes(value)
    const wasLower = LOWER_BODY.includes(form.region)
    setForm((f) => ({ ...f, region: value, mechanism: isLower !== wasLower ? '' : f.mechanism }))
    setDirection(1)
    setStep(1)
  }, [form.region])

  const canAdvance = () => {
    if (step === 0) return !!form.region
    if (step === 1) return !!form.onset && !!form.mechanism
    if (step === 2) return !!form.pain_type
    return true
  }

  // Accepts the current free-text directly from FreeTextStep to avoid a
  // stale-closure race between setForm and the read inside this function.
  const handleSubmit = useCallback(async (freeText) => {
    setLoading(true)
    setError(null)
    try {
      const data = await triageIntake({
        ...form,
        free_text: freeText ?? form.free_text,
        severity: Number(form.severity),
        k,
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [form, k])

  const handleSave = useCallback(async () => {
    if (!result) return
    setSaveStatus('saving')
    try {
      const { id } = await saveSession({
        injury_area: form.region,
        pain_level:  Number(form.severity),
        pain_type:   form.pain_type,
        onset:       form.onset,
      })
      setSaveStatus(`saved:${id}`)
    } catch (err) {
      setSaveStatus(`error:${err.message}`)
    }
  }, [result, form.region, form.severity, form.pain_type, form.onset])

  const restart = useCallback(() => {
    setResult(null); setError(null); setSaveStatus(null)
    setStep(0); setDirection(1); setForm(INITIAL_FORM)
  }, [])

  if (result) {
    return (
      <Results
        result={result} form={form}
        onRestart={restart} onSave={handleSave} saveStatus={saveStatus}
        user={user}
      />
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8 space-y-3">
        <StepDots current={step} total={TOTAL_STEPS} />
        <div className="text-center">
          <h2 className="text-xl font-bold text-text">{STEP_TITLES[step].title}</h2>
          <p className="text-sm text-muted mt-1">{STEP_TITLES[step].sub}</p>
        </div>
      </div>

      {/* Animated step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeInOut' }}
        >

          {/* ── Step 0 — Region (body diagram) ──────────────────────────────── */}
          {step === 0 && (
            <BodyDiagram
              selected={form.region}
              onSelect={selectRegion}
            />
          )}

          {/* ── Step 1 — Onset + Mechanism ──────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8">
              {/* Onset — two colored cards */}
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-text mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  When did the pain start?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'Gradual', label: 'Gradually', sub: 'Chronic', desc: 'Built up over days or weeks', Icon: Clock, sel: 'border-accent bg-accent/10 shadow-glow',      icon: 'text-accent',  hover: 'hover:border-accent/40' },
                    { value: 'Sudden',  label: 'Suddenly',  sub: 'Acute',   desc: 'Happened during a move',     Icon: Zap,   sel: 'border-accent2 bg-accent2/10',                 icon: 'text-accent2', hover: 'hover:border-accent2/30' },
                  ].map((o) => {
                    const active = form.onset === o.value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => set('onset', o.value)}
                        className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                          active ? o.sel : `border-outline bg-panel ${o.hover}`
                        }`}
                      >
                        <o.Icon
                          size={20}
                          className={`mb-3 transition-colors duration-200 ${active ? o.icon : 'text-muted'}`}
                        />
                        <p className="font-bold text-text text-sm">{o.label}</p>
                        <p className="text-xs text-muted mt-1">{o.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mechanism — icon grid */}
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-text mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent3 shrink-0" />
                  What were you doing when it started?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {mechanisms.map((m, idx) => {
                    const active = form.mechanism === m.value
                    return (
                      <motion.button
                        key={m.value}
                        type="button"
                        onClick={() => set('mechanism', m.value)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.045, duration: 0.2 }}
                        className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          active
                            ? 'border-accent bg-accent/10 shadow-glow'
                            : 'border-outline bg-panel hover:border-accent/40 hover:bg-panel/80'
                        } ${mechanisms.length % 2 !== 0 && idx === mechanisms.length - 1 ? 'col-span-2' : ''}`}
                      >
                        <m.Icon
                          size={18}
                          className={`mb-2.5 transition-colors duration-200 ${active ? 'text-accent' : 'text-muted'}`}
                        />
                        <p className="font-semibold text-text text-sm leading-snug">{m.label}</p>
                        <p className="text-xs text-muted mt-0.5">{m.desc}</p>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 — Severity + Pain type ───────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-text">Pain level right now</p>
                  <span className={`text-2xl font-bold ${SEVERITY_COLOR(form.severity)}`}>
                    {form.severity}/10
                  </span>
                </div>
                <input
                  type="range" min={0} max={10} value={form.severity}
                  onChange={(e) => set('severity', Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: form.severity <= 3 ? 'var(--color-accent)' : form.severity <= 6 ? 'var(--color-accent3)' : 'var(--color-accent2)' }}
                />
                <div className="flex justify-between text-xs text-muted mt-1.5">
                  <span>No pain</span><span>Moderate</span><span>Worst imaginable</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-panel overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${SEVERITY_BG(form.severity)}`}
                    animate={{ width: `${(form.severity / 10) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className={`text-center text-sm font-medium mt-2 ${SEVERITY_COLOR(form.severity)}`}>
                  {SEVERITY_LABEL(form.severity)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-text mb-3">What does the pain feel like?</p>
                <div className="grid grid-cols-2 gap-3">
                  {PAIN_TYPES.map((pt) => (
                    <OptionCard key={pt.value} selected={form.pain_type === pt.value} onClick={() => set('pain_type', pt.value)}>
                      <p className="font-semibold text-text text-sm">{pt.label}</p>
                      <p className="text-xs text-muted mt-0.5">{pt.desc}</p>
                    </OptionCard>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 — Symptoms ───────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-3">
              {/* Helper note — sets expectations about how these answers affect the result */}
              <div className="bg-accent3/8 border border-accent3/20 rounded-xl px-4 py-3 mb-2">
                <p className="text-xs text-muted leading-relaxed">
                  Be honest about <span className="text-text font-medium">how it actually is right now</span> — not how it might be.
                  Marking severe symptoms you don&apos;t actually have can lead to an over-cautious result.
                </p>
              </div>

              {[
                { key: 'swelling',    label: 'Swelling',  desc: 'Visible puffiness or noticeable size difference compared to the other side',                              opts: ['No', 'Yes'] },
                { key: 'bruising',    label: 'Bruising',  desc: 'Visible discoloration — purple, black, or blue marks (not just redness)',                                  opts: ['No', 'Yes'] },
                { key: 'instability', label: 'Instability', desc: 'The joint actually slips, gives way, or feels like it might dislocate during movement',                  opts: ['No', 'Yes'] },
              ].map(({ key, label, desc, opts }) => (
                <div key={key} className="bg-panel border border-outline rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text">{label}</p>
                      <p className="text-xs text-muted mt-0.5">{desc}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {opts.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => set(key, o)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                            form[key] === o
                              ? o === 'Yes'
                                ? 'border-accent2 bg-accent2/15 text-accent2'
                                : 'border-accent bg-accent/15 text-accent'
                              : 'border-outline text-muted hover:border-accent/30'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Numbness — 3-option to distinguish transient ("fell asleep") from persistent.
                   Persistent maps to "Yes" for the backend; the others map to "No" so a brief
                   tingle doesn't trip the neuro-escalation path. */}
              <div className="bg-panel border border-outline rounded-xl p-4">
                <p className="text-sm font-medium text-text">Numbness or tingling</p>
                <p className="text-xs text-muted mt-0.5">Pins and needles, or loss of sensation</p>
                <div className="flex gap-2 mt-3">
                  {[
                    { ui: 'None',       sub: 'No tingling',                                    map: 'No'  },
                    { ui: 'Brief',      sub: 'Hand fell asleep, resolved within minutes',      map: 'No'  },
                    { ui: 'Persistent', sub: 'Right now, or recurring — not just temporary',   map: 'Yes' },
                  ].map(({ ui, sub, map }) => {
                    const isSelected = form.numbness === map && form._numbness_label === ui
                    return (
                      <button
                        key={ui}
                        type="button"
                        onClick={() => { set('numbness', map); set('_numbness_label', ui) }}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border-2 transition-all leading-tight ${
                          isSelected
                            ? ui === 'Persistent' ? 'border-accent2 bg-accent2/15 text-accent2'
                            : ui === 'Brief'      ? 'border-accent3 bg-accent3/15 text-accent3'
                            :                       'border-accent  bg-accent/15  text-accent'
                            : 'border-outline text-muted hover:border-accent/30'
                        }`}
                        title={sub}
                      >
                        {ui}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted/60 mt-2 leading-snug">
                  Brief tingling that resolves on its own is normal. Persistent numbness is the one that needs evaluation.
                </p>
              </div>

              <div className="bg-panel border border-outline rounded-xl p-4">
                <p className="text-sm font-medium text-text">Weakness</p>
                <p className="text-xs text-muted mt-0.5">How much your strength is affected right now</p>
                <div className="flex gap-2 mt-3">
                  {[
                    { val: 'None',        sub: 'Full strength' },
                    { val: 'Mild',        sub: 'Noticeably weaker, but I can still climb' },
                    { val: 'Significant', sub: "Can't grip, lift, or push normally" },
                  ].map(({ val, sub }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => set('weakness', val)}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border-2 transition-all leading-tight ${
                        form.weakness === val
                          ? val === 'Significant' ? 'border-accent2 bg-accent2/15 text-accent2'
                          : val === 'Mild'        ? 'border-accent3 bg-accent3/15 text-accent3'
                          :                         'border-accent  bg-accent/15  text-accent'
                          : 'border-outline text-muted hover:border-accent/30'
                      }`}
                      title={sub}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted/60 mt-2 leading-snug">
                  Pick &quot;Significant&quot; only if you can&apos;t do normal daily activities (gripping a glass, pushing a door open).
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4 — Notes + Submit ─────────────────────────────────────── */}
          {step === 4 && (
            <FreeTextStep
              initialValue={form.free_text}
              form={form}
              onCommit={commitFreeText}
              onSubmit={handleSubmit}
              error={error}
              loading={loading}
            />
          )}

        </motion.div>
      </AnimatePresence>

      {/* Back / Continue navigation */}
      {step > 0 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-outline">
          <button onClick={retreat} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={16} /> Back
          </button>
          {step < TOTAL_STEPS - 1 && (
            <button
              onClick={advance}
              disabled={!canAdvance()}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
