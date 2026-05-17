import { useMemo } from 'react'
import { greetingFor } from '../lib/hubGreeting'
import { TIER_NAMES } from '../lib/tier'

const DOW_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function avatarInitial(displayName, email) {
  const s = (displayName || email || 'C').trim()
  return s.charAt(0).toUpperCase()
}

export default function HubGreeting({ user, data, tierId }) {
  const today  = todayIso()
  const now    = new Date()
  const dowMon = `${DOW_LONG[now.getDay()]} · ${MONTH_SHORT[now.getMonth()]} ${now.getDate()}`

  // Derive greeting input from data
  const greeting = useMemo(() => {
    const lastLog = data?.recentLogs?.[0]?.date ?? null
    const lastPr  = null  // PRs aren't surfaced on data yet; pass null for now
    return greetingFor({
      streakDays:        data?.streakDays ?? 0,
      lastLogIso:        lastLog,
      lastPrIso:         lastPr,
      todayIso:          today,
      isFirstLogOfWeek:  Boolean(data?.isFirstLogOfWeek),
      isPlanRestDay:     Boolean(data?.isPlanRestDay),
    })
  }, [data?.recentLogs, data?.streakDays, data?.isFirstLogOfWeek, data?.isPlanRestDay, today])

  const tierName = tierId ? TIER_NAMES[tierId] : null

  return (
    <div className="px-1 pt-1 pb-4 flex items-start justify-between">
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{dowMon}</div>
        <h1
          className="text-2xl sm:text-[28px] font-bold text-text -tracking-[0.025em] mt-1"
          style={{ textShadow: '0 0 14px var(--tier-glow)' }}
        >
          {greeting}
        </h1>
        {tierId && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold text-text"
               style={{
                 background: 'color-mix(in srgb, var(--tier-c) 18%, transparent)',
                 border: '0.5px solid color-mix(in srgb, var(--tier-c) 45%, transparent)',
               }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--tier-c)', boxShadow: '0 0 6px var(--tier-c)' }} />
            {tierId === 'v10' ? 'V10+' : tierId.toUpperCase()} · {tierName} · working
          </div>
        )}
      </div>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-bg shrink-0"
           style={{ background: 'linear-gradient(135deg, var(--tier-light), var(--tier-deep))', boxShadow: '0 0 12px var(--tier-glow)' }}>
        {avatarInitial(user?.display_name, user?.email)}
      </div>
    </div>
  )
}
