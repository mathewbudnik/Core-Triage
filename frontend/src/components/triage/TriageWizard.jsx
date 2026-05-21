import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTriageAutoscroll } from '../../hooks/useTriageAutoscroll'
import { chipsForRegion } from '../../data/signalChips'
import ChipGroup from './ChipGroup'
import PainSlider from './PainSlider'
import TriageRegionPill from './TriageRegionPill'
import TriageSummaryPill from './TriageSummaryPill'
import TriageSectionCard from './TriageSectionCard'
import TriageFingerDetails from './TriageFingerDetails'
import TriageHero from './TriageHero'
import TriageDifferentials from './TriageDifferentials'
import TriageAnswersStrip from './TriageAnswersStrip'
import TriageActionsBar from './TriageActionsBar'
import DiagnosisSkeleton from './DiagnosisSkeleton'

// Section order. Finger gets an extra `fingerDetails` step between mechanism
// and pain — captures which finger, palm-side location (A2 vs A4), and grip
// mode at injury so the classifier can grade pulleys.
const BASE_ORDER       = ['onset', 'mechanism', 'pain', 'anythingElse']
const FINGER_ORDER     = ['onset', 'mechanism', 'fingerDetails', 'pain', 'anythingElse']

const ONSET_OPTIONS = [
  { value: 'Gradual', label: 'Gradual' },
  { value: 'Sudden',  label: 'Sudden'  },
]

function painTone(v) {
  if (v <= 3) return '#14b8a6'
  if (v <= 6) return '#fbbf24'
  return '#fb7185'
}

