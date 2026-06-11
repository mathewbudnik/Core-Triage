import { Flame } from 'lucide-react'

/**
 * Gold-tinted streak chip. Renders only when streakDays >= 2.
 * Sits in the right column of TrainHeader.
 *
 * Props:
 *   streakDays: number  — current consecutive-day count from useHubData
 */
export default function TrainStreakChip({ streakDays }) {
  if (!streakDays || streakDays < 2) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                     text-[10.5px] font-bold tabular-nums tracking-[0.01em]
                     border"
          style={{
            background: 'rgba(215,172,91,0.16)',
            borderColor: 'rgba(215,172,91,0.42)',
            color: '#9a7a32',
          }}>
      <Flame size={12} strokeWidth={2.4} />
      <span>{streakDays}d</span>
    </span>
  )
}
