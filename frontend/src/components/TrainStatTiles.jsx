import { Flame, Activity, TrendingUp } from 'lucide-react'

/**
 * Three-up tile row under the hero — Streak / Sessions this week / All-time hrs.
 * Each tile has a colored top stripe matching its category.
 */
function Tile({ value, label, accentClass, stripeClass, Icon }) {
  return (
    <div className="relative overflow-hidden bg-panel border border-outline rounded-xl pt-3 pb-2 px-2 text-center">
      <span className={`absolute top-0 left-0 right-0 h-[2px] ${stripeClass}`} />
      <div className="flex items-baseline justify-center gap-1.5">
        <Icon size={14} className={accentClass} />
        <span className="text-lg font-extrabold text-text leading-none">{value}</span>
      </div>
      <p className="text-[9px] uppercase tracking-wider text-muted mt-1.5 font-semibold">{label}</p>
    </div>
  )
}

export default function TrainStatTiles({ streakDays, sessionsThisWeek, allTimeHours }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      <Tile
        value={`${streakDays}d`}
        label="Streak"
        accentClass="text-accent2"
        stripeClass="bg-gradient-to-r from-accent2 to-accent3"
        Icon={Flame}
      />
      <Tile
        value={sessionsThisWeek}
        label="Sessions / wk"
        accentClass="text-accent"
        stripeClass="bg-accent"
        Icon={Activity}
      />
      <Tile
        value={`${allTimeHours.toFixed(0)}h`}
        label="All-time"
        accentClass="text-accent3"
        stripeClass="bg-gradient-to-r from-[#a594f9] to-accent"
        Icon={TrendingUp}
      />
    </div>
  )
}
