import { useState, useMemo } from 'react'
import ClimbLogSection from '../ClimbLogSection'
import RewardPreview from './RewardPreview'
import { getActiveStyle } from '../../lib/styleStore'
import { previewSendXP } from '../../lib/sendPreview'

/**
 * Multi-grade session logging surface. Wraps ClimbLogSection and shows a live
 * XP roll-up across every counter.
 *
 * Props:
 *   value:       { boulder?: {...}, route?: {...} } — current climbs dict
 *   onChange:    (next) => void
 *   sessionType: string
 *   engineState: object
 *   defaultTab:  'boulder' | 'route'  — which tab ClimbLogSection opens on
 */
export default function LogSendDeep({ value, onChange, sessionType, engineState, defaultTab = 'boulder' }) {
  // Local state for the active style so XP preview re-renders when the user
  // taps a style chip inside ClimbLogSection. ClimbLogSection calls
  // onStyleChange whenever its internal style changes, which updates this
  // state and triggers a re-render with the correct style.
  const [activeStyle, setActiveStyle] = useState(getActiveStyle)

  const { totalXP, totalSends } = useMemo(() => {
    let xpSum = 0
    let count = 0
    for (const discipline of ['boulder', 'route']) {
      const gradeMap = value?.[discipline] || {}
      for (const [grade, counters] of Object.entries(gradeMap)) {
        if (!counters) continue
        // Fix 3: pass isDeepLog: true so Deep mode gets the 1.25x bonus
        for (let i = 0; i < (counters.s || 0); i++) {
          xpSum += previewSendXP({ grade, outcome: 'redpoint', stylePrimary: activeStyle, sessionType, isDeepLog: true }, engineState).xp
          count += 1
        }
        for (let i = 0; i < (counters.f || 0); i++) {
          xpSum += previewSendXP({ grade, outcome: 'flash', stylePrimary: activeStyle, sessionType, isDeepLog: true }, engineState).xp
          count += 1
        }
      }
    }
    return { totalXP: xpSum, totalSends: count }
  }, [value, sessionType, engineState, activeStyle])

  return (
    <div className="space-y-3">
      <p className="ct-eyebrow">Log a session</p>
      <RewardPreview
        xp={totalXP}
        breakdown={totalSends > 0 ? `${totalSends} send${totalSends === 1 ? '' : 's'}` : 'No climbs yet'}
        label="SESSION TOTAL"
      />
      <ClimbLogSection
        value={value}
        onChange={onChange}
        defaultTab={defaultTab}
        onStyleChange={setActiveStyle}
      />
    </div>
  )
}
