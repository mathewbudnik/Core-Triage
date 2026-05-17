import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTriageAutoscroll } from '../../hooks/useTriageAutoscroll'
import { chipsForRegion } from '../../data/signalChips'
import ChipGroup from './ChipGroup'
import PainSlider from './PainSlider'
import TriageRegionPill from './TriageRegionPill'
import TriageSummaryPill from './TriageSummaryPill'
import TriageSectionCard from './TriageSectionCard'
import TriageHero from './TriageHero'
import TriageDifferentials from './TriageDifferentials'
import TriageAnswersStrip from './TriageAnswersStrip'
import TriageActionsBar from './TriageActionsBar'
import DiagnosisSkeleton from './DiagnosisSkeleton'

// Section order is fixed. Anything else is optional (multi-pick) so it
// never blocks submit.
const ORDER = ['onset', 'mechanism', 'pain', 'anythingElse']

const ONSET_OPTIONS = [
  { value: 'Gradual', label: 'Gradual' },
  { value: 'Sudden',  label: 'Sudden'  },
]

function painTone(v) {
  if (v <= 3) return '#14b8a6'
  if (v <= 6) return '#fbbf24'
  return '#fb7185'
}

/**
 * Orchestrator for the restyled wizard.
 *
 * Form state shape preserved from SmartTriageCard — submit payload unchanged.
 *
 * Props:
 *   form:           { region, onset, mechanism, severity, signal_chips, ... }
 *   onChange:       (key, value) => void
 *   onChangeRegion: () => void   — back to body diagram
 *   onSubmit:       () => void   — fires triageIntake
 *   onOpenRehabPlan:() => void   — navigate to /body after diagnosis
 *   loading:        boolean
 *   result:         post-submit diagnosis object or null
 *   error:          string | null
 *   mechanisms:     Array<{ value, label, Icon? }>
 */
export default function TriageWizard({
  form, onChange, onChangeRegion, onSubmit, onOpenRehabPlan,
  loading, result, error, mechanisms,
}) {
  const { refFor, scrollTo } = useTriageAutoscroll()

  // Region-aware signal chips. Read from the canonical signalChips.js list
  // so the `value` is the chip id the classifier expects — avoids a silent
  // signal-loss regression where a wizard-local label diverges from the id.
  const signalOptions = useMemo(
    () => chipsForRegion(form.region).map((c) => ({ value: c.id, label: c.label })),
    [form.region]
  )

  // Section state map. Initial: onset focused, rest dim.
  const [states, setStates] = useState(() => ({
    onset: 'focused', mechanism: 'dim', pain: 'dim', anythingElse: 'dim',
  }))

  // Move a section to 'passed' and the next one to 'focused', then scroll.
  const advance = useCallback((from) => {
    const idx = ORDER.indexOf(from)
    if (idx < 0) return
    const next = ORDER[idx + 1]
    setStates((s) => {
      const updated = { ...s, [from]: 'passed' }
      if (next && (s[next] === 'dim' || s[next] === 'visited')) {
        updated[next] = 'focused'
      }
      return updated
    })
    if (next) {
      // Defer to next frame so the compress animation gets a chance to start
      // before we scroll — the destination is then in the right place.
      requestAnimationFrame(() => scrollTo(next))
    }
  }, [scrollTo])

  // Re-expand a passed section. Other sections' states are preserved.
  const editSection = useCallback((key) => {
    setStates((s) => ({ ...s, [key]: 'focused' }))
  }, [])

  // Submit enabled when the three required sections have a value.
  const canSubmit = !!(form.onset && form.mechanism && form.severity != null)

  // Reset states whenever the region changes — fresh wizard for a new injury.
  useEffect(() => {
    setStates({ onset: 'focused', mechanism: 'dim', pain: 'dim', anythingElse: 'dim' })
  }, [form.region])

  // ── Section handlers ────────────────────────────────────────────────────
  const onPickOnset = (v) => { onChange('onset', v); advance('onset') }
  const onPickMech  = (v) => { onChange('mechanism', v); advance('mechanism') }
  const onPainChange = (v) => onChange('severity', v)
  const onPainCommit = () => advance('pain')
  const onPickSignals = (arr) => onChange('signal_chips', arr)

  // ── Diagnosis view ──────────────────────────────────────────────────────
  if (result) {
    return <DiagnosisView
      form={form}
      result={result}
      onEdit={() => editSection('onset')}
      onOpenRehabPlan={onOpenRehabPlan}
    />
  }

  if (loading) {
    return (
      <div className="py-4">
        <DiagnosisSkeleton />
      </div>
    )
  }

  // ── Form view ───────────────────────────────────────────────────────────
  return (
    <div>
      <TriageRegionPill region={form.region} onChangeRegion={onChangeRegion} />

      <AnimatePresence mode="popLayout" initial={false}>
        {/* Onset */}
        {states.onset === 'passed' ? (
          <motion.div key="onset-summary" layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}>
            <TriageSummaryPill
              label="Onset"
              value={form.onset}
              onEdit={() => editSection('onset')}
            />
          </motion.div>
        ) : (
          <TriageSectionCard
            key="onset-card"
            state={states.onset}
            eyebrow="Essentials · 1 of 4"
            innerRef={refFor('onset')}
          >
            <p className="text-sm font-bold mb-2">When did it start?</p>
            <ChipGroup options={ONSET_OPTIONS} value={form.onset} onChange={onPickOnset} />
          </TriageSectionCard>
        )}

        {/* Mechanism */}
        {states.mechanism === 'passed' ? (
          <motion.div key="mech-summary" layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}>
            <TriageSummaryPill
              label="Mechanism"
              value={form.mechanism}
              onEdit={() => editSection('mechanism')}
            />
          </motion.div>
        ) : (
          <TriageSectionCard
            key="mech-card"
            state={states.mechanism}
            eyebrow="Mechanism · 2 of 4"
            innerRef={refFor('mechanism')}
          >
            <p className="text-sm font-bold mb-2">What were you doing?</p>
            <ChipGroup options={mechanisms} value={form.mechanism} onChange={onPickMech} />
          </TriageSectionCard>
        )}

        {/* Pain */}
        {states.pain === 'passed' ? (
          <motion.div key="pain-summary" layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}>
            <TriageSummaryPill
              label="Pain"
              value={`${form.severity}/10`}
              valueTone={painTone(Number(form.severity) || 0)}
              onEdit={() => editSection('pain')}
            />
          </motion.div>
        ) : (
          <TriageSectionCard
            key="pain-card"
            state={states.pain}
            eyebrow="Pain · 3 of 4"
            innerRef={refFor('pain')}
          >
            <PainSlider
              value={Number(form.severity) || 0}
              onChange={onPainChange}
              onCommit={onPainCommit}
            />
          </TriageSectionCard>
        )}

        {/* Anything else (multi-pick — never compresses) */}
        <TriageSectionCard
          key="ae-card"
          state={states.anythingElse}
          eyebrow="Anything else · optional"
          innerRef={refFor('anythingElse')}
        >
          <p className="text-sm font-bold mb-2">Any of these apply?</p>
          <ChipGroup
            options={signalOptions}
            value={form.signal_chips || []}
            multi
            onChange={onPickSignals}
          />
          <p className="text-[11px] text-muted mt-2">Pick all that apply — or skip.</p>
        </TriageSectionCard>
      </AnimatePresence>

      <TriageActionsBar
        primaryLabel={canSubmit ? 'Get my guidance' : 'Tell us a bit more'}
        enabled={canSubmit}
        loading={loading}
        onPrimary={onSubmit}
        error={error}
      />
    </div>
  )
}

