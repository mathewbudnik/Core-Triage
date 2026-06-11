import { resolveAvatar } from '../data/avatars'

/**
 * Universal avatar chip. Renders the user's chosen icon+color combo, or
 * falls back to an initial chip when nothing is set (or when the entry
 * is anonymized — leaderboard private rows).
 *
 * Props:
 *   - icon, color: the user's chosen preset key + optional color override
 *   - name:       display name or email — first letter is the fallback initial
 *   - size:       pixel diameter (default 28)
 *   - anonymous:  force the generic mask styling (used for "Private climber")
 */
export default function AvatarChip({ icon, color, name, size = 28, anonymous = false, className = '' }) {
  const resolved = !anonymous ? resolveAvatar(icon, color) : null
  const radius = Math.round(size * 0.32)
  // Bumped to 0.65 so the icon visually fills the chip — at 0.55 it felt
  // small-and-floaty, especially in compact contexts (header pill, rows).
  const iconSize = Math.round(size * 0.65)
  const fontSize = Math.round(size * 0.45)

  if (anonymous) {
    return (
      <div
        className={`flex items-center justify-center flex-shrink-0 ${className}`}
        style={{
          width: size, height: size, borderRadius: radius,
          background: 'rgba(141,132,114,0.18)',
          border: '1px solid rgba(141,132,114,0.40)',
        }}
        aria-hidden
      >
        <span style={{ fontSize, lineHeight: 1, color: '#8d8472' }}>?</span>
      </div>
    )
  }

  if (resolved) {
    const { Icon, bg, border, iconColor, boxShadow } = resolved
    return (
      <div
        className={`flex items-center justify-center flex-shrink-0 ${className}`}
        style={{
          width: size, height: size, borderRadius: radius,
          background: bg,
          border: `1px solid ${border}`,
          // Combine outer drop-shadow (depth from canvas) + inner highlight
          // (glossy bevel) for a more tactile look.
          boxShadow: `0 2px 6px rgba(0,0,0,0.3), ${boxShadow}`,
        }}
        aria-hidden
      >
        <Icon size={iconSize} color={iconColor} strokeWidth={2.5} />
      </div>
    )
  }

  // Initial fallback — same look as the original generated chip.
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size, height: size, borderRadius: radius,
        background: 'rgba(151,168,134,0.20)',
        border: '1px solid rgba(151,168,134,0.45)',
      }}
      aria-hidden
    >
      <span style={{ fontSize, lineHeight: 1, color: '#5f7a4e', fontWeight: 800 }}>
        {initial}
      </span>
    </div>
  )
}
