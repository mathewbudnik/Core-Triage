import { useEffect, useState } from 'react'
import { Pencil, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import AvatarChip from '../../AvatarChip'
import AvatarPickerModal from '../../AvatarPickerModal'
import {
  setDisplayName as apiSetDisplayName,
  saveBodyMeasurements,
  getProfile,
  getTrainingStats,
  resendVerification,
} from '../../../api'

const NAME_RE = /^[A-Za-z0-9_-]{3,20}$/

const TIER_BADGE = {
  active:   { bg: 'rgba(125,211,192,0.15)', border: 'rgba(125,211,192,0.35)', text: '#7dd3c0', label: 'Subscribed' },
  trial:    { bg: 'rgba(125,211,192,0.12)', border: 'rgba(125,211,192,0.30)', text: '#7dd3c0', label: 'Trial' },
  expired:  { bg: 'rgba(244,114,114,0.10)', border: 'rgba(244,114,114,0.30)', text: '#f47272', label: 'Trial ended' },
  coaching: { bg: 'rgba(247,187,81,0.15)',  border: 'rgba(247,187,81,0.35)',  text: '#f7bb51', label: 'Coaching' },
  coach:    { bg: 'rgba(247,187,81,0.15)',  border: 'rgba(247,187,81,0.35)',  text: '#f7bb51', label: 'Coach' },
}

function tierFor(user) {
  if (user?.is_coach) return TIER_BADGE.coach
  const state = user?.subscription_state?.state
  return state ? TIER_BADGE[state] : null
}

export default function ProfileHero({ user, onUserChange, onToast }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [resendBusy, setResendBusy] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.allSettled([getProfile(), getTrainingStats()]).then(([p, s]) => {
      if (!alive) return
      if (p.status === 'fulfilled') setProfile(p.value)
      if (s.status === 'fulfilled') setStats(s.value)
    })
    return () => { alive = false }
  }, [user?.id])

  const tier = tierFor(user)
  const avatarName = user?.display_name || user?.email || 'You'
  const sessionsCount = stats?.all?.sessions ?? 0
  const streakDays = stats?.streak_days ?? 0
  const currentGrade =
    profile?.primary_discipline === 'route'
      ? (profile?.max_grade_route || '—')
      : (profile?.max_grade_boulder || '—')
  const goalGrade = profile?.goal_grade || '—'

  async function handleResend() {
    if (resendBusy) return
    setResendBusy(true)
    try {
      await resendVerification()
      onToast?.({ kind: 'success', message: 'Verification email sent. Check your inbox.' })
    } catch (err) {
      onToast?.({ kind: 'error', message: err.message || 'Could not resend verification.' })
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <>
      <section
        id="profile"
        className="relative overflow-hidden rounded-[22px] border border-ct-rim p-7 mb-4"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 600px 300px at 20% 0%, rgba(20,184,166,0.10), transparent 65%), ' +
            'radial-gradient(ellipse 500px 400px at 100% 100%, rgba(217,119,87,0.10), transparent 60%), ' +
            'linear-gradient(180deg, #2a3534, #1c2322)',
        }}
      >
        <div className="relative flex gap-5 items-center">
          <button
            onClick={() => setPickerOpen(true)}
            className="relative group flex-shrink-0"
            aria-label="Edit avatar"
            style={{ filter: 'drop-shadow(0 12px 32px rgba(217,119,87,0.4))' }}
          >
            <AvatarChip
              icon={user?.avatar_icon}
              color={user?.avatar_color}
              name={avatarName}
              size={96}
            />
            <span className="absolute -right-1.5 -bottom-1.5 w-7 h-7 rounded-full bg-ct-forest-deep border border-ct-rim flex items-center justify-center text-ct-cream/70 opacity-90 group-hover:opacity-100 transition-opacity">
              <Pencil size={13} />
            </span>
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-[26px] font-extrabold tracking-tight m-0 flex items-center gap-3 flex-wrap text-ct-cream">
              <span className="truncate">{user?.display_name || 'No display name'}</span>
              {tier && (
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
                  style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}
                >
                  {tier.label}
                </span>
              )}
            </h2>
            <div className="text-ct-cream/50 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
              <Mail size={13} className="opacity-70" />
              <span className="truncate">{user?.email}</span>
              {user?.email_verified ? (
                <span className="inline-flex items-center gap-1 text-accent text-[11px] font-semibold">
                  <CheckCircle2 size={11} strokeWidth={2.5} />
                  Verified
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendBusy}
                  className="inline-flex items-center gap-1 text-accent3 text-[11px] font-semibold hover:underline disabled:opacity-50"
                >
                  {resendBusy ? <Loader2 size={11} className="animate-spin" /> : null}
                  Resend verification
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <Stat value={sessionsCount} label="Sessions" tone="teal" />
          <Stat value={streakDays} label="Day streak" tone="terra" />
          <Stat value={currentGrade} label="Current grade" />
          <Stat value={goalGrade} label="Goal" />
        </div>

        <div className="relative mt-5 pt-5 border-t border-ct-hairline">
          <DisplayNameRow user={user} onUserChange={onUserChange} onToast={onToast} />
          <BodyMeasurementRow
            user={user}
            profile={profile}
            field="height_cm"
            label="Height"
            hint="Used by the Movement Analyzer for body-relative calibration"
            onSaved={(p) => setProfile(p)}
            onToast={onToast}
          />
          <BodyMeasurementRow
            user={user}
            profile={profile}
            field="ape_index_cm"
            label="Ape index"
            hint="Arm span minus height"
            allowNegative
            onSaved={(p) => setProfile(p)}
            onToast={onToast}
          />
        </div>
      </section>

      {pickerOpen && (
        <AvatarPickerModal
          user={user}
          onClose={() => setPickerOpen(false)}
          onUserChange={onUserChange}
          onToast={onToast}
        />
      )}
    </>
  )
}

