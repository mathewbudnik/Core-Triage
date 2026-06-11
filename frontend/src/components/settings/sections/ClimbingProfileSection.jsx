import { useEffect, useState } from 'react'
import {
  Mountain, TrendingUp, Clock, GraduationCap, Compass, Target,
  Briefcase, Crosshair, Pencil,
} from 'lucide-react'
import SettingsSection from '../SettingsSection'
import EditClimbingProfileModal from './EditClimbingProfileModal'
import { getProfile } from '../../../api'

// Snake-case + lowercase → Sentence case. "grade_progression" → "Grade progression".
function humanize(s) {
  if (!s) return ''
  const flat = String(s).replace(/_/g, ' ').toLowerCase().trim()
  return flat.charAt(0).toUpperCase() + flat.slice(1)
}

function vGradeNumber(g) {
  if (!g) return null
  const m = /^V(\d+)/i.exec(String(g).trim())
  return m ? parseInt(m[1], 10) : null
}

// V0 → 0%, V15 → 100%. Clamped.
function vGradePct(n) {
  if (n == null) return null
  return Math.max(0, Math.min(100, (n / 15) * 100))
}

const WEEKDAYS = [
  { k: 'monday',    short: 'M' },
  { k: 'tuesday',   short: 'T' },
  { k: 'wednesday', short: 'W' },
  { k: 'thursday',  short: 'T' },
  { k: 'friday',    short: 'F' },
  { k: 'saturday',  short: 'S' },
  { k: 'sunday',    short: 'S' },
]

