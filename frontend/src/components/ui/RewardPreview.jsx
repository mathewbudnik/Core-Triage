/**
 * The XP-earned preview shown in the log flow. Shows total XP with multiplier breakdown.
 *
 * Props:
 *   xp:        number — total XP to be earned
 *   breakdown: string — short description (e.g., "V6 × flash × indoor")
 *   label:     string — top label (default: "YOU'LL EARN")
 *   className: extra classes
 */
export default function RewardPreview({
  xp,
  breakdown,
  label = "YOU'LL EARN",
  className = '',
}) {
  return (
    <div
      className={[
        'flex justify-between items-center',
        'rounded-lg border px-3 py-2.5',
        'bg-[rgba(197,138,119,0.12)] border-[rgba(197,138,119,0.28)]',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div>
        <p className="text-[10px] font-bold tracking-[0.10em] uppercase text-ink-muted">{label}</p>
        {breakdown && <p className="text-[10px] text-ink-muted mt-0.5">{breakdown}</p>}
      </div>
      <p className="text-[16px] font-extrabold text-clay-deep tracking-[0.02em] ct-tnum">
        +{xp.toLocaleString()} XP
      </p>
    </div>
  )
}
