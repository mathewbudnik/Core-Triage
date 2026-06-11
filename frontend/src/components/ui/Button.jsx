const VARIANT = {
  primary:   'text-cream bg-clay hover:brightness-105 active:brightness-95 shadow-[0_2px_0_#b06a4f]',
  secondary: 'text-ink bg-card border border-ct-rim hover:border-clay/50 hover:text-clay-deep',
  ghost:     'text-ink-soft hover:bg-[rgba(42,39,34,0.05)]',
}
export default function Button({ variant = 'primary', className = '', as: Tag = 'button', ...rest }) {
  return <Tag className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 ${VARIANT[variant]} ${className}`} {...rest} />
}
