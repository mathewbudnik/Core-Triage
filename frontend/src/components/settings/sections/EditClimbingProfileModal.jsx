import { useState } from 'react'
import { X } from 'lucide-react'
import { saveProfile } from '../../../api'

const EXPERIENCE_OPTS = ['Beginner', 'Intermediate', 'Advanced', 'Elite']
const DISCIPLINE_OPTS = ['Bouldering', 'Sport climbing', 'Trad climbing', 'Top rope']
const GOAL_OPTS = ['Strength', 'Endurance', 'Technique', 'Mental', 'Send a project', 'Stay healthy']
const EQUIPMENT_OPTS = ['Hangboard', 'Campus', 'Rings', 'Pull-up bar', 'Pinch block', 'Lifting weights']
const WEAKNESSES_OPTS = ['Crimps', 'Slopers', 'Pinches', 'Pockets', 'Footwork', 'Endurance', 'Power', 'Flexibility']
const WEEKDAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

export default function EditClimbingProfileModal({ profile, onClose, onSaved, onToast }) {
  const [form, setForm] = useState({
    experience_level:    profile?.experience_level || '',
    primary_discipline:  profile?.primary_discipline || '',
    max_grade_boulder:   profile?.max_grade_boulder || '',
    max_grade_route:     profile?.max_grade_route || '',
    session_length_min:  profile?.session_length_min || '',
    primary_goal:        profile?.primary_goal || '',
    goal_grade:          profile?.goal_grade || '',
    training_days:       profile?.training_days || [],
    equipment:           profile?.equipment || [],
    weaknesses:          profile?.weaknesses || [],
  })
  const [saving, setSaving] = useState(false)

  function toggleArr(key, val) {
    setForm((f) => {
      const arr = f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val]
      return { ...f, [key]: arr }
    })
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...profile, ...form, session_length_min: parseInt(form.session_length_min, 10) || null }
      await saveProfile(payload)
      onSaved?.(payload)
    } catch (err) {
      onToast?.({ kind: 'error', message: err.message || 'Could not save climbing profile.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-bg/80 backdrop-blur-sm overflow-y-auto p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-lg bg-ct-forest-deep border border-ct-rim rounded-2xl p-6 my-auto">
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 text-ct-cream/50 hover:text-ct-cream"><X size={18} /></button>
        <h2 className="text-xl font-extrabold text-ct-cream tracking-tight mb-1">Edit climbing profile</h2>
        <p className="text-xs text-ct-cream/50 mb-5">Updates apply to AI coach guidance and training recommendations.</p>

        <Selector label="Experience" value={form.experience_level} options={EXPERIENCE_OPTS} onChange={(v) => setForm((f) => ({ ...f, experience_level: v }))} />
        <Selector label="Discipline" value={form.primary_discipline} options={DISCIPLINE_OPTS} onChange={(v) => setForm((f) => ({ ...f, primary_discipline: v }))} />
        <TextRow label="Max boulder grade (e.g. V5)" value={form.max_grade_boulder} onChange={(v) => setForm((f) => ({ ...f, max_grade_boulder: v }))} />
        <TextRow label="Max route grade (e.g. 5.11a)" value={form.max_grade_route} onChange={(v) => setForm((f) => ({ ...f, max_grade_route: v }))} />
        <TextRow label="Session length (min)" type="number" value={form.session_length_min} onChange={(v) => setForm((f) => ({ ...f, session_length_min: v }))} />
        <Selector label="Primary goal" value={form.primary_goal} options={GOAL_OPTS} onChange={(v) => setForm((f) => ({ ...f, primary_goal: v }))} />
        <TextRow label="Goal grade" value={form.goal_grade} onChange={(v) => setForm((f) => ({ ...f, goal_grade: v }))} />

        <MultiSelect label="Training days" value={form.training_days} options={WEEKDAYS} onToggle={(v) => toggleArr('training_days', v)} />
        <MultiSelect label="Equipment" value={form.equipment} options={EQUIPMENT_OPTS} onToggle={(v) => toggleArr('equipment', v)} />
        <MultiSelect label="Weaknesses" value={form.weaknesses} options={WEAKNESSES_OPTS} onToggle={(v) => toggleArr('weaknesses', v)} />

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-ct-hairline text-sm text-ct-cream/70">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-ct-terracotta text-ct-cream text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ct-moss mt-3 mb-1.5">{children}</div>
}

function TextRow({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/30 border border-ct-hairline rounded-lg px-3 py-2 text-sm text-ct-cream focus:border-ct-terracotta/50 focus:outline-none"
      />
    </div>
  )
}

function Selector({ label, value, options, onChange }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ' +
              (value === opt
                ? 'bg-ct-terra-tint border-ct-terracotta/40 text-ct-terracotta'
                : 'border-ct-hairline text-ct-cream/60 hover:border-ct-rim')
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function MultiSelect({ label, value, options, onToggle }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = value.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ' +
                (on
                  ? 'bg-ct-terra-tint border-ct-terracotta/40 text-ct-terracotta'
                  : 'border-ct-hairline text-ct-cream/60 hover:border-ct-rim')
              }
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
