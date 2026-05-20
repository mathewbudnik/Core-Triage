/**
 * Streak count display with fire glyph (SVG fallback; Lottie wiring in a later phase).
 *
 * Props:
 *   days:          number — current streak in days
 *   best:          number — personal best
 *   className:     extra classes
 */
export default function StreakEmblem({ days, best, className = '' }) {
  const toBest = Math.max(0, best - days)
  return (
    <div
      className={[
        'flex items-center gap-3',
        'rounded-lg border px-4 py-3',
        'bg-[rgba(217,119,87,0.06)] border-[rgba(217,119,87,0.18)]',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'radial-gradient(circle at 50% 70%, #ff8a4a 0%, #d97757 50%, transparent 80%)',
          boxShadow: '0 0 12px rgba(255,138,74,0.4)',
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2c-1 3-4 4-4 8a4 4 0 0 0 4 4 4 4 0 0 0 4-4c0-4-3-5-4-8z" fill="#fff7ed" />
          <path d="M9 14a3 3 0 0 0 3 3 3 3 0 0 0 3-3c0-2-1.5-3-3-5-1.5 2-3 3-3 5z" fill="#ffc46b" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-base font-extrabold text-ct-cream leading-tight">{days} day streak</p>
        <p className="ct-meta mt-0.5">Personal best: {best} days</p>
      </div>
      {toBest > 0 && (
        <p className="text-[10px] font-bold text-ct-terra-soft tracking-[0.06em] text-right">{toBest} TO PB</p>
      )}
    </div>
  )
}
