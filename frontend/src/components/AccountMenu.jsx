import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, LogOut, Pencil, CreditCard, Sparkles,
  Loader2, Shield, Mail, Clock, Settings,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  openBillingPortal,
  getMe,
} from '../api'
import AvatarChip from './AvatarChip'
import AvatarPickerModal from './AvatarPickerModal'

// Subscription state badges shown in the menu header. The shape is a
// superset of the old free/pro tier model so existing layouts keep
// working — the trial / expired / coaching variants just give clearer
// context now that we've moved to a trial-then-subscribe model.
const STATE_BADGES = {
  active:   { bg: 'rgba(125,211,192,0.15)', border: 'rgba(125,211,192,0.35)', text: '#7dd3c0', label: 'Subscribed' },
  trial:    { bg: 'rgba(125,211,192,0.12)', border: 'rgba(125,211,192,0.30)', text: '#7dd3c0', label: 'Trial' },
  expired:  { bg: 'rgba(244,114,114,0.10)', border: 'rgba(244,114,114,0.30)', text: '#f47272', label: 'Trial ended' },
  coaching: { bg: 'rgba(247,187,81,0.15)',  border: 'rgba(247,187,81,0.35)',  text: '#f7bb51', label: 'Coaching' },
  coach:    { bg: 'rgba(247,187,81,0.15)',  border: 'rgba(247,187,81,0.35)',  text: '#f7bb51', label: 'Coach' },
}

function badgeFor(user) {
  if (user.is_coach) return STATE_BADGES.coach
  const state = user.subscription_state?.state
  return state ? STATE_BADGES[state] : null
}

export default function AccountMenu({ user, onUserChange, onLogout, onUpgradeClick, onToast }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function handleKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  async function refreshUser() {
    try {
      const me = await getMe()
      onUserChange?.(me)
    } catch {}
  }

  async function handleBilling() {
    if (billingLoading) return
    setBillingLoading(true)
    try {
      const { url } = await openBillingPortal()
      window.location.href = url
    } catch (err) {
      onToast?.({ kind: 'error', message: err.message || 'Could not open billing portal.' })
      setBillingLoading(false)
    }
  }

  const subState = user.subscription_state?.state
  const trialDaysLeft = user.subscription_state?.days_remaining
  // "Paying" for billing-portal purposes = active subscription or coaching.
  // Trial users should still see the upgrade CTA, not "Manage subscription".
  const isPaid = subState === 'active' || subState === 'coaching'
  const tierBadge = badgeFor(user)
  const avatarName = user.display_name || user.email

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border transition-colors ${
          open
            ? 'bg-ct-terra-tint border-ct-terracotta/40 text-ct-cream'
            : 'bg-ct-hairline border-ct-rim text-ct-cream/60 hover:text-ct-cream hover:border-ct-terracotta/30'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <AvatarChip
          icon={user.avatar_icon}
          color={user.avatar_color}
          name={avatarName}
          size={26}
        />
        <span className="hidden sm:inline max-w-[120px] truncate font-medium">
          {user.display_name || user.email}
        </span>
        <ChevronDown size={12} className={`transition-transform duration-150 mr-1 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
            style={{ transformOrigin: 'top right' }}
            role="menu"
            className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] bg-[#1a1f1e] border border-ct-rim rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-ct-hairline bg-ct-terra-tint">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => { setPickerOpen(true); setOpen(false) }}
                  className="relative group flex-shrink-0"
                  aria-label="Edit avatar"
                >
                  <AvatarChip
                    icon={user.avatar_icon}
                    color={user.avatar_color}
                    name={avatarName}
                    size={44}
                  />
                  <span className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil size={14} className="text-ct-cream" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-ct-cream truncate">
                      {user.display_name || 'No display name'}
                    </p>
                    {tierBadge && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: tierBadge.bg, color: tierBadge.text, border: `1px solid ${tierBadge.border}` }}
                      >
                        {tierBadge.label}
                      </span>
                    )}
                  </div>
                  {/* Trial countdown — only shown during trial, gives the
                      user a glanceable "X days left" right under their name. */}
                  {subState === 'trial' && trialDaysLeft != null && (
                    <p className="text-[10px] text-accent font-semibold mt-0.5">
                      {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left in your trial
                    </p>
                  )}
                  {subState === 'expired' && (
                    <p className="text-[10px] text-accent2 font-semibold mt-0.5">
                      Trial ended — subscribe to unlock
                    </p>
                  )}
                  <p className="text-[11px] text-ct-cream/50 truncate flex items-center gap-1 mt-0.5">
                    <Mail size={10} />
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="py-1 border-b border-ct-hairline">
              <button
                onClick={() => { setOpen(false); navigate('/settings') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-ct-terra-tint transition-colors"
                role="menuitem"
              >
                <Settings size={14} className="text-ct-cream/50 flex-shrink-0" />
                <span className="text-xs font-semibold text-ct-cream flex-1">Settings</span>
                <span className="text-[10px] text-ct-cream/50">Profile · climbing · billing</span>
              </button>
            </div>

            {/* History — moved here from the top nav so the bottom nav can
                stay focused on the 5 primary climbing surfaces. */}
            <div className="py-1 border-b border-ct-hairline">
              <button
                onClick={() => { setOpen(false); navigate('/history') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-ct-terra-tint transition-colors"
                role="menuitem"
              >
                <Clock size={14} className="text-ct-cream/50 flex-shrink-0" />
                <span className="text-xs font-semibold text-ct-cream flex-1">History</span>
                <span className="text-[10px] text-ct-cream/50">Your past sessions</span>
              </button>
            </div>

            {/* Billing */}
            <div className="py-1 border-b border-ct-hairline">
              {isPaid ? (
                <button
                  onClick={handleBilling}
                  disabled={billingLoading}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-ct-terra-tint transition-colors disabled:opacity-60"
                  role="menuitem"
                >
                  {billingLoading
                    ? <Loader2 size={14} className="animate-spin text-ct-cream/50 flex-shrink-0" />
                    : <CreditCard size={14} className="text-ct-cream/50 flex-shrink-0" />}
                  <span className="text-xs font-semibold text-ct-cream">Manage subscription</span>
                </button>
              ) : (
                <button
                  onClick={() => { setOpen(false); onUpgradeClick?.() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-ct-terra-tint transition-colors"
                  role="menuitem"
                >
                  <Sparkles size={14} className="text-ct-terracotta flex-shrink-0" />
                  <span className="text-xs font-semibold text-ct-cream">Upgrade to Pro</span>
                </button>
              )}
            </div>

            {/* Coach badge row (read-only — for coaches only) */}
            {user.is_coach && (
              <div className="px-4 py-2 border-b border-ct-hairline flex items-center gap-2 bg-ct-terra-tint">
                <Shield size={12} className="text-ct-terracotta" />
                <span className="text-[11px] font-semibold text-ct-terracotta">Coach access</span>
              </div>
            )}

            {/* Log out */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); onLogout() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-500/10 text-red-400 transition-colors"
                role="menuitem"
              >
                <LogOut size={14} className="flex-shrink-0" />
                <span className="text-xs font-semibold">Log out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pickerOpen && (
        <AvatarPickerModal
          user={user}
          onClose={() => setPickerOpen(false)}
          onUserChange={onUserChange}
          onToast={onToast}
        />
      )}
    </div>
  )
}