// Build the initial state map for a given section order — first section
// focused, the rest dim. Used at mount and on region change.
function initialStatesFor(order) {
  return order.reduce((acc, key, idx) => {
    acc[key] = idx === 0 ? 'focused' : 'dim'
    return acc
  }, {})
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
  loading, result, error, mechanisms, fingerOptions,
}) {
  const { refFor, scrollTo } = useTriageAutoscroll()
  const isFinger = form.region === 'Finger'

  // Region-aware section order. Finger inserts a fingerDetails step before
  // pain so we collect A2/A4 + grip mode signals.
  const sectionOrder = useMemo(
    () => (isFinger ? FINGER_ORDER : BASE_ORDER),
    [isFinger]
  )
  // Compact label used in eyebrows ("1 of 4" / "1 of 5"). anythingElse
  // never appears in the count — it's "optional".
  const numbered = sectionOrder.filter((k) => k !== 'anythingElse')
  const stepNum = (key) => numbered.indexOf(key) + 1
  const stepTotal = numbered.length

  // Region-aware signal chips. Read from the canonical signalChips.js list
  // so the `value` is the chip id the classifier expects — avoids a silent
  // signal-loss regression where a wizard-local label diverges from the id.
  const signalOptions = useMemo(
    () => chipsForRegion(form.region).map((c) => ({ value: c.id, label: c.label })),
    [form.region]
  )

  // Section state map. Re-initialized when section order changes (region swap).
  const [states, setStates] = useState(() => initialStatesFor(sectionOrder))

  // Move a section to 'passed' and the next one to 'focused', then scroll.
  const advance = useCallback((from) => {
    const idx = sectionOrder.indexOf(from)
    if (idx < 0) return
    const next = sectionOrder[idx + 1]
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
  }, [scrollTo, sectionOrder])

  // Re-expand a passed section. Other sections' states are preserved.
  const editSection = useCallback((key) => {
    setStates((s) => ({ ...s, [key]: 'focused' }))
  }, [])

  // Skip the finger details section without compressing — just unblock pain.
  const skipFingerDetails = useCallback(() => {
    advance('fingerDetails')
  }, [advance])

  // Submit enabled when the three required sections have a value.
  const canSubmit = !!(form.onset && form.mechanism && form.severity != null)

  // Reset states whenever the region (and therefore section order) changes —
  // fresh wizard for a new injury.
  useEffect(() => {
    setStates(initialStatesFor(sectionOrder))
  }, [sectionOrder])

  // Auto-advance from fingerDetails once all three structured fields are set.
  // This matches the rest of the wizard's "complete = compress" rhythm.
  useEffect(() => {
    if (!isFinger) return
    if (states.fingerDetails !== 'focused') return
    if (form.which_finger && form.finger_location && form.grip_mode) {
      advance('fingerDetails')
    }
  }, [
    isFinger, states.fingerDetails,
    form.which_finger, form.finger_location, form.grip_mode,
    advance,
  ])

  // Compose the compressed pill value: "Ring · Palm-side middle (A2) · Full crimp".
  const fingerSummaryValue = useMemo(() => {
    if (!isFinger) return ''
    const wf = form.which_finger
    const fl = fingerOptions?.fingerLocation?.find((o) => o.key === form.finger_location)?.label
    const gm = fingerOptions?.gripMode?.find((o) => o.key === form.grip_mode)?.label
    return [wf, fl, gm].filter(Boolean).join(' · ')
  }, [
    isFinger, fingerOptions,
    form.which_finger, form.finger_location, form.grip_mode,
  ])

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
            eyebrow={`Essentials · ${stepNum('onset')} of ${stepTotal}`}
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
            eyebrow={`Mechanism · ${stepNum('mechanism')} of ${stepTotal}`}
            innerRef={refFor('mechanism')}
          >
            <p className="text-sm font-bold mb-2">What were you doing?</p>
            <ChipGroup options={mechanisms} value={form.mechanism} onChange={onPickMech} />
          </TriageSectionCard>
        )}

        {/* Finger details — only renders when region is Finger.
            Adds A2/A4 + grip-mode signal for pulley grading. */}
        {isFinger && (
          states.fingerDetails === 'passed' ? (
            <motion.div key="fd-summary" layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}>
              <TriageSummaryPill
                label="Finger details"
                value={fingerSummaryValue || 'Skipped'}
                onEdit={() => editSection('fingerDetails')}
              />
            </motion.div>
          ) : (
            <TriageSectionCard
              key="fd-card"
              state={states.fingerDetails}
              eyebrow={`Finger details · ${stepNum('fingerDetails')} of ${stepTotal}`}
              innerRef={refFor('fingerDetails')}
            >
              <TriageFingerDetails
                whichFingerOptions={fingerOptions?.whichFinger || []}
                fingerLocationOptions={fingerOptions?.fingerLocation || []}
                gripModeOptions={fingerOptions?.gripMode || []}
                whichFinger={form.which_finger}
                fingerLocation={form.finger_location}
                gripMode={form.grip_mode}
                onChange={onChange}
                onSkip={skipFingerDetails}
              />
            </TriageSectionCard>
          )
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
            eyebrow={`Pain · ${stepNum('pain')} of ${stepTotal}`}
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
          <p className="text-[11px] text-ct-cream/60 mt-2">Pick all that apply — or skip.</p>
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
        onOverflow={() => downloadGuidance(form, result)}
      />
    </div>
  )
}

// ── Guidance download ─────────────────────────────────────────────────────
// Bundles the diagnosis view as a plain-text file the user can save / share.
// Mobile Safari treats Blob downloads as files in the Files app.

