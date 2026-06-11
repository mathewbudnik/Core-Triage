import { identityPhrase } from '../../lib/identity'
import { computePhase } from '../../lib/identity/labelRules'

/**
 * Renders the climber's plain-language identity, derived from the pentagon
 * axes — NOT proper-noun archetypes. Reads like the approved field card:
 *   "Powerful & crimp-strong."  /  "Technique is your gap."
 *
 * The behavior-derived phase ("on a heater", "cave phase") is kept as a small
 * script subtitle — it's plain language, not an archetype, and adds context.
 *
 * Variants:
 *   - 'inline'    — Hub hero strip (default)
 *   - 'card'      — Climber Card surface (larger)
 *   - 'shareable' — Sharable Card export
 */
export default function IdentityLabel({
  axes,
  recentSends = [],
  variant = 'inline',
  now = null,
}) {
  const { title, gap } = identityPhrase(axes)
  const phase = computePhase(recentSends, now || new Date())

  const sizes = {
    inline: { mainSize: 'text-2xl md:text-3xl', subSize: 'text-base' },
    card:   { mainSize: 'text-3xl md:text-4xl', subSize: 'text-lg' },
    shareable: { mainSize: 'text-4xl', subSize: 'text-xl' },
  }
  const { mainSize, subSize } = sizes[variant] || sizes.inline

  const ariaParts = [title, gap].filter(Boolean).join('. ')

  return (
    <div data-variant={variant} aria-label={`You are ${ariaParts}`}>
      <p className={`font-serif ${mainSize} leading-tight tracking-tight m-0`} style={{ color: 'var(--ct-ink, #1a2620)' }}>
        {title}.
      </p>
      {gap && (
        <p className={`font-serif ${subSize} m-0 mt-1`} style={{ color: 'var(--ct-ink-soft, #5f594c)' }}>
          {gap}.
        </p>
      )}
      {phase && (
        <p className={`font-script ${subSize} m-0 mt-1`} style={{ color: 'var(--ct-terra-deep, #a44a2a)' }}>
          {phase.startsWith('on ') || phase === 'patience rewarded' || phase === 'promoted' || phase === 'grinding'
            ? phase
            : `in the ${phase}`}
        </p>
      )}
    </div>
  )
}
