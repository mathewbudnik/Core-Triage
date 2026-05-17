import { useState, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Clock, Zap, Grip, Target, TrendingUp, Mountain, ChevronsUp, HelpCircle,
  RotateCcw, RotateCw, ArrowUp, Maximize2, AlertCircle,
} from 'lucide-react'
import { triageIntake, saveSession } from '../api'
import { saveLastTriage } from '../lib/lastTriage'
import BodyDiagram from './BodyDiagram'
import Coachmark from './Coachmark'
import TourReplayButton from './TourReplayButton'
import useTriageTour from '../hooks/useTriageTour'
import TriageWizard from './triage/TriageWizard'
import { buildSignalsFreeText, chipStructuredFields } from '../data/signalChips'

// ── Data ──────────────────────────────────────────────────────────────────────

const LOWER_BODY = ['Knee', 'Hip', 'Lower Back']

const MECHANISMS = {
  upper: [
    { value: 'Hard crimp',           label: 'Gripping a small hold',  Icon: Grip       },
    { value: 'Dynamic catch',        label: 'Catching a big jump',    Icon: Zap        },
    { value: 'Pocket',               label: 'Pocket hold',            Icon: Target     },
    { value: 'High volume pulling',  label: 'Lots of climbing',       Icon: TrendingUp },
    { value: 'Steep climbing/board', label: 'Steep or overhang',      Icon: Mountain   },
    { value: 'Campusing',            label: 'No-feet moves',          Icon: ChevronsUp },
    { value: 'Unknown/other',        label: 'Not sure',               Icon: HelpCircle },
  ],
  lower: [
    { value: 'Heel hook',            label: 'Heel hook',        Icon: RotateCcw  },
    { value: 'Drop knee',            label: 'Drop knee',        Icon: RotateCw   },
    { value: 'High step / rockover', label: 'High step',        Icon: ArrowUp    },
    { value: 'Stemming / bridging',  label: 'Stemming',         Icon: Maximize2  },
    { value: 'High volume climbing', label: 'Lots of climbing', Icon: TrendingUp },
    { value: 'Fall',                 label: 'A fall',           Icon: AlertCircle},
    { value: 'Unknown/other',        label: 'Not sure',         Icon: HelpCircle },
  ],
}

const WHICH_FINGER_OPTIONS = [
  'Index', 'Middle', 'Ring', 'Pinky', 'Thumb', 'Multiple',
]

const FINGER_LOCATION_OPTIONS = [
  { key: 'palm_base', label: 'Palm-side base (A1)' },
  { key: 'palm_mid',  label: 'Palm-side middle (A2)' },
  { key: 'palm_tip',  label: 'Palm-side tip (A4)' },
  { key: 'side',      label: 'Side of a joint' },
  { key: 'dorsal',    label: 'Back of the finger' },
  { key: 'whole',     label: 'Whole finger' },
]

const GRIP_MODE_OPTIONS = [
  { key: 'full_crimp',   label: 'Full crimp' },
  { key: 'half_crimp',   label: 'Half crimp' },
  { key: 'open_hand',    label: 'Open hand / drag' },
  { key: 'pocket_1',     label: 'Pocket (1)' },
  { key: 'pocket_2',     label: 'Pocket (2)' },
  { key: 'pinch',        label: 'Pinch' },
  { key: 'sloper',       label: 'Sloper' },
  { key: 'jam',          label: 'Jam' },
  { key: 'not_climbing', label: 'Not climbing' },
]

// ── Flow ──────────────────────────────────────────────────────────────────────
// Two screens: body diagram → smart card. Finger context lives inside the card.

const FLOW = ['', 'card']
const RESULTS_SLUG = 'results'

function pathToStep(pathname) {
  const seg = pathname.replace(/^\/triage\/?/, '').split('/')[0]
  if (seg === RESULTS_SLUG) return 'results'
  const idx = FLOW.indexOf(seg)
  return idx >= 0 ? idx : 0
}

function stepToPath(step) {
  if (step === 'results') return `/triage/${RESULTS_SLUG}`
  const slug = FLOW[step] || ''
  return slug ? `/triage/${slug}` : '/triage'
}

const INITIAL_FORM = {
  region: '', onset: '', mechanism: '', pain_type: '',
  severity: 5, swelling: 'No', bruising: 'No',
  numbness: 'No', weakness: 'None', instability: 'No', free_text: '',
  which_finger: '', finger_location: '', grip_mode: '',
  signal_chips: [],
}

