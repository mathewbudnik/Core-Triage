import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, X, Check } from 'lucide-react'

// Schedule-driven interval timer. The exercise's `reps` field is parsed for
// timed work patterns ("6 × (7s on / 3s off)", "10s on / 50s off", etc.) and
// expanded into a flat schedule of phases:
//
//   prep (5s) → work (Xs) → innerRest (Ys) → work (Xs) → ... → longRest → ...
//
// The active step ticks down; at 00:00 it beeps + vibrates and auto-advances.
// Rep-based exercises that don't have a parsed work duration fall back to a
// user-paced work phase ("Done with set" advances).

const PREP_SECONDS = 5

function pad(n) { return String(n).padStart(2, '0') }
function fmt(secs) {
  const s = Math.max(0, Math.floor(secs))
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

// ── Audio + haptic ────────────────────────────────────────────────────────
let _audioCtx = null
function tone(freq = 880, ms = 180) {
  try {
    if (!_audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return
      _audioCtx = new Ctor()
    }
    const ctx = _audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.value = 0.18
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    setTimeout(() => { try { osc.stop() } catch {} }, ms)
  } catch {}
}
function buzz(pattern) {
  try { navigator.vibrate?.(pattern) } catch {}
}
// Play-style cue at transitions: higher tone for "go" (entering work),
// lower for "stop" (rest start), neutral for prep / done.
function cueFor(kind) {
  if (kind === 'work')         { tone(1320, 200); buzz([180, 60, 180]) }
  else if (kind === 'longRest' || kind === 'innerRest') { tone(660, 200); buzz([220]) }
  else if (kind === 'done')    { tone(880, 200); setTimeout(() => tone(1320, 240), 220); buzz([400]) }
  else                         { tone(880, 140); buzz([120]) }
}

// ── Reps-string parser ────────────────────────────────────────────────────
// Pulls workSeconds, repsPerSet, innerRestSeconds out of patterns like:
//   "6 × (7s on / 3s off)" → reps=6, work=7, innerRest=3
//   "7s on / 3s off"        → reps=1, work=7, innerRest=0  (inner ignored at reps=1)
//   "10s per arm"           → reps=1, work=10
//   "5s × 4"                → reps=4, work=5
// Returns null if no pattern matched (caller falls back to user-paced work).
function parseRepsPattern(repsStr) {
  if (!repsStr) return null
  const s = String(repsStr).toLowerCase().trim()

  // "N × (Xs on / Ys off)" / "N x (Xs on / Ys off)"
  let m = s.match(/(\d+)\s*[×x]\s*\(?\s*(\d+)\s*s\s+on\s*\/\s*(\d+)\s*s\s+off/)
  if (m) return { repsPerSet: +m[1], workSeconds: +m[2], innerRestSeconds: +m[3] }

  // "Xs on / Ys off" (no N prefix) — single rep with on/off pattern
  m = s.match(/(\d+)\s*s\s+on\s*\/\s*(\d+)\s*s\s+off/)
  if (m) return { repsPerSet: 1, workSeconds: +m[1], innerRestSeconds: 0 }

  // "Xs × N"  (work-first) or "N × Xs"  (count-first)
  m = s.match(/^(\d+)\s*s\s*[×x]\s*(\d+)/)
  if (m) return { repsPerSet: +m[2], workSeconds: +m[1], innerRestSeconds: 0 }
  m = s.match(/^(\d+)\s*[×x]\s*(\d+)\s*s\b/)
  if (m) return { repsPerSet: +m[1], workSeconds: +m[2], innerRestSeconds: 0 }

  // "Xs per arm" / "Xs hang" / standalone seconds — single timed rep
  m = s.match(/(\d+)\s*s\b/)
  if (m) return { repsPerSet: 1, workSeconds: +m[1], innerRestSeconds: 0 }

  return null
}

// ── Schedule builder ──────────────────────────────────────────────────────
// One step per phase. `userPaced` work has seconds=0 and won't auto-advance.
function buildSchedule(block) {
  const sets = Math.max(1, Number(block?.sets) || 1)
  const restSec = Math.max(1, Number(block?.rest_seconds) || 60)
  const parsed = parseRepsPattern(block?.reps)
  const out = []

  for (let set = 1; set <= sets; set++) {
    out.push({ kind: 'prep', seconds: PREP_SECONDS, set })

    if (parsed && parsed.workSeconds > 0) {
      const { repsPerSet, workSeconds, innerRestSeconds } = parsed
      for (let rep = 1; rep <= repsPerSet; rep++) {
        out.push({ kind: 'work', seconds: workSeconds, set, rep, repsPerSet })
        if (rep < repsPerSet && innerRestSeconds > 0) {
          out.push({ kind: 'innerRest', seconds: innerRestSeconds, set, rep, repsPerSet })
        }
      }
    } else {
      out.push({ kind: 'work', seconds: 0, set, rep: 1, repsPerSet: 1, userPaced: true })
    }

    if (set < sets) {
      out.push({ kind: 'longRest', seconds: restSec, set })
    }
  }

  out.push({ kind: 'done', seconds: 0, set: sets })
  return out
}

function indexOfFirstPrepFor(schedule, set) {
  for (let i = 0; i < schedule.length; i++) {
    if (schedule[i].set === set && schedule[i].kind === 'prep') return i
  }
  return 0
}

// ── Component ─────────────────────────────────────────────────────────────
/**
 * Schedule-driven interval timer. Accepts the full exercise block so it can
 * read `sets`, `reps`, and `rest_seconds` to derive a multi-phase schedule.
 *
 * Props:
 *   block:    object   — backend exercise block (sets/reps/rest_seconds)
 *   onClose:  () => void
 */
export default function ExerciseTimer({ block, onClose }) {
  const schedule = useMemo(() => buildSchedule(block), [block])
  const totalSets = block?.sets || 1
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(schedule[0]?.seconds || 0)
  const [running, setRunning] = useState(false)
  const tickRef = useRef(null)

  const step = schedule[index] || schedule[schedule.length - 1]
  const isUserPaced = step.kind === 'work' && step.userPaced
  const isDone = step.kind === 'done'
  const isResting = step.kind === 'longRest' || step.kind === 'innerRest'
  const isPrep = step.kind === 'prep'
  const isWork = step.kind === 'work' && !step.userPaced

  // Tick the countdown
  useEffect(() => {
    if (!running || isUserPaced || isDone) return
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [running, isUserPaced, isDone])

  // Auto-advance when a timed step hits zero
  useEffect(() => {
    if (!running || isUserPaced || isDone) return
    if (secondsLeft > 0) return
    clearInterval(tickRef.current)
    const nextIdx = Math.min(index + 1, schedule.length - 1)
    const next = schedule[nextIdx]
    cueFor(next.kind)
    setIndex(nextIdx)
    setSecondsLeft(next.seconds || 0)
    if (next.kind === 'done') setRunning(false)
  }, [secondsLeft, running, isUserPaced, isDone, index, schedule])

  function togglePlay() {
    if (isDone) return
    if (isUserPaced) {
      // "Done with set" — advance to whatever comes next
      const nextIdx = Math.min(index + 1, schedule.length - 1)
      const next = schedule[nextIdx]
      cueFor(next.kind)
      setIndex(nextIdx)
      setSecondsLeft(next.seconds || 0)
      setRunning(next.kind !== 'done')
      return
    }
    setRunning((r) => !r)
  }

  function nextSet() {
    // Find the next set's prep step
    const targetSet = Math.min(totalSets, step.set + 1)
    if (targetSet === step.set) {
      // Already on last set — jump to done
      const lastIdx = schedule.length - 1
      setIndex(lastIdx)
      setSecondsLeft(0)
      setRunning(false)
      return
    }
    const target = indexOfFirstPrepFor(schedule, targetSet)
    setIndex(target)
    setSecondsLeft(schedule[target].seconds || 0)
    setRunning(false)
  }

  function prevSet() {
    // If we're past the current set's prep, jump back to that prep first.
    // Otherwise step to the previous set's prep.
    const currentPrep = indexOfFirstPrepFor(schedule, step.set)
    if (index > currentPrep) {
      setIndex(currentPrep)
      setSecondsLeft(schedule[currentPrep].seconds || 0)
      setRunning(false)
      return
    }
    if (step.set <= 1) return
    const target = indexOfFirstPrepFor(schedule, step.set - 1)
    setIndex(target)
    setSecondsLeft(schedule[target].seconds || 0)
    setRunning(false)
  }

  function reset() {
    clearInterval(tickRef.current)
    setIndex(0)
    setSecondsLeft(schedule[0]?.seconds || 0)
    setRunning(false)
  }

  // ── UI bits ────────────────────────────────────────────────────────────
  const phaseLabel =
    isDone                 ? 'COMPLETE' :
    isPrep                 ? 'GET READY' :
    isUserPaced && running ? 'WORK' :
    isUserPaced            ? 'READY' :
    isWork && running      ? 'WORK' :
    isWork                 ? 'READY' :
    step.kind === 'longRest' ? 'REST BETWEEN SETS' :
    step.kind === 'innerRest' ? 'REST' :
                                'READY'

  // Color the countdown by phase — using ct- tokens where available
  const digitsColor =
    isDone                 ? 'var(--tier-light)' :
    isWork && running      ? '#d97757' :           // ct-terracotta
    isResting && running   ? '#fbd470' :           // gold during rest
    isPrep && running      ? '#fda4af' :           // coral during prep
                              'rgba(240,245,237,0.92)' // ct-cream approx

  const phaseColor =
    isDone                 ? 'var(--tier-light)' :
    isWork                 ? '#d97757' :           // ct-terracotta
    isResting              ? '#fbd470' :
    isPrep                 ? '#fda4af' :
                              'rgba(240,245,237,0.55)' // ct-cream/55 approx

  // Subtitle line: "Set 2 / 4" plus optional "Rep 3 / 6" if mid-set
  const repMeta = step.repsPerSet && step.repsPerSet > 1 && (isWork || step.kind === 'innerRest')
    ? <> · Rep <span className="text-ct-cream font-extrabold">{step.rep}</span><span className="opacity-60">/{step.repsPerSet}</span></>
    : null

  const playIcon = isDone
    ? <Check size={28} strokeWidth={2.6} />
    : (running && !isUserPaced)
      ? <Pause size={26} strokeWidth={2.4} fill="currentColor" />
      : <Play  size={26} strokeWidth={2.4} fill="currentColor" />
  const playAriaLabel =
    isDone ? 'Done' :
    isUserPaced ? 'Done with set' :
    running ? 'Pause' :
    'Play'

  const canPrev = index > 0 && !isDone
  const canNext = step.set < totalSets || !isDone

  // For user-paced work, show "—" or the long-rest preview rather than 0
  const displaySeconds = isUserPaced ? null : secondsLeft

  return (
    <div className="mt-3 px-4 py-4 rounded-2xl
                    bg-ct-terra-tint border-[0.5px] border-ct-terracotta/30
                    relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close timer"
        className="absolute top-2.5 right-2.5 p-1.5 rounded-full
                   text-ct-cream/60 hover:text-ct-cream hover:bg-white/[0.06] transition-colors"
      >
        <X size={14} strokeWidth={2.4} />
      </button>

      <div className="flex items-center justify-between pr-7 mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
           style={{ color: phaseColor }}>
          {phaseLabel}
        </p>
        <p className="text-[11px] font-bold text-ct-cream/60 tabular-nums">
          Set <span className="text-ct-cream font-extrabold">{step.set}</span>
          <span className="opacity-60">/{totalSets}</span>
          {repMeta}
        </p>
      </div>

      <div className="flex items-center justify-center py-2 mb-3 min-h-[72px]">
        {isDone ? (
          <div className="flex items-center gap-2">
            <Check size={28} strokeWidth={2.8} style={{ color: 'var(--tier-light)' }} />
            <p className="text-[28px] font-extrabold -tracking-[0.025em]"
               style={{ color: 'var(--tier-light)' }}>
              All sets done
            </p>
          </div>
        ) : isUserPaced ? (
          <p className="text-[18px] font-extrabold text-ct-cream/60 tracking-[0.04em]">
            {running ? 'Tap when finished' : 'Tap Play to begin'}
          </p>
        ) : (
          <p className="text-[56px] sm:text-[60px] font-extrabold leading-none
                        -tracking-[0.04em] tabular-nums text-ct-cream"
             style={{ color: digitsColor }}>
            {fmt(displaySeconds)}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <motion.button
          type="button"
          onClick={prevSet}
          disabled={!canPrev}
          whileTap={canPrev ? { scale: 0.92 } : undefined}
          aria-label="Previous set"
          className="w-12 h-12 rounded-full flex items-center justify-center
                     bg-ct-hairline border-[0.5px] border-ct-rim
                     text-ct-cream/80 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipBack size={18} strokeWidth={2.4} fill={canPrev ? 'currentColor' : 'none'} />
        </motion.button>

        <motion.button
          type="button"
          onClick={togglePlay}
          disabled={isDone}
          whileTap={!isDone ? { scale: 0.94 } : undefined}
          aria-label={playAriaLabel}
          className={`w-[72px] h-[72px] rounded-full flex items-center justify-center
                     shadow-[0_4px_16px_rgba(217,119,87,0.28)]
                     disabled:opacity-60 ${isDone ? 'bg-white/10 text-ct-cream/60' : 'bg-ct-terracotta text-ct-cream'}`}
        >
          {playIcon}
        </motion.button>

        <motion.button
          type="button"
          onClick={nextSet}
          disabled={!canNext}
          whileTap={canNext ? { scale: 0.92 } : undefined}
          aria-label="Next set"
          className="w-12 h-12 rounded-full flex items-center justify-center
                     bg-ct-hairline border-[0.5px] border-ct-rim
                     text-ct-cream/80 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipForward size={18} strokeWidth={2.4} fill={canNext ? 'currentColor' : 'none'} />
        </motion.button>
      </div>

      <div className="flex justify-center mt-3.5">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full
                     text-[10.5px] font-bold uppercase tracking-[0.06em]
                     text-ct-cream/60 hover:text-ct-cream transition-colors"
        >
          <RotateCcw size={11} strokeWidth={2.4} />
          Reset
        </button>
      </div>
    </div>
  )
}
