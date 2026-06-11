/**
 * Horizontal-scroll pill row. Used inside RecoverActiveView's sticky header.
 *
 * Props:
 *   pills: Array<{ key, label, tone: 'teal'|'coral'|'gold'|'muted'|'active', live?: boolean }>
 *
 * Tone mapping (RPG palette):
 *   coral (live/active) → moss green — "you're in recovery, not danger"
 *   muted (pending/locked) → hairline bg + dimmed cream text
 *   teal / gold retain accent colors for phase/progress data
 */
const TONE_CLASSES = {
  teal:   'text-accent  border-accent/40  bg-accent/10',
  coral:  'text-ct-moss border-ct-moss/40 bg-ct-moss/15',
  gold:   'text-accent3 border-accent3/40 bg-accent3/10',
  muted:  'text-ink-muted border-ct-hairline bg-ct-hairline',
}

const LIVE_DOT_TONE = {
  teal:  'bg-accent  shadow-[0_0_6px_rgba(20,184,166,0.7)]',
  coral: 'bg-ct-moss shadow-[0_0_6px_rgba(149,166,152,0.6)]',
  gold:  'bg-accent3 shadow-[0_0_6px_rgba(251,191,36,0.7)]',
  muted: 'bg-ct-cream/40',
}

export default function RecoverStatusPills({ pills }) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1
                 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
    >
      {pills.map((p) => (
        <span
          key={p.key}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0
                      text-[10px] font-extrabold uppercase tracking-[0.06em]
                      px-2.5 py-1 rounded-full border ${TONE_CLASSES[p.tone]}`}
        >
          {p.live && <span className={`w-1.5 h-1.5 rounded-full ${LIVE_DOT_TONE[p.tone]}`} />}
          {p.label}
        </span>
      ))}
    </div>
  )
}
