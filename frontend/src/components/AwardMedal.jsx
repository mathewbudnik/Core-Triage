import { Lock, HelpCircle } from 'lucide-react'
import DiamondShimmer from './DiamondShimmer'

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
 *   mystery:  boolean          — when locked, render as "???" (Xbox/Steam style)
 *
 * Diamond-tier medals (label === 'V10') automatically get an animated
 * shimmer overlay — subtle shine sweep + 4-point sparkles — so the apex
 * grade feels visually distinct from every other earned medal.
 */
export default function AwardMedal({ size = 'md', light, mid, deep, icon: Icon, label, locked = false, mystery = false }) {
  const px = size === 'sm' ? 40 : size === 'lg' ? 168 : 84
  const iconPx = size === 'sm' ? 18 : size === 'lg' ? 36 : 22
  const labelFs = size === 'sm' ? 11 : size === 'lg' ? 28 : 14

  if (locked) {
    // Mystery: hide grade/streak hint behind a "???" mark + question icon.
    // Plain locked: padlock + dashed ring (the original).
    const ShownIcon = mystery ? HelpCircle : Lock
    return (
      <div className="relative rounded-full flex items-center justify-center"
           style={{
             width: px, height: px,
             background: 'rgba(42,39,34,0.05)',
             border: '0.5px dashed rgba(42,39,34,0.22)',
             color: 'rgba(42,39,34,0.40)',
           }}>
        <div className="flex flex-col items-center">
          <ShownIcon size={iconPx} />
          {mystery && size !== 'sm' && (
            <div className="font-extrabold mt-0.5" style={{ fontSize: labelFs * 0.75 }}>???</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-full flex items-center justify-center"
         style={{
           width: px, height: px,
           background: `
             radial-gradient(ellipse 50% 40% at 50% 18%, rgba(253,246,234,0.55), rgba(253,246,234,0) 70%),
             linear-gradient(180deg, ${light} 0%, ${mid} 45%, ${deep} 100%)
           `,
           boxShadow: `
             0 6px 18px -2px ${mid}99,
             0 2px 4px rgba(0,0,0,0.35),
             inset 0 -3px 6px rgba(0,0,0,0.3),
             inset 0 2px 3px rgba(253,246,234,0.4)
           `,
         }}>
      {/* Bezel ring */}
      <div className="absolute rounded-full pointer-events-none"
           style={{
             inset: size === 'lg' ? 12 : size === 'sm' ? 4 : 6,
             border: '0.5px solid rgba(253,246,234,0.30)',
             background: 'radial-gradient(ellipse 60% 50% at 50% 25%, rgba(253,246,234,0.18), rgba(253,246,234,0) 70%)',
             boxShadow: 'inset 0 0 8px rgba(0,0,0,0.22)',
           }} />
      {/* Diamond-tier shimmer — animated overlay above the gradient
          surface but below the icon/label content. Triggered only on
          V10 grade medals. */}
      {label === 'V10' && <DiamondShimmer size={size} />}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-cream"
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
