/**
 * Outdoor card. Replaces ad-hoc bg-panel + border-outline patterns.
 *
 * Props:
 *   tier:    'flat' | 'default' | 'hero'      (default: 'default')
 *   padding: 'sm' | 'md' | 'lg' | 'xl'        (default: 'md')
 *   rounded: tailwind class string            (default: 'rounded-lg')
 *   as:      element or component             (default: 'div')
 */

const TIER_CLASS = {
  flat:    'ct-surface-flat',
  default: 'ct-surface',
  hero:    'ct-surface-hero',
}

const PADDING_CLASS = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
  xl: 'p-6',
}

export default function Surface({
  tier = 'default',
  padding = 'md',
  rounded,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const cls = [
    TIER_CLASS[tier],
    PADDING_CLASS[padding],
    rounded,
    'relative overflow-hidden',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  )
}
