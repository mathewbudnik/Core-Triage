import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, X, Check } from 'lucide-react'

// Traditional set/rest interval timer with full transport controls.
// State machine per set:
//   work  → user does their reps. Big digits show the rest duration that's
//           queued up so the climber sees what's coming. Tap Play to start.
//   rest  → countdown runs. Beep + vibrate at 00:00, then auto-advance to
//           the next set's work phase.
//   done  → all sets complete.
// Controls (big tap targets, mobile-friendly):
//   • Prev set / Play-Pause / Next set as 3 circular buttons in a row
//   • Reset (smaller, below)
//   • Close (X in the corner)

function pad(n) { return String(n).padStart(2, '0') }
function fmt(secs) {
  const s = Math.max(0, Math.floor(secs))
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

// 180ms 880Hz sine. Lazy AudioContext init so autoplay policies don't block.
let _audioCtx = null
function beep() {
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
    osc.frequency.value = 880
    gain.gain.value = 0.18
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    setTimeout(() => { try { osc.stop() } catch {} }, 180)
  } catch {}
}
function buzz() {
  try { navigator.vibrate?.([200, 80, 200]) } catch {}
}

/**
 * Set + rest interval timer for one exercise.
 *
 * Props:
 *   totalSets:   number   — how many sets to walk through
 *   restSeconds: number   — inter-set rest duration in seconds
 *   onClose:     () => void
 */
export default function ExerciseTimer({ totalSets, restSeconds, onClose }) {
  const safeRest = Math.max(1, Number(restSeconds) || 60)
  const safeTotal = Math.max(1, Number(totalSets) || 1)

  const [currentSet, setCurrentSet] = useState(1)
  const [phase, setPhase] = useState('work')     // 'work' | 'rest' | 'done'
  const [secondsLeft, setSecondsLeft] = useState(safeRest)
  const [running, setRunning] = useState(false)
  const tickRef = useRef(null)

  // Countdown tick
  useEffect(() => {
    if (phase !== 'rest' || !running) return
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [phase, running])

  // Rest completion handler
  useEffect(() => {
    if (phase !== 'rest' || secondsLeft > 0) return
    clearInterval(tickRef.current)
    beep(); buzz()
    if (currentSet < safeTotal) {
      setCurrentSet((s) => s + 1)
      setPhase('work')
      setSecondsLeft(safeRest)
      setRunning(false)
    } else {
      setPhase('done')
      setRunning(false)
    }
  }, [secondsLeft, phase, currentSet, safeTotal, safeRest])

  function togglePlay() {
    if (phase === 'done') return
    if (phase === 'work') {
      // User has finished their reps — start the rest countdown.
      setPhase('rest')
      setSecondsLeft(safeRest)
      setRunning(true)
      return
    }
    // phase === 'rest' — toggle pause/resume
    setRunning((r) => !r)
  }

  function nextSet() {
    if (currentSet >= safeTotal) {
      setPhase('done')
      setRunning(false)
      return
    }
    setCurrentSet((s) => s + 1)
    setPhase('work')
    setSecondsLeft(safeRest)
    setRunning(false)
  }

  function prevSet() {
    if (currentSet <= 1 && phase === 'work') return
    if (phase !== 'work') {
      // Going back from rest just rewinds to the same set's work phase.
      setPhase('work')
      setSecondsLeft(safeRest)
      setRunning(false)
      return
    }
    setCurrentSet((s) => Math.max(1, s - 1))
    setPhase('work')
    setSecondsLeft(safeRest)
    setRunning(false)
  }

  function reset() {
    clearInterval(tickRef.current)
    setCurrentSet(1)
    setPhase('work')
    setSecondsLeft(safeRest)
    setRunning(false)
  }

  const phaseLabel =
    phase === 'done'              ? 'COMPLETE' :
    phase === 'rest' && running   ? 'RESTING'  :
    phase === 'rest' && !running  ? 'PAUSED'   :
                                    'READY'
  const phaseColor =
    phase === 'done' ? 'var(--tier-light)' :
    phase === 'rest' ? 'var(--tier-light)' :
                       'rgba(255,255,255,0.55)'

  const playIcon = phase === 'rest' && running
    ? <Pause size={26} strokeWidth={2.4} fill="currentColor" />
    : phase === 'done'
      ? <Check size={26} strokeWidth={2.6} />
      : <Play size={26} strokeWidth={2.4} fill="currentColor" />
  const playAriaLabel =
    phase === 'done' ? 'Done' :
    phase === 'rest' && running ? 'Pause' :
    phase === 'rest' && !running ? 'Resume' :
                                   'Start rest'

  const canPrev = currentSet > 1 || phase !== 'work'
  const canNext = !(currentSet >= safeTotal && phase === 'done')

  return (
    <div className="mt-3 px-4 py-4 rounded-2xl
                    bg-[color:color-mix(in_srgb,var(--tier-c)_6%,#0a0a0c_94%)]
                    border-[0.5px] border-[color:color-mix(in_srgb,var(--tier-c)_28%,transparent)]
                    relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close timer"
        className="absolute top-2.5 right-2.5 p-1.5 rounded-full
                   text-muted hover:text-text hover:bg-white/[0.06] transition-colors"
      >
        <X size={14} strokeWidth={2.4} />
      </button>

      <div className="flex items-center justify-between pr-7 mb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
           style={{ color: phaseColor }}>
          {phaseLabel}
        </p>
        <p className="text-[11px] font-bold text-muted tabular-nums">
          Set <span className="text-text font-extrabold">{currentSet}</span>
          <span className="opacity-60"> / {safeTotal}</span>
        </p>
      </div>

      <div className="flex items-center justify-center py-2 mb-3">
        {phase === 'done' ? (
          <div className="flex items-center gap-2">
            <Check size={28} strokeWidth={2.8} style={{ color: 'var(--tier-light)' }} />
            <p className="text-[28px] font-extrabold -tracking-[0.025em]"
               style={{ color: 'var(--tier-light)' }}>
              All sets done
            </p>
          </div>
        ) : (
          <p className="text-[56px] sm:text-[60px] font-extrabold leading-none
                        -tracking-[0.04em] tabular-nums"
             style={{
               color: phase === 'rest' && running
                 ? 'var(--tier-light)'
                 : 'rgba(255,255,255,0.92)',
             }}>
            {fmt(secondsLeft)}
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
                     bg-white/[0.05] border-[0.5px] border-white/[0.12]
                     text-text disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipBack size={18} strokeWidth={2.4} fill={canPrev ? 'currentColor' : 'none'} />
        </motion.button>

        <motion.button
          type="button"
          onClick={togglePlay}
          disabled={phase === 'done'}
          whileTap={phase !== 'done' ? { scale: 0.94 } : undefined}
          aria-label={playAriaLabel}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center
                     shadow-[0_4px_16px_color-mix(in_srgb,var(--tier-c)_28%,transparent)]
                     disabled:opacity-60"
          style={{
            background: phase === 'done' ? 'rgba(255,255,255,0.10)' : 'var(--tier-c)',
            color: phase === 'done' ? 'var(--tier-light)' : 'var(--bg, #06120f)',
          }}
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
                     bg-white/[0.05] border-[0.5px] border-white/[0.12]
                     text-text disabled:opacity-30 disabled:cursor-not-allowed"
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
                     text-muted hover:text-text transition-colors"
        >
          <RotateCcw size={11} strokeWidth={2.4} />
          Reset
        </button>
      </div>
    </div>
  )
}