function Stat({ value, label, tone }) {
  const color = tone === 'teal' ? 'text-accent' : tone === 'terra' ? 'text-ct-terracotta' : 'text-ct-cream'
  return (
    <div className="rounded-[14px] bg-black/20 border border-ct-hairline p-3.5">
      <div className={`text-[22px] font-extrabold tracking-tight ${color}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ct-cream/50 mt-1">{label}</div>
    </div>
  )
}

function DisplayNameRow({ user, onUserChange, onToast }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(user?.display_name || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(user?.display_name || ''); setEditing(false) }, [user?.display_name])

  const localError = (() => {
    if (!editing) return null
    if (!draft) return 'Required.'
    if (!NAME_RE.test(draft)) return '3–20 chars · letters, digits, _ -'
    return null
  })()

  async function save() {
    if (localError || saving) return
    if (draft === user?.display_name) { setEditing(false); return }
    setSaving(true)
    const prev = user?.display_name
    onUserChange?.({ ...user, display_name: draft })
    try {
      await apiSetDisplayName(draft)
    } catch (err) {
      onUserChange?.({ ...user, display_name: prev })
      onToast?.({ kind: 'error', message: err.message || 'Could not save display name.' })
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-t border-ct-hairline first:border-t-0 first:pt-0">
      <div>
        <div className="text-sm font-semibold text-ct-cream">Display name</div>
        <div className="text-[11px] text-ct-cream/50 mt-0.5">Shown on the leaderboard</div>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value.slice(0, 24))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') { setEditing(false); setDraft(user?.display_name || '') }
            }}
            maxLength={24}
            disabled={saving}
            className="bg-black/30 border border-ct-hairline rounded-lg px-3 py-1.5 text-sm text-ct-cream focus:border-ct-terracotta/50 focus:outline-none"
          />
          <button onClick={save} disabled={!!localError || saving} className="px-3 py-1.5 text-xs rounded-md bg-accent/15 border border-accent/30 text-accent disabled:opacity-40">
            {saving ? '…' : 'Save'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-ct-cream px-3 py-1.5 rounded-lg border border-ct-hairline bg-black/20 hover:border-ct-terracotta/35 min-w-[140px] text-right"
        >
          {user?.display_name || <span className="italic text-ct-cream/50">Set a name</span>}
        </button>
      )}
    </div>
  )
}

function BodyMeasurementRow({ user, profile, field, label, hint, allowNegative = false, onSaved, onToast }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile && profile[field] != null) setDraft(String(profile[field]))
  }, [profile, field])

  async function save() {
    if (saving) return
    const numeric = parseInt(draft, 10)
    if (Number.isNaN(numeric)) {
      onToast?.({ kind: 'error', message: `${label} must be a number.` })
      return
    }
    if (!allowNegative && numeric < 0) {
      onToast?.({ kind: 'error', message: `${label} cannot be negative.` })
      return
    }
    setSaving(true)
    try {
      await saveBodyMeasurements({ [field]: numeric })
      onSaved?.({ ...profile, [field]: numeric })
      setEditing(false)
    } catch (err) {
      onToast?.({ kind: 'error', message: err.message || `Could not save ${label.toLowerCase()}.` })
    } finally {
      setSaving(false)
    }
  }

  const displayValue = profile?.[field] != null ? `${profile[field]} cm` : 'Not set'

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-t border-ct-hairline">
      <div>
        <div className="text-sm font-semibold text-ct-cream">{label}</div>
        <div className="text-[11px] text-ct-cream/50 mt-0.5">{hint}</div>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') { setEditing(false); setDraft(profile?.[field] != null ? String(profile[field]) : '') }
            }}
            disabled={saving}
            className="w-20 bg-black/30 border border-ct-hairline rounded-lg px-3 py-1.5 text-sm text-ct-cream focus:border-ct-terracotta/50 focus:outline-none"
          />
          <span className="text-xs text-ct-cream/50">cm</span>
          <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs rounded-md bg-accent/15 border border-accent/30 text-accent disabled:opacity-40">
            {saving ? '…' : 'Save'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-ct-cream px-3 py-1.5 rounded-lg border border-ct-hairline bg-black/20 hover:border-ct-terracotta/35 min-w-[140px] text-right"
        >
          {displayValue}
        </button>
      )}
    </div>
  )
}
