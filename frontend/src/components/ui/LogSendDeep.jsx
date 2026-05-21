import { useMemo } from 'react'
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
 */
export default function LogSendDeep({ value, onChange, sessionType, engineState }) {
  const { totalXP, totalSends } = useMemo(() => {
    const style = getActiveStyle()
    let xpSum = 0
    let count = 0
    for (const discipline of ['boulder', 'route']) {
      const gradeMap = value?.[discipline] || {}
      for (const [grade, counters] of Object.entries(gradeMap)) {
        if (!counters) continue
        for (let i = 0; i < (counters.s || 0); i++) {
          xpSum += previewSendXP({ grade, outcome: 'redpoint', stylePrimary: style, sessionType }, engineState).xp
          count += 1
        }
        for (let i = 0; i < (counters.f || 0); i++) {
          xpSum += previewSendXP({ grade, outcome: 'flash', stylePrimary: style, sessionType }, engineState).xp
          count += 1
        }
      }
    }
    return { totalXP: xpSum, totalSends: count }
  }, [value, sessionType, engineState])

  return (
    <div className="space-y-3">
      <p className="ct-eyebrow">Log a session</p>
      <RewardPreview
        xp={totalXP}
        breakdown={totalSends > 0 ? `${totalSends} send${totalSends === 1 ? '' : 's'}` : 'No climbs yet'}
        label="SESSION TOTAL"
      />
      <ClimbLogSection value={value} onChange={onChange} />
    </div>
  )
}
