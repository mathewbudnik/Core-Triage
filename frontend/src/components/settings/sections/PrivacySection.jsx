import { useState } from 'react'
import { Eye } from 'lucide-react'
import SettingsSection from '../SettingsSection'
import { setLeaderboardPrivate } from '../../../api'

export default function PrivacySection({ user, onUserChange, onToast }) {
  // user.leaderboard_private = true means HIDDEN. UI label is "Show me on the leaderboard"
  // which is the inverse — map carefully.
  const visible = !user?.leaderboard_private
  const [saving, setSaving] = useState(false)

  async function toggle() {
    if (saving) return
    const nextVisible = !visible
    const prev = user
    onUserChange?.({ ...user, leaderboard_private: !nextVisible })
    setSaving(true)
    try {
      await setLeaderboardPrivate(!nextVisible)
    } catch (err) {
      onUserChange?.(prev)
      onToast?.({ kind: 'error', message: err.message || 'Could not save leaderboard preference.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection id="privacy" icon={Eye} title="Visibility" sub="Control what other climbers see.">
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-black/20 border border-ct-hairline">
        <span className="flex-shrink-0 w-14 h-14 rounded-xl border border-accent/30 inline-flex items-center justify-center text-accent" style={{ background: 'rgba(20,184,166,0.12)' }}>
          <Eye size={22} />
        </span>
        <div className="flex-1">
          <h4 className="font-bold text-ct-cream m-0">Show me on the leaderboard</h4>
          <p className="text-xs text-ct-cream/50 mt-1 max-w-md">
            Your stats still count toward cohort aggregates when off — only the display name is hidden.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={visible}
          onClick={toggle}
          disabled={saving}
          className={
            'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ' +
            (visible ? 'bg-ct-terracotta' : 'bg-ct-rim')
          }
          style={visible ? { boxShadow: '0 0 16px rgba(217,119,87,0.45)' } : undefined}
        >
          <span
            className={
              'absolute top-0.5 w-5 h-5 rounded-full bg-ct-cream transition-[left] ' +
              (visible ? 'left-[22px]' : 'left-0.5')
            }
          />
        </button>
      </div>
    </SettingsSection>
  )
}
