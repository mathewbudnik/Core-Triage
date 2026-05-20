/**
 * Tier pill with name + colored glow dot.
 *
 * Props:
 *   name:  tier name string (e.g., "EMBER")
 *   color: hex color for the dot + glow (default: terracotta)
 *   className: extra classes
 */
export default function TierBadge({ name, color = '#d97757', className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2',
        'px-3 py-1 rounded-full',
        'border',
        'text-[11px] font-extrabold tracking-[0.04em] uppercase',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        color: color,
      }}
    >
      <span
        className="inline-block w-[7px] h-[7px] rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 8px ${color}99`,
        }}
      />
      {name}
    </span>
  )
}
