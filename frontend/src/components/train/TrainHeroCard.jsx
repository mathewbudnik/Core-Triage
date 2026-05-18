import { motion } from 'framer-motion'
import { ArrowRight, Check, Sparkles, Loader2 } from 'lucide-react'
import { getSessionTypeColor } from '../../lib/sessionType'

const DOW_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function dayOfWeek(iso) {
  return new Date(iso + 'T00:00:00').getDay()
}

function eyebrowText(dayStatus, isoDate, sessionType) {
  if (dayStatus === 'today') {
    return `Today · ${sessionType || 'Plan'}`
  }
  if (dayStatus === 'past') {
    return `${DOW_SHORT[dayOfWeek(isoDate)]} · Completed`
  }
  if (dayStatus === 'rest') {
    return `${DOW_LONG[dayOfWeek(isoDate)]} · Rest day`
  }
  // future
  return `${DOW_LONG[dayOfWeek(isoDate)]} · ${sessionType || 'Session'}`
}

const TIER_BG = `
  radial-gradient(circle at 28% 0%, color-mix(in srgb, var(--tier-c) 40%, transparent) 0%, transparent 60%),
  radial-gradient(circle at 95% 100%, color-mix(in srgb, var(--tier-light) 16%, transparent) 0%, transparent 70%),
  linear-gradient(180deg, color-mix(in srgb, var(--tier-c) 10%, transparent), color-mix(in srgb, var(--tier-deep) 20%, transparent))
`.trim()

const REST_BG = `
  radial-gradient(circle at 30% 0%, rgba(255,255,255,0.08) 0%, transparent 65%),
  linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))
`.trim()

const TIER_BORDER = '0.5px solid color-mix(in srgb, var(--tier-c) 22%, transparent)'
const REST_BORDER = '0.5px solid rgba(255,255,255,0.10)'

/**
 * The dominant card. One per Train render.
 *
 * Props:
 *   session:   object | null  — null when rest or noPlan
 *   dayStatus: 'past' | 'today' | 'future' | 'rest'
 *   isoDate:   string         — used for the eyebrow's day name
 *   onStart:   () => void     — fires when the user taps the CTA
 *   noPlan:    boolean        — render the 'Generate my plan' variant
 *   onGenerate:() => void     — fires when noPlan CTA is tapped
 *   generating:boolean        — shows spinner while generating
 *   planError: string | null  — inline error under the noPlan CTA
 */
export default function TrainHeroCard({
  session, dayStatus, isoDate, onStart,
  noPlan = false, onGenerate, generating = false, planError = null,
}) {
  if (noPlan) {
    return (
      <div
        className="rounded-2xl px-5 py-6 border"
        style={{ background: TIER_BG, border: TIER_BORDER }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <Sparkles size={16} className="text-[var(--tier-light)]" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--tier-light)]">
            Ready when you are
          </span>
        </div>
        <h2 className="text-[26px] font-extrabold -tracking-[0.025em] leading-tight mb-2">
          Ready to build<br/>your plan
        </h2>
        <p className="text-[12.5px] font-semibold text-text/70 leading-snug mb-4">
          We'll generate a 4-week personalised plan based on your profile and
          adapt it around any injuries in your history.
        </p>
        {planError && (
          <p className="text-[11.5px] font-semibold text-[#fb7185] mb-3">{planError}</p>
        )}
        <motion.button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          whileTap={generating ? undefined : { scale: 0.97 }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                     font-extrabold text-[12.5px] -tracking-[0.01em] disabled:opacity-60"
          style={{ background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }}
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Generating…' : 'Generate my plan'}
        </motion.button>
      </div>
    )
  }

  const rest    = dayStatus === 'rest'
  const today   = dayStatus === 'today'
  const past    = dayStatus === 'past'

  const sessionType = session?.session_type || (rest ? 'Rest' : 'Endurance')
  const typeColors  = getSessionTypeColor(sessionType)
  const durationMin = session?.duration_minutes || session?.duration_min || null
  const description = session?.description || session?.summary || null

  const title = rest
    ? <>Rest<br/>day</>
    : <>{sessionType}<br/>session</>

  const subtitle = rest
    ? 'Mobility + sleep are the work today.'
    : [durationMin ? `${durationMin} min` : null, description].filter(Boolean).join(' · ') || 'See exercises'

  return (
    <div
      className="rounded-2xl px-5 py-5 border"
      style={{
        background: rest ? REST_BG : TIER_BG,
        border:     rest ? REST_BORDER : TIER_BORDER,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {!rest && (
          <span className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: typeColors.c }} />
        )}
        <span
          className="text-[10px] font-extrabold uppercase tracking-[0.13em]"
          style={{ color: rest ? 'rgba(255,255,255,0.55)' : 'var(--tier-light)' }}
        >
          {eyebrowText(dayStatus, isoDate, sessionType)}
        </span>
      </div>

      <h2 className="text-[28px] font-extrabold -tracking-[0.025em] leading-[1.05] mb-2.5">
        {title}
      </h2>
      <p className="text-[12.5px] font-semibold text-text/72 leading-snug mb-5">
        {subtitle}
      </p>

      {!rest && (
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onStart}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                       font-extrabold text-[12.5px] -tracking-[0.01em]"
            style={today
              ? { background: 'var(--tier-c)', color: 'var(--bg, #06120f)' }
              : { background: 'rgba(255,255,255,0.06)', color: '#e8e8ec', border: '0.5px solid rgba(255,255,255,0.14)' }
            }
          >
            {today ? 'Start session' : 'View session'}
            <ArrowRight size={14} strokeWidth={2.4} />
          </motion.button>
          {past && (
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.06em]"
                  style={{ color: 'var(--tier-light)' }}>
              <Check size={12} strokeWidth={2.8} />
              COMPLETED
            </span>
          )}
        </div>
      )}
    </div>
  )
}
