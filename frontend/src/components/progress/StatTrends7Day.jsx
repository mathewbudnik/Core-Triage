import { useMemo } from 'react'
import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'
import { useRewardEngine } from '../../lib/rewardEngine'
import { bucketSendsByDay } from '../../lib/sendBuckets'
import { STYLE_COLOR } from '../../lib/styleColors'

const NEUTRAL_BAR = 'rgba(255,255,255,0.10)'
const DAY_LABEL = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function StatTrends7Day() {
  const { state } = useRewardEngine()
  const { buckets, totalXP, dominantStyle } = useMemo(() => {
    const b = bucketSendsByDay(state?.sends || [], 7)
    let total = 0
    const byStyle = {}
    for (const bucket of b) {
      total += bucket.totalXP
      if (bucket.dominantStyle) {
        byStyle[bucket.dominantStyle] = (byStyle[bucket.dominantStyle] || 0) + bucket.totalXP
      }
    }
    let topStyle = null
    let topXP = -1
    for (const [k, v] of Object.entries(byStyle)) {
      if (v > topXP) { topXP = v; topStyle = k }
    }
    return { buckets: b, totalXP: total, dominantStyle: topStyle }
  }, [state?.sends])

  const maxXP = Math.max(1, ...buckets.map((b) => b.totalXP))

  return (
    <Surface tier="default" padding="md" rounded="rounded-2xl">
      <div className="flex items-baseline justify-between mb-3">
        <Eyebrow>Stat trends · 7 day</Eyebrow>
        <p className="ct-tnum text-sm font-bold text-ct-cream">
          +{totalXP.toLocaleString()} XP
        </p>
      </div>
      <div className="flex items-end gap-1.5 h-[64px]">
        {buckets.map((b) => {
          const heightPct = b.totalXP > 0 ? Math.max(6, (b.totalXP / maxXP) * 100) : 4
          const color = b.dominantStyle ? STYLE_COLOR[b.dominantStyle]?.c : NEUTRAL_BAR
          const today = new Date(b.date + 'T00:00:00')
          const dayLabel = DAY_LABEL[today.getDay()]
          return (
            <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-md transition-colors"
                style={{
                  height: `${heightPct}%`,
                  background: color,
                  opacity: b.totalXP > 0 ? 1 : 0.25,
                }}
                aria-label={`${b.date}: ${b.totalXP} XP`}
              />
              <span className="text-[9px] text-ct-cream/50 font-bold uppercase">{dayLabel}</span>
            </div>
          )
        })}
      </div>
      <p className="ct-meta mt-2">
        {totalXP > 0
          ? `Top axis this week · ${capitalize(dominantStyle || 'mixed')}`
          : 'No sends in the last 7 days.'}
      </p>
    </Surface>
  )
}

function capitalize(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
