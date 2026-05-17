import { Lock } from 'lucide-react'

/**
 * Reusable medal. Three size variants:
 *   size='sm' → 40px, used in toasts
 *   size='md' → 84px, used in awards strip
 *   size='lg' → 168px, used in tier-promotion takeover
 *
 * Props:
 *   size:     'sm' | 'md' | 'lg'
 *   light:    hex (top of gradient)
 *   mid:      hex (main color)
 *   deep:     hex (bottom of gradient)
 *   icon:     lucide component (e.g., Mountain)
 *   label:    string | null    — small label below the icon (e.g., 'V7', '10d')
 *   locked:   boolean          — render the locked variant
 */
export default function AwardMedal({ size = 'md', light, mid, deep, icon: Icon, label, locked = false }) {
  const px = size === 'sm' ? 40 : size === 'lg' ? 168 : 84
  const iconPx = size === 'sm' ? 18 : size === 'lg' ? 36 : 22
  const labelFs = size === 'sm' ? 11 : size === 'lg' ? 28 : 14

  if (locked) {
    return (
      <div className="relative rounded-full flex items-center justify-center"
           style={{
             width: px, height: px,
             background: 'rgba(255,255,255,0.04)',
             border: '0.5px dashed rgba(255,255,255,0.2)',
             color: 'rgba(255,255,255,0.3)',
           }}>
        <Lock size={iconPx} />
      </div>
    )
  }

  return (
    <div className="relative rounded-full flex items-center justify-center"
         style={{
           width: px, height: px,
           background: `
             radial-gradient(ellipse 50% 40% at 50% 18%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%),
             linear-gradient(180deg, ${light} 0%, ${mid} 45%, ${deep} 100%)
           `,
           boxShadow: `
             0 6px 18px -2px ${mid}99,
             0 2px 4px rgba(0,0,0,0.4),
             inset 0 -3px 6px rgba(0,0,0,0.4),
             inset 0 2px 3px rgba(255,255,255,0.35)
           `,
         }}>
      {/* Bezel ring */}
      <div className="absolute rounded-full pointer-events-none"
           style={{
             inset: size === 'lg' ? 12 : size === 'sm' ? 4 : 6,
             border: '0.5px solid rgba(255,255,255,0.25)',
             background: 'radial-gradient(ellipse 60% 50% at 50% 25%, rgba(255,255,255,0.15), rgba(255,255,255,0) 70%)',
             boxShadow: 'inset 0 0 8px rgba(0,0,0,0.25)',
           }} />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-white"
           style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
        {Icon && <Icon size={iconPx} strokeWidth={2.2} />}
        {label && (
          <div className="font-extrabold tabular-nums -tracking-[0.02em] mt-[1px]"
               style={{ fontSize: labelFs }}>
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
