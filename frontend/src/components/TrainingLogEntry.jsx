import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { logTraining } from '../api'
import DatePicker from './DatePicker'
import ClimbLogSection from './ClimbLogSection'

const SESSION_TYPES = ['bouldering', 'routes', 'hangboard', 'strength', 'outdoor', 'rest', 'other']

// Session types where logging individual climbs makes sense. Hangboard /
// strength / rest hide the climb section entirely — no climbs to log.
const CLIMB_SESSION_TYPES = new Set(['bouldering', 'routes', 'outdoor', 'other'])

const INTENSITY_LABELS = {
  1: 'Very easy', 2: 'Easy', 3: 'Easy-moderate',
  4: 'Moderate', 5: 'Moderate', 6: 'Moderate-hard',
  7: 'Hard', 8: 'Very hard', 9: 'Maximal', 10: 'Absolute max',
}

const INTENSITY_COLOR = (val) => {
  if (val <= 3) return 'text-accent'
  if (val <= 6) return 'text-accent3'
  return 'text-accent2'
}

export default function TrainingLogEntry({ sessionType: prefillType, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    session_type: prefillType || 'bouldering',
    duration_min: 90,
    intensity: 7,
    grades_sent: '',
    notes: '',
    climbs: {},
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await logTraining(form)
      // PR toast — existing.
      if (res?.new_prs && (res.new_prs.boulder || res.new_prs.route)) {
        window.dispatchEvent(new CustomEvent('ct:new-pr', { detail: res.new_prs }))
      }
      // Award unlock toasts — App.jsx queues them.
      if (Array.isArray(res?.new_awards) && res.new_awards.length) {
        window.dispatchEvent(new CustomEvent('ct:award-unlocked', { detail: { awards: res.new_awards } }))
      }
      // Tier promotion takeover.
      if (res?.tier_change && res.tier_change.from !== res.tier_change.to) {
        window.dispatchEvent(new CustomEvent('ct:tier-promotion', { detail: res.tier_change }))
      }
      onSave?.()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const showClimbSection = CLIMB_SESSION_TYPES.has(form.session_type)
  const defaultTab = form.session_type === 'routes' ? 'route' : 'boulder'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text">Log this session</p>
        {onCancel && (
          <button onClick={onCancel} className="text-muted hover:text-text">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Date + type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted mb-1">Date</p>
          <DatePicker value={form.date} onChange={(v) => set('date', v)} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Session type</p>
          <select
            value={form.session_type}
            onChange={(e) => set('session_type', e.target.value)}
            className="w-full bg-panel border border-outline rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-accent capitalize"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Duration */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted">Duration</p>
          <span className="text-xs font-bold text-accent">{form.duration_min} min</span>
        </div>
        <input
          type="range"
          min={15}
          max={240}
          step={15}
          value={form.duration_min}
          onChange={(e) => set('duration_min', +e.target.value)}
          className="w-full accent-teal-400"
        />
      </div>

      {/* Intensity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted">Intensity (RPE)</p>
          <span className={`text-xs font-bold ${INTENSITY_COLOR(form.intensity)}`}>
            {form.intensity}/10 — {INTENSITY_LABELS[form.intensity]}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={form.intensity}
          onChange={(e) => set('intensity', +e.target.value)}
          className="w-full accent-teal-400"
        />
      </div>

      {/* Free-text grades_sent — kept as a fallback for users who prefer typing */}
      <div>
        <p className="text-xs text-muted mb-1">Grades sent (free-form, optional)</p>
        <input
          type="text"
          placeholder="e.g. V5×3, V6×1, V7 attempt"
          value={form.grades_sent}
          onChange={(e) => set('grades_sent', e.target.value)}
          className="w-full bg-panel border border-outline rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-muted/50 outline-none focus:border-accent"
        />
      </div>

      {/* Structured climb log — only for climbing-relevant session types */}
      {showClimbSection && (
        <ClimbLogSection
          value={form.climbs}
          onChange={(v) => set('climbs', v)}
          defaultTab={defaultTab}
        />
      )}

      {/* Notes */}
      <div>
        <p className="text-xs text-muted mb-1">Notes (optional)</p>
        <textarea
          rows={2}
          placeholder="How did it feel? Any breakthroughs or setbacks?"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="w-full bg-panel border border-outline rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-muted/50 outline-none focus:border-accent resize-none"
        />
      </div>

      {error && <p className="text-xs text-accent2">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? 'Saving…' : <><Check size={14} /> Save session</>}
      </button>
    </motion.div>
  )
}
