import { computeArchetype } from '../../lib/identity/archetype'
import { computeStyle, computePhase, composeLabel } from '../../lib/identity/labelRules'

/**
 * Renders the climber's three-part identity phrase.
 *
 * Variants:
 *   - 'inline'    — Hub hero strip (default)
 *   - 'card'      — Climber Card surface (larger)
 *   - 'shareable' — Sharable Card export (foil treatment on style + arch)
 */
export default function IdentityLabel({
  axes,
  recentSends = [],
  variant = 'inline',
  now = null,
}) {
  const archetype = computeArchetype(axes)
  const style = computeStyle(axes)
  const phase = computePhase(recentSends, now || new Date())
  const composed = composeLabel({ style, archetype, phase })

  const sizes = {
    inline: { mainSize: 'text-2xl md:text-3xl', phaseSize: 'text-base' },
    card:   { mainSize: 'text-3xl md:text-4xl', phaseSize: 'text-lg' },
    shareable: { mainSize: 'text-4xl', phaseSize: 'text-xl' },
  }
  const { mainSize, phaseSize } = sizes[variant] || sizes.inline

  return (
    <div data-variant={variant} aria-label={`You are ${composed}`}>
      <p className={`font-serif ${mainSize} leading-tight tracking-tight m-0`} style={{ color: 'var(--ct-ink, #1a2620)' }}>
        {style && <span style={{ color: 'var(--ct-mint, #2da283)' }}>{style} </span>}
        <em style={{ color: 'var(--ct-terracotta, #c75e3a)', fontStyle: 'italic', fontWeight: 500 }}>
          {archetype}
        </em>
      </p>
      {phase && (
        <p className={`font-script ${phaseSize} m-0 mt-1`} style={{ color: 'var(--ct-terra-deep, #a44a2a)' }}>
          {phase.startsWith('on ') || phase === 'patience rewarded' || phase === 'promoted' || phase === 'grinding'
            ? phase
            : `in the ${phase}`}
        </p>
      )}
    </div>
  )
}
