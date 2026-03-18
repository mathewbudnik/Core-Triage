import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle, CheckCircle, Download, Save, Loader2, Zap, BookOpen } from 'lucide-react'
import { triageIntake, saveSession } from '../api'

const REGIONS = ['Fingers', 'Wrist', 'Elbow', 'Shoulder']
const ONSETS = ['Gradual', 'Sudden']
const MECHANISMS = [
  'Hard crimp', 'Dynamic catch', 'Pocket',
  'High volume pulling', 'Steep climbing/board', 'Campusing', 'Unknown/other',
]
const PAIN_TYPES = ['Dull/ache', 'Sharp', 'Burning', 'Tingling']
const YES_NO = ['No', 'Yes']
const WEAKNESS_OPTS = ['None', 'Mild', 'Significant']

const SEVERITY_COLOR = (v) => {
  if (v <= 3) return 'text-accent'
  if (v <= 6) return 'text-accent3'
  return 'text-accent2'
}

const SEVERITY_BG = (v) => {
  if (v <= 3) return 'bg-accent'
  if (v <= 6) return 'bg-accent3'
  return 'bg-accent2'
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-base">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
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

function buildMarkdown(result, form) {
  const lines = ['# CoreTriage Summary (Educational)\n']
  lines.push('## Intake')
  Object.entries(result.intake).forEach(([k, v]) => lines.push(`- **${k}**: ${v}`))
  lines.push('\n## Red Flags')
  if (result.red_flags.length) result.red_flags.forEach((f) => lines.push(`- ${f}`))
  else lines.push('- None detected (still educational only)')
  lines.push('\n## Possibility Buckets')
  result.buckets.forEach((b) => lines.push(`- **${b.title}** — ${b.why}`))
  lines.push('\n## Conservative Plan')
  Object.entries(result.plan).forEach(([section, items]) => {
    lines.push(`\n### ${section}`)
    items.forEach((i) => lines.push(`- ${i}`))
  })
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

export default function TriageTab({ k }) {
  const [form, setForm] = useState({
    region: 'Fingers', onset: 'Gradual', mechanism: 'Hard crimp',
    pain_type: 'Dull/ache', severity: 4, swelling: 'No',
    bruising: 'No', numbness: 'No', weakness: 'None', instability: 'No', free_text: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setSaveStatus(null)
    try {
      const data = await triageIntake({ ...form, severity: Number(form.severity), k })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaveStatus('saving')
    try {
      const { id } = await saveSession({
        injury_area: form.region,
        pain_level: Number(form.severity),
        pain_type: form.pain_type,
        onset: form.onset,
      })
      setSaveStatus(`saved:${id}`)
    } catch (err) {
      setSaveStatus(`error:${err.message}`)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="card space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-accent3" />
            <h2 className="font-semibold text-text">Quick Intake</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1 */}
            <div className="space-y-4">
              <Select label="Injury area" value={form.region} onChange={set('region')} options={REGIONS} />
              <Select label="Onset" value={form.onset} onChange={set('onset')} options={ONSETS} />
              <Select label="What triggered it?" value={form.mechanism} onChange={set('mechanism')} options={MECHANISMS} />
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <Select label="Pain type" value={form.pain_type} onChange={set('pain_type')} options={PAIN_TYPES} />
              <div>
                <label className="label">
                  Pain severity — <span className={`font-bold ${SEVERITY_COLOR(form.severity)}`}>{form.severity}/10</span>
                </label>
                <input
                  type="range" min={0} max={10} value={form.severity}
                  onChange={(e) => set('severity')(Number(e.target.value))}
                  className="w-full mt-1 cursor-pointer"
                  style={{ accentColor: form.severity <= 3 ? '#14b8a6' : form.severity <= 6 ? '#fbbf24' : '#fb7185' }}
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>None</span><span>Moderate</span><span>Severe</span>
                </div>
              </div>
              {/* Severity badge */}
              <div className={`h-1.5 rounded-full bg-panel overflow-hidden`}>
                <motion.div
                  className={`h-full rounded-full ${SEVERITY_BG(form.severity)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(form.severity / 10) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <Select label="Swelling" value={form.swelling} onChange={set('swelling')} options={YES_NO} />
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <Select label="Bruising" value={form.bruising} onChange={set('bruising')} options={YES_NO} />
              <Select label="Numbness / tingling" value={form.numbness} onChange={set('numbness')} options={YES_NO} />
              <Select label="Weakness" value={form.weakness} onChange={set('weakness')} options={WEAKNESS_OPTS} />
              <Select label="Instability" value={form.instability} onChange={set('instability')} options={YES_NO} />
            </div>
          </div>

          {/* Free text */}
          <div>
            <label className="label">Describe what happened (optional)</label>
            <textarea
              rows={3}
              value={form.free_text}
              onChange={(e) => set('free_text')(e.target.value)}
              placeholder="E.g. felt a pop on a hard crimp, started aching after a long session..."
              className="input-base resize-none"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {loading ? 'Analysing...' : 'Generate Guidance'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 bg-accent2/10 border border-accent2/30 rounded-xl px-4 py-3 text-accent2 text-sm">
          <AlertTriangle size={16} /> {error}
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            {/* Red flags */}
            {result.red_flags.length > 0 ? (
              <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-accent2 font-semibold mb-3">
                  <AlertTriangle size={16} /> Red Flags Detected
                </div>
                <ul className="space-y-1.5">
                  {result.red_flags.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted">
                      <span className="w-1 h-1 rounded-full bg-accent2 mt-2 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-accent text-sm">
                <CheckCircle size={16} /> No major red flags from this intake (still educational only).
              </div>
            )}

            {/* Buckets */}
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                Common Possibility Buckets
              </h3>
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

            {/* Conservative plan */}
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                Conservative Plan
              </h3>
              <div className="space-y-2">
                {Object.entries(result.plan).map(([section, items], i) => (
                  <AccordionSection
                    key={section}
                    title={section}
                    items={items}
                    defaultOpen={i === 0}
                  />
                ))}
              </div>
            </div>

            {/* Citations */}
            {result.citations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-muted uppercase tracking-wide mb-2">
                  <BookOpen size={13} /> Knowledge Base Sources
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.citations.map((c, i) => (
                    <span key={i} className="text-xs bg-panel border border-outline rounded-full px-3 py-1 text-muted">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => downloadMarkdown(buildMarkdown(result, form))}
                className="btn-secondary flex items-center gap-2"
              >
                <Download size={15} /> Download Report
              </button>
              <button onClick={handleSave} className="btn-secondary flex items-center gap-2">
                <Save size={15} />
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus?.startsWith('saved:') && `Saved #${saveStatus.split(':')[1]}`}
                {saveStatus?.startsWith('error:') && 'Save failed'}
                {!saveStatus && 'Save to History'}
              </button>
            </div>

            <p className="text-xs text-muted border-t border-outline pt-4">
              Educational tool only. This does not diagnose, treat, or replace a clinician or physiotherapist.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
