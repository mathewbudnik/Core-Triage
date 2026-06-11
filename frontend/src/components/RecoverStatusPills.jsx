/**
 * Stat-strip pill row for the Recover hero. Horizontal-scroll on mobile,
 * flex-wrap on desktop so it uses the wider column.
 *
 * Props:
 *   pills: Array<{ key, label, tone: 'sage'|'clay'|'ochre'|'muted'|'active', live?: boolean }>
 *
 * Tone mapping (Almanac palette):
 *   active/sage → sage — "you're in recovery, not danger"
 *   muted (pending) → hairline fill + dimmed ink
 *   clay / ochre carry phase / progress data
 */
const TONE_CLASSES = {
  sage:   'text-sage-deep border-sage/45 bg-sage/15',
  clay:   'text-clay-deep border-clay/45 bg-clay/12',
  ochre:  'text-clay-deep border-ochre/50 bg-ochre/15',
  muted:  'text-ink-muted border-ct-hairline bg-ct-hairline',
}

const LIVE_DOT_TONE = {
  sage:  'bg-sage-deep',
  clay:  'bg-clay-deep',
  ochre: 'bg-ochre',
  muted: 'bg-ink-muted',
}

// Legacy tone aliases kept so existing callers (coral/teal/gold) still map
// cleanly onto the Almanac palette without touching their logic.
const TONE_ALIAS = { coral: 'sage', active: 'sage', teal: 'clay', gold: 'ochre' }

export default function RecoverStatusPills({ pills }) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible -mx-1 px-1 pb-0.5
                 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
    >
      {pills.map((p) => {
        const tone = TONE_ALIAS[p.tone] ?? p.tone
        return (
          <span
            key={p.key}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0
                        text-[10px] font-bold uppercase tracking-[0.06em]
                        px-2.5 py-1 rounded-full border ${TONE_CLASSES[tone] ?? TONE_CLASSES.muted}`}
          >
            {p.live && <span className={`w-1.5 h-1.5 rounded-full ${LIVE_DOT_TONE[tone] ?? LIVE_DOT_TONE.muted}`} />}
            {p.label}
          </span>
        )
      })}
    </div>
  )
}