// ── Diagnosis view (post-submit) ──────────────────────────────────────────

function DiagnosisView({ form, result, onEdit, onOpenRehabPlan }) {
  const severity = result?.severity?.level || 'moderate'
  const hero = useMemo(() => buildHero(result), [result])
  const answers = useMemo(() => buildAnswersStrip(form, result), [form, result])
  const diffs   = useMemo(() => buildDifferentials(result), [result])

  const primaryLabel = severity === 'severe' ? 'Find urgent care' : 'Open my rehab plan'
  const primaryTone  = severity === 'severe' ? 'coral' : 'teal'

  return (
    <div>
      <TriageAnswersStrip answers={answers} onEdit={onEdit} />

      <TriageHero
        severity={severity}
        title={hero.title}
        why={hero.why}
        actions={hero.actions}
        redFlagBody={hero.redFlagBody}
      />

      <TriageDifferentials items={diffs} severity={severity} />

      <TriageActionsBar
        primaryLabel={primaryLabel}
        primaryTone={primaryTone}
        enabled={true}
        onPrimary={onOpenRehabPlan}
        showOverflow
        onOverflow={() => { /* PDF/share flow — out of scope for v1 */ }}
      />
    </div>
  )
}

// ── Result → view-model adapters ──────────────────────────────────────────

function buildHero(result) {
  const top = result?.buckets?.[0]
  const severity = result?.severity?.level || 'moderate'
  const redFlags = result?.red_flags || []

  return {
    title: top?.title || result?.severity?.label || 'Likely overuse',
    why: top?.why || result?.severity?.action || '',
    redFlagBody: severity === 'severe' ? (redFlags[0] || result?.severity?.action) : null,
    actions: severity === 'severe' ? [] : deriveActionChips(result),
  }
}

function deriveActionChips(result) {
  // Pull short ✓/✗ phrases from result.plan when present. Falls back to a
  // small generic set so the hero never renders an empty action row.
  const plan = result?.plan || {}
  const out = []
  const immediate = plan['Immediate next 7–10 days'] || plan['Immediate next 7-10 days'] || []
  for (const line of immediate) {
    const low = String(line).toLowerCase()
    if (out.length >= 2) break
    if (/\bice\b/.test(low))        out.push({ kind: 'do',   text: 'Ice 15 min' })
    else if (/elevat/.test(low))    out.push({ kind: 'do',   text: 'Elevate' })
    else if (/open[- ]?hand/.test(low)) out.push({ kind: 'do', text: 'Open-hand only' })
  }
  const avoid = plan['What to avoid for now'] || plan['Avoid'] || []
  for (const line of avoid) {
    const low = String(line).toLowerCase()
    if (out.length >= 4) break
    if (/crimp/.test(low))          out.push({ kind: 'dont', text: 'No crimping' })
    else if (/hangboard/.test(low)) out.push({ kind: 'dont', text: 'No hangboard' })
    else if (/campus/.test(low))    out.push({ kind: 'dont', text: 'No campusing' })
    else if (/dyno|dynamic/.test(low)) out.push({ kind: 'dont', text: 'No dynos' })
  }
  return out
}

function buildAnswersStrip(form, result) {
  const sev = Number(form.severity) || 0
  const signals = (form.signal_chips || []).slice(0, 2).join(', ')
  return [
    { label: 'Onset',     value: form.onset || '—' },
    { label: 'Pain',      value: `${sev}/10`, tone: painTone(sev) },
    { label: 'Mechanism', value: form.mechanism || '—' },
    { label: 'Signals',   value: signals || 'none' },
  ]
}

function buildDifferentials(result) {
  return (result?.buckets || []).slice(1, 4).map((b) => ({
    title: b.title || '',
    subtitle: b.why || '',
  }))
}
