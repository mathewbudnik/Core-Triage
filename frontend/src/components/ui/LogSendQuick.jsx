import { useState } from 'react'
import { motion } from 'framer-motion'
import StyleChipStrip from '../StyleChipStrip'
import RewardPreview from './RewardPreview'
import { getActiveStyle, setActiveStyle } from '../../lib/styleStore'
import { previewSendXP } from '../../lib/sendPreview'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

const QUICK_GRADES_BOULDER = ['V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10']

const OUTCOMES = [
  { id: 'flash',    label: 'Flash',    helper: 'First try' },
  { id: 'redpoint', label: 'Redpoint', helper: 'Worked it' },
  { id: 'project',  label: 'Project',  helper: 'Sessions of work' },
]

/**
 * Single-climb logging surface. The primary entry point on Train.
 *
 * Props:
 *   sessionType: string — passed from TrainingLogEntry (drives modality)
 *   engineState: object — current rewardEngine state (for PR + gap preview)
 *   onCommit:    ({ grade, outcome, stylePrimary }) => void — single-send draft to add to the parent's climbs payload
 */
export default function LogSendQuick({ sessionType, engineState, onCommit }) {
  const [grade, setGrade]     = useState(null)
  const [outcome, setOutcome] = useState('redpoint')
  const [style, setStyle]     = useState(getActiveStyle)
  const tap = useReducedTransition(TRANSITIONS.chip_tap)

  const draft = { grade, outcome, stylePrimary: style, sessionType }
  const { xp, breakdown } = previewSendXP(draft, engineState)

  function commitStyle(next) {
    setStyle(next)
    setActiveStyle(next)
  }

  function handleAdd() {
    if (!grade) return
    onCommit({ grade, outcome, stylePrimary: style })
    setGrade(null)
  }

  return (
    <div className="space-y-3">
      <p className="ct-eyebrow">Log a send</p>

      <div className="overflow-x-auto -mx-3 px-3 no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {QUICK_GRADES_BOULDER.map((g) => {
            const active = g === grade
            return (
              <motion.button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                whileTap={{ scale: 0.94 }}
                transition={tap}
                aria-pressed={active}
                className={[
                  'px-3 py-2 rounded-xl text-sm font-bold border',
                  active
                    ? 'bg-ct-terracotta/15 border-ct-terracotta/45 text-ct-terra-soft'
                    : 'bg-transparent border-ct-hairline text-ct-cream/70',
                ].join(' ')}
              >
                {g}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {OUTCOMES.map((o) => {
          const active = o.id === outcome
          return (
            <motion.button
              key={o.id}
              type="button"
              onClick={() => setOutcome(o.id)}
              whileTap={{ scale: 0.96 }}
              transition={tap}
              aria-pressed={active}
              className={[
                'flex flex-col items-start px-3 py-2 rounded-xl border text-left',
                active
                  ? 'bg-ct-moss/15 border-ct-moss/40 text-ct-cream'
                  : 'bg-transparent border-ct-hairline text-ct-cream/70',
              ].join(' ')}
            >
              <span className="text-sm font-bold">{o.label}</span>
              <span className="text-[10px] opacity-70">{o.helper}</span>
            </motion.button>
          )
        })}
      </div>

      <StyleChipStrip value={style} onChange={commitStyle} />

      <RewardPreview xp={xp} breakdown={breakdown || 'Pick a grade'} />

      <button
        type="button"
        disabled={!grade}
        onClick={handleAdd}
        className={[
          'w-full py-2.5 rounded-xl text-sm font-bold',
          grade
            ? 'bg-ct-terracotta text-white'
            : 'bg-ct-cream/10 text-ct-cream/40 cursor-not-allowed',
        ].join(' ')}
      >
        {grade ? `Add ${grade}` : 'Pick a grade'}
      </button>
    </div>
  )
}
