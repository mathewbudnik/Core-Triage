import { useEffect, useState } from 'react'
import SettingsSidebar from './SettingsSidebar'
import ProfileHero from './sections/ProfileHero'
import ClimbingProfileSection from './sections/ClimbingProfileSection'
import SubscriptionSection from './sections/SubscriptionSection'
import SecuritySection from './sections/SecuritySection'
import PrivacySection from './sections/PrivacySection'
import DataSection from './sections/DataSection'
import AboutSection from './sections/AboutSection'
import DangerZoneSection from './sections/DangerZoneSection'

const SECTION_IDS = [
  'profile', 'climbing', 'subscription', 'security', 'privacy', 'data', 'about', 'danger',
]

/**
 * Settings page route.
 *
 * Props (passed by App.jsx, mirroring how AccountMenu receives them):
 *   - user, onUserChange, onLogout, onToast, onUpgradeClick
 */
export default function SettingsPage({ user, onUserChange, onLogout, onToast, onUpgradeClick }) {
  const [active, setActive] = useState('profile')

  useEffect(() => {
    function onScroll() {
      const offsets = SECTION_IDS.map((id) => {
        const el = document.getElementById(id)
        if (!el) return { id, top: Infinity }
        return { id, top: el.getBoundingClientRect().top }
      })
      const passed = offsets.filter((o) => o.top <= 120)
      const next = passed.length ? passed[passed.length - 1].id : 'profile'
      setActive(next)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="relative"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 1200px 600px at 20% -10%, rgba(20,184,166,0.05), transparent 60%), ' +
          'radial-gradient(ellipse 1000px 500px at 90% 10%, rgba(217,119,87,0.04), transparent 60%)',
      }}
    >
      <div className="relative z-[1] max-w-[1140px] mx-auto grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-9 px-5 lg:px-7 pt-7 pb-20">
        <SettingsSidebar active={active} />

        <main className="min-w-0">
          <div className="mb-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ct-cream/30 mb-2">
              Settings
            </div>
            <h1 className="text-[34px] font-extrabold tracking-tight leading-[1.05] text-ct-cream m-0">
              Make it{' '}
              <span
                style={{
                  backgroundImage: 'linear-gradient(90deg, #d97757, #f0a875)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                yours
              </span>
              .
            </h1>
            <p className="text-ct-cream/70 mt-2 text-sm max-w-[560px]">
              Profile, climbing style, subscription, and privacy — all in one place.
            </p>
          </div>

          <ProfileHero user={user} onUserChange={onUserChange} onToast={onToast} />
          <ClimbingProfileSection user={user} onUserChange={onUserChange} onToast={onToast} />
          <SubscriptionSection user={user} onUpgradeClick={onUpgradeClick} onToast={onToast} />
          <SecuritySection user={user} onToast={onToast} />
          <PrivacySection user={user} onUserChange={onUserChange} onToast={onToast} />
          <DataSection user={user} />
          <AboutSection />
          <DangerZoneSection onDeleted={onLogout} onToast={onToast} />
        </main>
      </div>
    </div>
  )
}
