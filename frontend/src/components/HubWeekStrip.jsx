const DOW = ['M','T','W','T','F','S','S']

/**
 * Mon–Sun horizontal week strip with logged-day dots and today highlight.
 *
 * Props:
 *   loggedDates: Set<string>   — set of YYYY-MM-DD logged this week
 *   todayIso:    string        — YYYY-MM-DD of today, must be within the week
 */
export default function HubWeekStrip({ loggedDates, todayIso }) {
  const week = buildWeek(todayIso)

  return (
    <div className="rounded-2xl p-4"
         style={{
           background: 'rgba(0,0,0,0.35)',
           border: '0.5px solid rgba(255,255,255,0.1)',
           backdropFilter: 'blur(8px)',
         }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-3">
        This week
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {week.map(({ iso, dom, dowIdx }) => {
          const isToday = iso === todayIso
          const isLogged = loggedDates.has(iso)
          return (
            <div key={iso}
                 className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl"
                 style={isToday ? {
                   background: 'linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 30%, transparent), color-mix(in srgb, var(--tier-c) 8%, transparent))',
                   border: '0.5px solid color-mix(in srgb, var(--tier-c) 50%, transparent)',
                 } : undefined}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em]"
                    style={{ color: isToday ? 'var(--tier-light)' : 'rgba(255,255,255,0.4)' }}>
                {DOW[dowIdx]}
              </span>
              <span className="text-[15px] font-semibold text-text tabular-nums -tracking-[0.02em]">
                {dom}
              </span>
              <span className="w-[5px] h-[5px] rounded-full"
                    style={{
                      background: isLogged ? 'var(--tier-c)' : 'rgba(255,255,255,0.12)',
                      boxShadow:  isLogged ? '0 0 5px var(--tier-c)' : 'none',
                    }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildWeek(todayIso) {
  const today = new Date(todayIso + 'T00:00:00')
  // Snap to Monday
  const dow = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow)
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    out.push({
      iso: d.toISOString().slice(0,10),
      dom: d.getDate(),
      dowIdx: i,
    })
  }
  return out
}
