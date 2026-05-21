import { motion } from 'framer-motion'
import { ArrowRight, Check, Sparkles, Loader2 } from 'lucide-react'
import { getSessionTypeColor, getSessionTypeLabel } from '../../lib/sessionType'
import Surface from '../ui/Surface'
import Eyebrow from '../ui/Eyebrow'

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
      <Surface tier="hero" padding="lg" rounded="rounded-2xl">
        <div className="flex items-center gap-2.5 mb-2">
          <Sparkles size={16} className="text-ct-terra-soft" />
          <Eyebrow>Ready when you are</Eyebrow>
        </div>
        <h2 className="text-[26px] font-extrabold -tracking-[0.025em] leading-tight mb-2 text-ct-cream">
          Ready to build<br/>your plan
        </h2>
        <p className="text-[12.5px] font-semibold text-ct-cream/60 leading-snug mb-4">
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
                     font-extrabold text-[12.5px] -tracking-[0.01em] disabled:opacity-60
                     bg-ct-terra-tint border border-ct-terracotta/30 text-ct-terra-soft
                     hover:bg-ct-terracotta/10 transition-colors"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Generating…' : 'Generate my plan'}
        </motion.button>
      </Surface>
    )
  }

  const rest    = dayStatus === 'rest'
  const today   = dayStatus === 'today'
  const past    = dayStatus === 'past'

  // Backend produces `session.type` (lowercase). `session_type` is a legacy
  // alias kept for any older callers.
  const rawType     = session?.type || session?.session_type
  const sessionType = getSessionTypeLabel(rawType) || (rest ? 'Rest' : 'Endurance')
  const typeColors  = getSessionTypeColor(rawType)
  const durationMin = session?.duration_min || session?.duration_minutes || null
  const exerciseCount = session?.main?.length || 0

  const title = rest
    ? <>Rest<br/>day</>
    : <>{sessionType}<br/>session</>

  const subtitle = rest
    ? 'Mobility + sleep are the work today.'
    : [
        durationMin ? `${durationMin} min` : null,
        exerciseCount > 0 ? `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}` : null,
      ].filter(Boolean).join(' · ') || 'Tap to see exercises'

  return (
    <Surface tier={rest ? 'default' : 'hero'} padding="lg" rounded="rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        {!rest && (
          <span className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: typeColors.c }} />
        )}
        <Eyebrow>
          {eyebrowText(dayStatus, isoDate, sessionType)}
        </Eyebrow>
      </div>

      <h2 className="text-[28px] font-extrabold -tracking-[0.025em] leading-[1.05] mb-2.5 text-ct-cream">
        {title}
      </h2>
      <p className="text-[12.5px] font-semibold text-ct-cream/60 leading-snug mb-5">
        {subtitle}
      </p>

      {!rest && (
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onStart}
            whileTap={{ scale: 0.97 }}
            className={[
              'inline-flex items-center gap-2 px-5 py-3 rounded-2xl',
              'font-extrabold text-[12.5px] -tracking-[0.01em]',
              today
                ? 'bg-ct-terra-tint border border-ct-terracotta/30 text-ct-terra-soft hover:bg-ct-terracotta/10 transition-colors'
                : 'bg-white/[0.06] text-ct-cream/70 border border-white/[0.14]',
            ].join(' ')}
          >
            {today ? 'Start session' : 'View session'}
            <ArrowRight size={14} strokeWidth={2.4} />
          </motion.button>
          {past && (
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.06em] text-ct-terra-soft">
              <Check size={12} strokeWidth={2.8} />
              COMPLETED
            </span>
          )}
        </div>
      )}
    </Surface>
  )
}
