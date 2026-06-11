function streakTier(days) {
  if (days >= 30) return 'foil'
  if (days >= 7) return 'gradient'
  return 'warm'
}

const SIZE_MAP = { sm: 24, md: 36, lg: 48 }

export default function StreakFlame({ days = 0, size = 'md' }) {
  const tier = streakTier(days)
  const px = SIZE_MAP[size] ?? SIZE_MAP.md
  const flameFill = {
    warm: '#b06a4f',
    gradient: 'url(#ct-streak-gradient)',
    foil: 'url(#ct-foil)',
  }[tier]

  return (
    <span data-streak-tier={tier} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <svg
        viewBox="0 0 40 50"
        width={px}
        height={px * (50 / 40)}
        aria-hidden="true"
        style={{
          filter: tier === 'warm'
            ? 'drop-shadow(0 0 6px rgba(176,106,79,0.5))'
            : tier === 'gradient'
            ? 'drop-shadow(0 0 8px rgba(197,138,119,0.6))'
            : 'drop-shadow(0 0 12px rgba(215,172,91,0.7))',
        }}
      >
        <defs>
          <linearGradient id="ct-streak-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#b06a4f" />
            <stop offset="50%" stopColor="#c58a77" />
            <stop offset="100%" stopColor="#d7ac5b" />
          </linearGradient>
        </defs>
        <path
          d="M 20 4 Q 14 14, 16 22 Q 10 22, 8 30 Q 6 38, 12 44 Q 18 48, 26 46 Q 34 42, 34 32 Q 34 24, 28 22 Q 30 14, 20 4 Z"
          fill={flameFill}
        />
        <path
          d="M 20 18 Q 16 24, 17 30 Q 13 30, 13 35 Q 14 42, 22 42 Q 28 40, 28 33 Q 28 28, 24 27 Q 25 22, 20 18 Z"
          fill="#1a1018"
          opacity="0.35"
        />
      </svg>
      <span style={{ fontFamily: 'var(--ct-font-mono, monospace)', fontSize: px * 0.42, fontWeight: 700 }}>
        {days}
      </span>
    </span>
  )
}