function buildGuidanceText(form, result) {
  const sev = result?.severity || {}
  const top = result?.buckets?.[0]
  const diffs = (result?.buckets || []).slice(1, 4)
  const plan = result?.plan || {}
  const flags = result?.red_flags || []
  const protocol = result?.return_protocol || []
  const mods = result?.training_modifications || []
  const citations = result?.citations || []

  const L = []
  const stamp = new Date().toLocaleString()
  L.push(`CoreTriage — Guidance summary`)
  L.push(`Generated: ${stamp}`)
  L.push('')
  L.push(`Region: ${form.region || '—'}`)
  L.push(`Onset: ${form.onset || '—'}`)
  L.push(`Mechanism: ${form.mechanism || '—'}`)
  L.push(`Pain: ${form.severity ?? '—'}/10`)
  if (form.signal_chips?.length) L.push(`Signals: ${form.signal_chips.join(', ')}`)
  if (form.free_text) L.push(`Notes: ${form.free_text}`)
  L.push('')
  L.push(`Severity: ${sev.label || sev.level || '—'}`)
  if (sev.action) L.push(`Action: ${sev.action}`)
  L.push('')

  if (flags.length) {
    L.push('Red flags')
    flags.forEach((f) => L.push(`  • ${f}`))
    L.push('')
  }

  if (top) {
    L.push('Most likely')
    L.push(`  ${top.title || ''}`)
    if (top.why) L.push(`  ${top.why}`)
    L.push('')
  }

  if (diffs.length) {
    L.push('Other possibilities')
    diffs.forEach((b, i) => {
      L.push(`  ${i + 2}. ${b.title || ''}`)
      if (b.why) L.push(`     ${b.why}`)
      if (b.matches_if?.length) {
        L.push(`     Looks like this if:`)
        b.matches_if.forEach((line) => L.push(`       • ${line}`))
      }
      if (b.not_likely_if?.length) {
        L.push(`     Less likely if:`)
        b.not_likely_if.forEach((line) => L.push(`       • ${line}`))
      }
      if (b.quick_test) L.push(`     Quick self-check: ${b.quick_test}`)
    })
    L.push('')
  }

  const planEntries = Object.entries(plan)
  if (planEntries.length) {
    L.push('Plan')
    planEntries.forEach(([section, lines]) => {
      L.push(`  ${section}`)
      ;(Array.isArray(lines) ? lines : [String(lines)]).forEach((line) => {
        L.push(`    • ${line}`)
      })
    })
    L.push('')
  }

  if (mods.length) {
    L.push('Training modifications')
    mods.forEach((m) => L.push(`  • ${m}`))
    L.push('')
  }

  if (protocol.length) {
    L.push('Return-to-climbing protocol')
    protocol.forEach((p) => L.push(`  • ${typeof p === 'string' ? p : (p.text || JSON.stringify(p))}`))
    L.push('')
  }

  if (citations.length) {
    L.push('Citations')
    citations.forEach((c) => {
      const txt = typeof c === 'string' ? c : (c.title || c.source || JSON.stringify(c))
      L.push(`  • ${txt}`)
    })
    L.push('')
  }

  L.push('—')
  L.push('CoreTriage guidance is informational and not a substitute for in-person medical care.')
  return L.join('\n')
}

function downloadGuidance(form, result) {
  try {
    const text = buildGuidanceText(form, result)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const dateStr = new Date().toISOString().slice(0, 10)
    const region = (form.region || 'guidance').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const filename = `coretriage-${region}-${dateStr}.txt`
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    console.error('downloadGuidance failed', err)
  }
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
  const rows = [
    { label: 'Onset',     value: form.onset || '—' },
    { label: 'Pain',      value: `${sev}/10`, tone: painTone(sev) },
    { label: 'Mechanism', value: form.mechanism || '—' },
    { label: 'Signals',   value: signals || 'none' },
  ]
  // For finger triages, surface the structured fields the classifier used so
  // the user can see the picks that informed the diagnosis (A2 vs A4 hinge).
  if (form.region === 'Finger' && (form.which_finger || form.finger_location)) {
    const finger = [form.which_finger, form.finger_location].filter(Boolean).join(' · ')
    rows.push({ label: 'Finger', value: finger || '—' })
  }
  return rows
}

function buildDifferentials(result) {
  return (result?.buckets || []).slice(1, 4).map((b) => ({
    title: b.title || '',
    subtitle: b.why || '',
    matches_if: b.matches_if || [],
    not_likely_if: b.not_likely_if || [],
    quick_test: b.quick_test || '',
  }))
}