export default function TriageTab({ k, user }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [form, setForm]     = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  const urlStep = pathToStep(location.pathname)
  const step = urlStep === 'results' ? 0 : urlStep
  const isResultsRoute = urlStep === 'results'
  const currentSlug = FLOW[step] || ''

  // Stable setter — only depends on setForm which is stable from useState.
  const set = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), [])

  const mechanisms = LOWER_BODY.includes(form.region) ? MECHANISMS.lower : MECHANISMS.upper

  // Legacy /triage/results path no longer renders a results page — bounce
  // to the start so the URL doesn't strand users on a dead route.
  useEffect(() => {
    if (isResultsRoute) navigate('/triage', { replace: true })
  }, [isResultsRoute, navigate])

  // Direct URL access to /triage/card without a region → bounce to step 0.
  useEffect(() => {
    if (!isResultsRoute && step >= 1 && !form.region) {
      navigate('/triage', { replace: true })
    }
  }, [step, isResultsRoute, form.region, navigate])

  // Back to step 0 (browser back, refresh, or "change region" link) wipes
  // the wizard so the diagram and downstream fields start clean.
  useEffect(() => {
    if (!isResultsRoute && step === 0) {
      setForm((f) => (f.region ? INITIAL_FORM : f))
      setResult(null)
      setError(null)
    }
  }, [step, isResultsRoute])

  const selectRegion = useCallback((value) => {
    const isLower  = LOWER_BODY.includes(value)
    const wasLower = LOWER_BODY.includes(form.region)
    setForm((f) => ({ ...f, region: value, mechanism: isLower !== wasLower ? '' : f.mechanism }))
    navigate(stepToPath(1))
  }, [form.region, navigate])

  const returnToRegion = useCallback(() => {
    // Effect at step === 0 resets the form for us; just navigate.
    navigate(stepToPath(0))
  }, [navigate])

  // Tour wiring — only the region-picker step has a coachmark; the smart card
  // is self-explanatory.
  const tour = useTriageTour({ slug: currentSlug, totalSteps: FLOW.length })

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Synthesize free_text from selected chips (+ any optional typed text).
      // The classifier in src/triage.py reads free_text via _keyword_affirmed,
      // so chip phrases must contain the matching substrings — see
      // signalChips.js and tests/test_signal_chips_keywords.py.
      const synthesizedFreeText = buildSignalsFreeText(form.signal_chips, form.free_text)
      const chipFields = chipStructuredFields(form.signal_chips)

      const data = await triageIntake({
        ...form,
        ...chipFields,
        free_text: synthesizedFreeText,
        severity: Number(form.severity),
        which_finger: form.which_finger || '',
        finger_location: form.finger_location || '',
        grip_mode: form.grip_mode || '',
        k,
      })
      setResult(data)

      // Best-effort session save for signed-in users (non-fatal on failure —
      // free-tier limit / network blip; /body's sessionStorage fallback covers it).
      if (user) {
        try {
          await saveSession({
            injury_area: form.region,
            pain_level:  Number(form.severity),
            pain_type:   form.pain_type,
            onset:       form.onset,
          })
        } catch (_) { /* swallowed */ }
      }

      // sessionStorage cache so refreshing /body keeps the diagnosis.
      saveLastTriage({
        result: data,
        form: { region: form.region, severity: form.severity, onset: form.onset },
      })
      // NOTE: we deliberately do NOT navigate here. The diagnosis reveals
      // inline in the TriageWizard. The "Open my rehab plan" CTA below
      // is what navigates to /body.
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [form, k, user])

  const openRehabPlan = useCallback(() => {
    if (!result) return
    navigate('/body', {
      state: {
        triageResult: result,
        triageForm:   { region: form.region, severity: form.severity, onset: form.onset },
      },
    })
  }, [result, form.region, form.severity, form.onset, navigate])

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Step 0: body diagram */}
      {currentSlug === '' && (
        <>
          <div className="mb-8 space-y-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold text-text">Where does it hurt?</h2>
                <TourReplayButton onReplay={tour.replay} />
              </div>
              <p className="text-sm text-muted mt-1">Tap the area that is bothering you</p>
            </div>
          </div>
          <div ref={tour.anchor('region-diagram')}>
            <BodyDiagram selected={form.region} onSelect={selectRegion} />
          </div>
        </>
      )}

      {/* Step 1: smart card (form → skeleton → inline diagnosis) */}
      {currentSlug === 'card' && form.region && (
        <TriageWizard
          form={form}
          onChange={set}
          onChangeRegion={returnToRegion}
          onSubmit={handleSubmit}
          onOpenRehabPlan={openRehabPlan}
          loading={loading}
          result={result}
          error={error}
          mechanisms={mechanisms}
        />
      )}

      <Coachmark tour={tour} />
    </div>
  )
}