export default function ClimbingProfileSection({ user, onUserChange, onToast }) {
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let alive = true
    getProfile().then((p) => { if (alive) setProfile(p) }).catch(() => {})
    return () => { alive = false }
  }, [user?.id])

  const maxBoulder = profile?.max_grade_boulder || null
  const maxRoute = profile?.max_grade_route || null
  const goal = profile?.goal_grade || null

  // V-scale journey bar — only show the scale visualization when current AND goal
  // both parse as V grades. Otherwise we still show the big numbers but skip the bar.
  const currentN = vGradeNumber(maxBoulder)
  const goalN = vGradeNumber(goal)
  const hasVScale = currentN != null && goalN != null
  const gradesToGoal = hasVScale ? Math.max(0, goalN - currentN) : null

  const trainingDays = new Set(profile?.training_days || [])
  const trainingDayCount = trainingDays.size

  return (
    <>
      <SettingsSection
        id="climbing"
        icon={Mountain}
        title="Climbing profile"
        sub="Used by the AI coach and training recommendations."
      >
        {/* ═══════ Grade journey ═══════ */}
        <div
          className="relative overflow-hidden rounded-2xl border border-ct-hairline mb-4"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(151,168,134,0.07), rgba(197,138,119,0.07))',
            padding: hasVScale ? '18px 20px 28px' : '18px 20px',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{ backgroundImage: 'radial-gradient(circle 200px at 50% 0%, rgba(197,138,119,0.10), transparent 70%)' }}
          />
          <div className="relative flex items-baseline justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted mb-0.5">Current</span>
              <span className="text-[32px] font-extrabold tracking-tight leading-none text-sage-deep">{maxBoulder || '—'}</span>
            </div>
            {hasVScale && (
              <div className="text-ink-muted text-xs font-semibold self-center pt-3.5">
                {gradesToGoal === 0 ? (
                  <span className="text-ct-terracotta font-bold">Goal reached</span>
                ) : (
                  <>
                    <strong className="text-ct-cream font-extrabold">{gradesToGoal} grade{gradesToGoal === 1 ? '' : 's'}</strong> to your goal
                  </>
                )}
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted mb-0.5">Goal</span>
              <span className="text-[32px] font-extrabold tracking-tight leading-none text-ct-terracotta">{goal || '—'}</span>
            </div>
          </div>

          {hasVScale && (
            <div className="relative h-2 rounded-full mt-5 mx-1" style={{ background: 'rgba(42,39,34,0.14)' }}>
              <div
                aria-hidden
                className="absolute inset-0 rounded-full opacity-50"
                style={{ background: 'linear-gradient(90deg, #97a886 0%, #d7ac5b 33%, #c58a77 66%, #b06a4f 100%)' }}
              />
              <div
                aria-hidden
                className="absolute top-0 bottom-0 rounded-full"
                style={{
                  left: `${vGradePct(currentN)}%`,
                  width: `${Math.max(0, vGradePct(goalN) - vGradePct(currentN))}%`,
                  background: 'linear-gradient(90deg, #97a886, #c58a77)',
                  boxShadow: '0 0 12px rgba(176,106,79,0.5)',
                }}
              />
              <Marker pos={vGradePct(currentN)} color="#97a886" />
              <Marker pos={vGradePct(goalN)} color="#c58a77" />
              <Tick pos={0} label="V0" />
              <Tick pos={vGradePct(currentN)} label={`V${currentN}`} lit />
              <Tick pos={vGradePct(goalN)} label={`V${goalN}`} lit />
              <Tick pos={66.6} label="V10" />
              <Tick pos={100} label="V15" />
            </div>
          )}
        </div>

        {/* ═══════ Hero stats ═══════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
          <HeroStat icon={Mountain} label="Max boulder" value={maxBoulder || '—'} />
          <HeroStat icon={TrendingUp} label="Max route" value={maxRoute || '—'} />
        </div>

        {/* ═══════ Training days ═══════ */}
        <div className="p-4 rounded-2xl bg-side border border-ct-hairline mb-3.5">
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">Training days</span>
            <span className="text-[11px] text-ink-soft font-semibold">
              <strong className={trainingDayCount > 0 ? 'text-ct-terracotta font-extrabold' : 'text-ink-muted'}>
                {trainingDayCount}
              </strong>{' '}
              day{trainingDayCount === 1 ? '' : 's'}/week
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d, i) => {
              const on = trainingDays.has(d.k)
              return (
                <div
                  key={`${d.k}-${i}`}
                  className={
                    'py-3.5 text-center rounded-xl text-xs font-semibold border ' +
                    (on
                      ? 'bg-ct-terra-tint border-ct-terracotta/35 text-clay-deep'
                      : 'bg-card border-ct-hairline text-ink-muted')
                  }
                >
                  {d.short}
                  {on && (
                    <div
                      aria-hidden
                      className="mx-auto mt-1.5 w-1.5 h-1.5 rounded-full bg-ct-terracotta"
                      style={{ boxShadow: '0 0 8px #c58a77' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
          {trainingDayCount === 0 && (
            <div className="mt-2.5 px-3 py-2 rounded-lg border border-dashed border-ct-rim text-center text-xs text-ink-muted">
              Set the days you typically climb — your AI coach uses this.{' '}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-ct-terracotta font-bold hover:underline"
              >
                Edit profile →
              </button>
            </div>
          )}
        </div>

        {/* ═══════ Attribute pills ═══════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3.5">
          <AttrPill icon={GraduationCap} label="Experience" value={humanize(profile?.experience_level) || '—'} />
          <AttrPill icon={Compass} label="Discipline" value={humanize(profile?.primary_discipline) || '—'} />
          <AttrPill icon={Clock} label="Session" value={profile?.session_length_min ? `${profile.session_length_min} min` : '—'} />
          <AttrPill
            icon={Target}
            label="Primary goal"
            value={humanize(profile?.primary_goal) || '—'}
            accent
            span={3}
          />
        </div>

        {/* ═══════ Equipment ═══════ */}
        <InvBlock
          icon={Briefcase}
          label="Equipment"
          items={profile?.equipment || []}
          tone="equip"
          emptyText="No equipment listed yet."
        />

        {/* ═══════ Weaknesses (reframed as "Working on") ═══════ */}
        <InvBlock
          icon={Crosshair}
          label="Working on"
          items={profile?.weaknesses || []}
          tone="weak"
          emptyText="No focus areas selected yet."
        />

        <button
          onClick={() => setEditing(true)}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-ct-terracotta/35 text-ct-terracotta text-xs font-bold hover:bg-ct-terra-tint transition-all hover:-translate-y-px"
        >
          <Pencil size={12} />
          Edit climbing profile
        </button>
      </SettingsSection>

      {editing && (
        <EditClimbingProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(next) => { setProfile(next); setEditing(false) }}
          onToast={onToast}
        />
      )}
    </>
  )
}

function Marker({ pos, color }) {
  return (
    <span
      aria-hidden
      className="absolute top-1/2 w-4 h-4 rounded-full border-[3px]"
      style={{
        left: `${pos}%`,
        transform: 'translate(-50%, -50%)',
        background: '#fdf6ea',
        borderColor: color,
        boxShadow: `0 0 12px ${color}`,
      }}
    />
  )
}

function Tick({ pos, label, lit }) {
  return (
    <span
      aria-hidden
      className={
        'absolute top-full mt-1.5 text-[9px] font-bold tracking-wider ' +
        (lit ? 'text-ink-soft' : 'text-ink-muted')
      }
      style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
    >
      {label}
    </span>
  )
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-4 border transition-all hover:-translate-y-px"
      style={{
        backgroundImage: 'linear-gradient(135deg, rgba(197,138,119,0.14), rgba(197,138,119,0.04))',
        borderColor: 'rgba(197,138,119,0.30)',
      }}
    >
      <div
        aria-hidden
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(197,138,119,0.18), transparent 70%)' }}
      />
      <div className="relative text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted mb-1.5 inline-flex items-center gap-1.5">
        <Icon size={11} className="opacity-70" />
        {label}
      </div>
      <div className="relative text-[32px] font-extrabold tracking-tight leading-none text-ct-cream">{value}</div>
    </div>
  )
}

function AttrPill({ icon: Icon, label, value, accent, span }) {
  const iconStyle = accent
    ? { background: 'rgba(197,138,119,0.14)', borderColor: 'rgba(197,138,119,0.35)', color: '#b06a4f' }
    : { background: 'rgba(151,168,134,0.14)', borderColor: 'rgba(151,168,134,0.30)', color: '#5f7a4e' }
  const spanCls = span === 3 ? 'sm:col-span-3' : ''
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-side border border-ct-hairline hover:border-ct-rim transition-colors ${spanCls}`}>
      <span
        className="flex-shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center border"
        style={iconStyle}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">{label}</div>
        <div className="text-sm text-ct-cream font-semibold leading-tight truncate">{value}</div>
      </div>
    </div>
  )
}

function InvBlock({ icon: Icon, label, items, tone, emptyText }) {
  const count = items.length
  const isEquip = tone === 'equip'
  return (
    <div className="p-4 rounded-2xl bg-side border border-ct-hairline mb-3">
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          <Icon size={13} className="opacity-70" />
          {label}
        </span>
        <span className="text-[11px] text-ink-muted">{count ? `${count} item${count === 1 ? '' : 's'}` : ''}</span>
      </div>
      {count === 0 ? (
        <div className="text-xs text-ink-muted italic">{emptyText}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={
                isEquip
                  ? { background: 'rgba(151,168,134,0.14)', color: '#5f7a4e', borderColor: 'rgba(151,168,134,0.35)' }
                  : { background: 'rgba(197,138,119,0.14)', color: '#b06a4f', borderColor: 'rgba(197,138,119,0.35)' }
              }
            >
              {!isEquip && <Crosshair size={10} className="opacity-85" />}
              {humanize(item)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
