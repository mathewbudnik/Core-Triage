import { ChevronRight } from 'lucide-react'
import { vGradeToTier, ydsToTier, TIER_TOKENS } from '../lib/tier'

/**
 * Recent climbs feed. Each row's grade chip is colored by THAT grade's
 * tier (not the user's working tier).
 *
 * Props:
 *   items: [{
 *     id:        number,
 *     grade:     string,        // 'V5' or '5.11a'
 *     discipline:'boulder' | 'route',
 *     kind:      'send' | 'flash' | 'project',
 *     count:     number,        // for "V5 × 2"
 *     dateLabel: string,        // 'Wed · Session 3 of this week'
 *   }]
 */
export default function HubFeedCard({ items }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl p-4 text-center text-sm text-muted/80"
           style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
        No climbs logged yet. Log a session in Train to start your feed.
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
      <div className="px-4 pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        Recent climbs
      </div>
      <div>
        {items.map((it, idx) => <FeedRow key={it.id} item={it} first={idx === 0} />)}
      </div>
    </div>
  )
}

function FeedRow({ item, first }) {
  const tierId = item.discipline === 'boulder' ? vGradeToTier(item.grade) : ydsToTier(item.grade)
  const tk = TIER_TOKENS[tierId] || TIER_TOKENS.v0
  const isFlash = item.kind === 'flash'
  const title = (
    item.kind === 'project' ? `${item.grade} project tries` :
    item.count > 1         ? `${item.grade} × ${item.count} sends` :
    `${item.grade} send`
  )

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${first ? '' : 'border-t border-white/5'}`}>
      <div className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[12px] font-extrabold tabular-nums shrink-0 text-white"
           style={{
             background: `linear-gradient(135deg, ${tk.light}, ${tk.c}, ${tk.deep})`,
             boxShadow:  `0 0 12px ${tk.c}55`,
           }}>
        {item.grade}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-text -tracking-[0.01em] flex items-baseline gap-1.5">
          {title}
          {isFlash && (
            <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-[1px] rounded text-white"
                  style={{ background: 'var(--tier-c)', boxShadow: '0 0 8px var(--tier-glow)' }}>
              Flash
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted/70 mt-0.5">{item.dateLabel}</div>
      </div>
      <ChevronRight size={14} className="text-muted/40 shrink-0" />
    </div>
  )
}
