export default function TextureDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* Parallel ink lines at 45° */}
        <pattern id="ct-hatch-diag" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
        </pattern>

        {/* Cross-hatching */}
        <pattern id="ct-hatch-cross" patternUnits="userSpaceOnUse" width="6" height="6">
          <path d="M-1 1l4-4M0 6l6-6M5 7l4-4" stroke="currentColor" strokeWidth="0.4" opacity="0.6" />
        </pattern>

        {/* Stippling (ink dots) */}
        <pattern id="ct-stipple" patternUnits="userSpaceOnUse" width="5" height="5">
          <circle cx="1" cy="1" r="0.5" fill="currentColor" opacity="0.7" />
          <circle cx="3.5" cy="2.5" r="0.3" fill="currentColor" opacity="0.5" />
          <circle cx="2" cy="4" r="0.4" fill="currentColor" opacity="0.6" />
        </pattern>

        {/* Topographic striations */}
        <pattern id="ct-striate" patternUnits="userSpaceOnUse" width="14" height="14">
          <path d="M0 7 Q 3 4, 7 7 T 14 7" stroke="currentColor" strokeWidth="0.4" fill="none" opacity="0.6" />
        </pattern>

        {/* Hand-drawn ink-blot (used for severity dots, vertex markers) */}
        <symbol id="ct-ink-blot" viewBox="-12 -12 24 24">
          <path
            d="M-8 -1 Q -10 -7, -3 -9 Q 5 -11, 9 -5 Q 11 3, 5 8 Q -3 10, -7 6 Q -10 2, -8 -1 Z"
            fill="currentColor"
          />
        </symbol>

        {/* Foil prestige gradient */}
        <linearGradient id="ct-foil" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b88a3a" />
          <stop offset="30%" stopColor="#c75e3a" />
          <stop offset="55%" stopColor="#7a4a8e" />
          <stop offset="80%" stopColor="#2f4ea8" />
          <stop offset="100%" stopColor="#b88a3a" />
        </linearGradient>
      </defs>
    </svg>
  )
}
