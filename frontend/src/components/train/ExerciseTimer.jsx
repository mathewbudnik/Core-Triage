import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, SkipForward, RotateCcw, Check } from 'lucide-react'

// Big-digit, set-tracking rest-interval timer. The work phase is user-paced
// (climber does their reps, then taps "Start rest"); the rest countdown is
// automated with a beep + vibrate when it lands at 00:00 and auto-advances to
// the next set.

function pad(n) { return String(n).padStart(2, '0') }
function fmt(secs) {
  const s = Math.max(0, Math.floor(secs))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${pad(m)}:${pad(r)}`
}

// One short beep — 880Hz sine, 180ms. Created lazily inside the click handler
// so autoplay policies don't block.
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
    gain.gain.value = 0.15
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    setTimeout(() => { try { osc.stop() } catch {} }, 180)
  } catch {}
}

function buzz() {
  try { navigator.vibrate?.([200, 80, 200]) } catch {}
}

/**
 * Rest-interval timer for one exercise. Tracks current set, runs a countdown
 * during rest, beeps + vibrates + auto-advances on completion.
 *
 * Props:
 *   totalSets:   number   — how many sets in this exercise
 *   restSeconds: number   — inter-set rest duration in seconds
 *   onClose:     () => void
 */
export default function ExerciseTimer({ totalSets, restSeconds, onClose }) {
  const [currentSet, setCurrentSet] = useState(1)
  const [mode, setMode] = useState('idle')  // 'idle' | 'resting' | 'done'
  const [secondsLeft, setSecondsLeft] = useState(restSeconds || 60)
  const tickRef = useRef(null)

  // Tick the countdown
  useEffect(() => {
    if (mode !== 'resting') return
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [mode])

  // Handle rest completion
  useEffect(() => {
    if (mode !== 'resting' || secondsLeft > 0) return
    clearInterval(tickRef.current)
    beep(); buzz()
    if (currentSet < totalSets) {
      setCurrentSet((s) => s + 1)
      setMode('idle')
      setSecondsLeft(restSeconds || 60)
    } else {
      setMode('done')
    }
  }, [secondsLeft, mode, currentSet, totalSets, restSeconds])

  function startRest() {
    setSecondsLeft(restSeconds || 60)
    setMode('resting')
  }
  function skipRest() {
    // jumping straight to 0 lets the completion effect run uniformly
    setSecondsLeft(0)
  }
  function reset() {
    clearInterval(tickRef.current)
    setCurrentSet(1)
    setMode('idle')
    setSecondsLeft(restSeconds || 60)
  }

  return (
    <div className="mt-3 px-3.5 py-3.5 rounded-2xl
                    bg-[color:color-mix(in_srgb,var(--tier-c)_6%,#0a0a0c_94%)]
                    border-[0.5px] border-[color:color-mix(in_srgb,var(--tier-c)_28%,transparent)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em]"
           style={{ color: 'var(--tier-light)' }}>
          {mode === 'resting' ? 'Resting' : mode === 'done' ? 'Complete' : 'Ready'}
        </p>
        <p className="text-[10px] font-bold text-muted tabular-nums">
          Set <span className="text-text">{currentSet}</span> / {totalSets}
        </p>
      </div>

      <div className="flex items-center justify-center py-1.5">
        {mode === 'done' ? (
          <div className="flex items-center gap-2">
            <Check size={22} strokeWidth={2.8} style={{ color: 'var(--tier-light)' }} />
            <p className="text-[24px] font-extrabold -tracking-[0.02em]" style={{ color: 'var(--tier-light)' }}>
              All sets done
            </p>
          </div>
        ) : (
          <p className="text-[44px] font-extrabold leading-none -tracking-[0.04em] tabular-nums"
             style={{ color: mode === 'resting' ? 'var(--tier-light)' : 'rgba(255,255,255,0.85)' }}>
            {fmt(mode === 'resting' ? secondsLeft : restSeconds)}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        {mode === 'idle' && (
          <motion.button
            type="button"
            onClick={startRest}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full
                       text-[11.5px] font-extrabold -tracking-[0.01em]"
            style={{ background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }}
          >
            <Play size={11} strokeWidth={3} />
            Start rest
          </motion.button>
        )}
        {mode === 'resting' && (
          <motion.button
            type="button"
            onClick={skipRest}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full
                       bg-white/[0.05] border-[0.5px] border-white/[0.12]
                       text-[11.5px] font-bold text-text"
          >
            <SkipForward size={11} strokeWidth={2.6} />
            Skip rest
          </motion.button>
        )}
        <motion.button
          type="button"
          onClick={reset}
          whileTap={{ scale: 0.97 }}
          aria-label="Reset"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full
                     bg-white/[0.04] border-[0.5px] border-white/[0.10] text-muted hover:text-text"
        >
          <RotateCcw size={11} strokeWidth={2.4} />
        </motion.button>
        <button
          type="button"
          onClick={onClose}
          className="ml-1 text-[10px] font-bold text-muted hover:text-text px-1.5 py-1"
        >
          Close
        </button>
      </div>
    </div>
  )
}
