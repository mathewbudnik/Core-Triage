import { useEffect, useState } from 'react'
import { Mountain } from 'lucide-react'
import SettingsSection from '../SettingsSection'
import EditClimbingProfileModal from './EditClimbingProfileModal'
import { getProfile } from '../../../api'

// Grade tier coloring for the current/goal headline.
function gradeColor(grade) {
  if (!grade || grade === '—') return 'text-ct-cream/50'
  const match = /^V(\d+)/i.exec(grade)
  if (match) {
    const n = parseInt(match[1], 10)
    if (n <= 3) return 'text-accent'
    if (n <= 6) return 'text-accent3'
    if (n <= 9) return 'text-ct-terracotta'
    return 'text-red-400'
  }
  return 'text-ct-cream'
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

  const current = profile?.primary_discipline === 'route'
    ? (profile?.max_grade_route || '—')
    : (profile?.max_grade_boulder || '—')
  const goal = profile?.goal_grade || '—'
  const trainingDays = new Set(profile?.training_days || [])

  return (
    <>
      <SettingsSection
        id="climbing"
        icon={Mountain}
        title="Climbing profile"
        sub="Used by the AI coach and training recommendations."
      >
        {/* Grade strip */}
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-4 rounded-2xl border border-ct-hairline mb-4"
          style={{ backgroundImage: 'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(217,119,87,0.06))' }}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ct-cream/50 mb-1.5">Current</div>
            <div className={`text-[28px] font-extrabold tracking-tight ${gradeColor(current)}`}>{current}</div>
          </div>
          <div className="w-9 h-1 rounded relative" style={{ backgroundImage: 'linear-gradient(90deg, #14b8a6, #d97757)' }}>
            <span aria-hidden className="absolute -right-1 -top-[3px] w-0 h-0 border-l-[6px] border-l-ct-terracotta border-y-[5px] border-y-transparent" />
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ct-cream/50 mb-1.5">Goal</div>
            <div className={`text-[28px] font-extrabold tracking-tight ${gradeColor(goal)}`}>{goal}</div>
          </div>
        </div>

        {/* Training days */}
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ct-cream/50 mb-2">Training days</div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = trainingDays.has(d.k)
              return (
                <div
                  key={d.k}
                  className={
                    'py-3 text-center rounded-xl text-xs font-semibold border ' +
                    (on
                      ? 'bg-ct-terra-tint border-ct-terracotta/35 text-ct-terracotta'
                      : 'bg-black/20 border-ct-hairline text-ct-cream/30')
                  }
                >
                  {d.short}
                  {on && <div aria-hidden className="mx-auto mt-1.5 w-1.5 h-1.5 rounded-full bg-ct-terracotta" style={{ boxShadow: '0 0 8px #d97757' }} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Attribute grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          <AttrCard k="Experience" v={profile?.experience_level || '—'} />
          <AttrCard k="Discipline" v={profile?.primary_discipline || '—'} />
          <AttrCard k="Max route" v={profile?.max_grade_route || '—'} />
          <AttrCard k="Session length" v={profile?.session_length_min ? `${profile.session_length_min} min` : '—'} />
          <AttrCard k="Primary goal" v={profile?.primary_goal || '—'} />
          <AttrCard
            k="Equipment"
            tags={(profile?.equipment || []).map((e) => ({ label: e, tone: 'equip' }))}
          />
          <AttrCard
            k="Weaknesses"
            tags={(profile?.weaknesses || []).map((w) => ({ label: w, tone: 'weak' }))}
          />
        </div>

        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-ct-terracotta/35 text-ct-terracotta text-xs font-semibold hover:bg-ct-terra-tint transition-colors"
        >
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

function AttrCard({ k, v, tags }) {
  return (
    <div className="rounded-xl bg-black/20 border border-ct-hairline px-3.5 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ct-cream/50 mb-1">{k}</div>
      {tags ? (
        tags.length ? (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tags.map((t, i) => (
              <span
                key={i}
                className={
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border'
                }
                style={
                  t.tone === 'equip'
                    ? { background: 'rgba(20,184,166,0.08)', color: '#14b8a6', borderColor: 'rgba(20,184,166,0.25)' }
                    : { background: 'rgba(251,191,36,0.10)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.25)' }
                }
              >
                {t.label}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-ct-cream/40">None</div>
        )
      ) : (
        <div className="text-sm text-ct-cream font-semibold">{v}</div>
      )}
    </div>
  )
}
