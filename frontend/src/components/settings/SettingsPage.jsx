import { useCallback, useEffect, useState } from 'react'
import SettingsSidebar from './SettingsSidebar'
import SettingsMobileTabs from './SettingsMobileTabs'
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

  // Scroll-spy: highlight the section closest to the viewport's "lower top"
  // (a hair below the sticky app topbar). Threshold is intentionally below the
  // sections' scrollMarginTop so a freshly-scrolled-to section reads as active.
  useEffect(() => {
    function onScroll() {
      const offsets = SECTION_IDS.map((id) => {
        const el = document.getElementById(id)
        if (!el) return { id, top: Infinity }
        return { id, top: el.getBoundingClientRect().top }
      })
      const passed = offsets.filter((o) => o.top <= 140)
      const next = passed.length ? passed[passed.length - 1].id : 'profile'
      setActive(next)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Smooth-scroll to a section. The section's own `scrollMarginTop` (set in
  // SettingsSection / ProfileHero) provides the topbar+pill-strip offset so we
  // don't have to compute it here.
  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Optimistically mark active so the nav indicator slides immediately
    // (scroll-spy will reconcile once the smooth scroll completes).
    setActive(id)
  }, [])

  return (
    <div
      className="relative"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 1200px 600px at 20% -10%, rgba(151,168,134,0.07), transparent 60%), ' +
          'radial-gradient(ellipse 1000px 500px at 90% 10%, rgba(197,138,119,0.06), transparent 60%)',
      }}
    >
      <div className="relative z-[1] max-w-[1140px] mx-auto grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-9 px-5 lg:px-7 pt-7 pb-20">
        <SettingsSidebar active={active} onNavigate={scrollToSection} />

        <main className="min-w-0">
          <div className="mb-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted mb-2">
              Settings
            </div>
            <h1 className="text-[34px] font-extrabold tracking-tight leading-[1.05] text-ct-cream m-0">
              Make it{' '}
              <span
                style={{
                  backgroundImage: 'linear-gradient(90deg, #b06a4f, #c58a77)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                yours
              </span>
              .
            </h1>
            <p className="text-ink-soft mt-2 text-sm max-w-[560px]">
              Profile, climbing style, subscription, and privacy — all in one place.
            </p>
          </div>

          <SettingsMobileTabs active={active} onNavigate={scrollToSection} />

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
