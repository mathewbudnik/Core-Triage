const MODES = [
  { id: 'quick', label: 'Quick', helper: 'One send' },
  { id: 'deep',  label: 'Deep',  helper: 'Full session' },
]

export default function LogModeToggle({ value, onChange }) {
  return (
    <div className="flex bg-ct-forest-deep/60 rounded-xl p-1 border border-ct-hairline">
      {MODES.map((m) => {
        const active = m.id === value
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={active}
            className={[
              'flex-1 flex flex-col items-center py-2 rounded-lg transition-colors',
              active
                ? 'bg-ct-terracotta/15 text-ct-terra-soft'
                : 'text-ct-cream/60',
            ].join(' ')}
          >
            <span className="text-xs font-bold">{m.label}</span>
            <span className="text-[9px] opacity-70">{m.helper}</span>
          </button>
        )
      })}
    </div>
  )
}
