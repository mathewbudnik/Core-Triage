import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, LogOut, Pencil, CreditCard, Sparkles,
  Eye, EyeOff, Check, X, Loader2, Shield, Mail, Trophy, Palette,
} from 'lucide-react'
import {
  setDisplayName as apiSetDisplayName,
  setLeaderboardPrivate as apiSetPrivate,
  openBillingPortal,
  getMe,
} from '../api'
import AvatarChip from './AvatarChip'
import AvatarPickerModal from './AvatarPickerModal'

const NAME_RE = /^[A-Za-z0-9_-]{3,20}$/

const TIER_THEME = {
  pro:   { bg: 'rgba(125,211,192,0.15)', border: 'rgba(125,211,192,0.35)', text: '#7dd3c0', label: 'Pro' },
  coach: { bg: 'rgba(247,187,81,0.15)',  border: 'rgba(247,187,81,0.35)',  text: '#f7bb51', label: 'Coach' },
  free:  null,
}

export default function AccountMenu({ user, onUserChange, onLogout, onUpgradeClick, onToast }) {
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(user.display_name || '')
  const [savingName, setSavingName] = useState(false)
  const [savingPrivate, setSavingPrivate] = useState(false)
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

  useEffect(() => {
    setDraftName(user.display_name || '')
    setEditingName(false)
  }, [user.display_name])

  const localNameError = (() => {
    if (!editingName) return null
    if (!draftName) return 'Required.'
    if (!NAME_RE.test(draftName)) return '3–20 chars · letters, digits, _ -'
    return null
  })()

  async function refreshUser() {
    try {
      const me = await getMe()
      onUserChange?.(me)
    } catch {}
  }

  async function handleSaveName() {
    if (localNameError || savingName) return
    if (draftName === user.display_name) { setEditingName(false); return }
    setSavingName(true)
    try {
      await apiSetDisplayName(draftName)
      await refreshUser()
      setEditingName(false)
      onToast?.({ kind: 'info', message: 'Display name updated.' })
    } catch (err) {
      onToast?.({ kind: 'error', message: err.message || 'Could not save display name.' })
    } finally {
      setSavingName(false)
    }
  }

  async function handleTogglePrivate() {
    if (savingPrivate) return
    const next = !user.leaderboard_private
    setSavingPrivate(true)
    try {
      await apiSetPrivate(next)
      await refreshUser()
    } catch (err) {
      onToast?.({ kind: 'error', message: err.message || 'Could not update privacy.' })
    } finally {
      setSavingPrivate(false)
    }
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

  const isPaid = user.tier && user.tier !== 'free'
  const tierBadge = user.is_coach ? TIER_THEME.coach : (isPaid ? TIER_THEME.pro : null)
  const avatarName = user.display_name || user.email

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border transition-colors ${
          open
            ? 'bg-accent/10 border-accent/40 text-text'
            : 'bg-panel border-outline text-muted hover:text-text hover:border-accent/30'
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
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] bg-panel2 border border-outline rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-outline bg-panel/50">
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
                  <span className="absolute inset-0 rounded-xl bg-bg/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil size={14} className="text-text" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-text truncate">
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
                  <p className="text-[11px] text-muted truncate flex items-center gap-1 mt-0.5">
                    <Mail size={10} />
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Display name editor */}
            <div className="px-2 py-2 border-b border-outline">
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1.5 flex items-center gap-1.5">
                  <Trophy size={9} />
                  Display name
                </p>
                {editingName ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={draftName}
                        autoFocus
                        onChange={(e) => setDraftName(e.target.value.slice(0, 24))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName()
                          if (e.key === 'Escape') { setEditingName(false); setDraftName(user.display_name || '') }
                        }}
                        disabled={savingName}
                        maxLength={24}
                        className="input-base flex-1 text-xs py-1.5"
                        placeholder="Display name"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={!!localNameError || savingName}
                        className="p-1.5 rounded-md bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 disabled:opacity-40"
                        aria-label="Save"
                      >
                        {savingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setDraftName(user.display_name || '') }}
                        disabled={savingName}
                        className="p-1.5 rounded-md bg-panel border border-outline text-muted hover:text-text"
                        aria-label="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {localNameError && <p className="text-[10px] text-accent2 px-0.5">{localNameError}</p>}
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingName(true)}
                    className="w-full flex items-center justify-between text-left text-sm text-text hover:text-accent group"
                  >
                    <span className="truncate font-medium">
                      {user.display_name || <span className="italic text-muted">Set a display name</span>}
                    </span>
                    <Pencil size={11} className="text-muted/60 group-hover:text-accent flex-shrink-0 ml-2" />
                  </button>
                )}
              </div>
            </div>

            {/* Customize avatar */}
            <div className="py-1 border-b border-outline">
              <button
                onClick={() => { setPickerOpen(true); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-panel transition-colors"
                role="menuitem"
              >
                <Palette size={14} className="text-accent flex-shrink-0" />
                <span className="text-xs font-semibold text-text flex-1">Customize avatar</span>
                <span className="text-[10px] text-muted">
                  {user.avatar_icon ? 'Edit' : 'Pick one'}
                </span>
              </button>
            </div>

            {/* Leaderboard privacy toggle */}
            <div className="py-1 border-b border-outline">
              <button
                onClick={handleTogglePrivate}
                disabled={savingPrivate}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-panel transition-colors disabled:opacity-60"
                role="menuitem"
              >
                {user.leaderboard_private
                  ? <EyeOff size={14} className="text-muted flex-shrink-0" />
                  : <Eye size={14} className="text-accent flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text">
                    Leaderboard {user.leaderboard_private ? 'hidden' : 'visible'}
                  </p>
                  <p className="text-[10px] text-muted leading-tight mt-0.5">
                    {user.leaderboard_private
                      ? 'Your sessions stay private.'
                      : 'You appear on public leaderboards.'}
                  </p>
                </div>
                {savingPrivate ? (
                  <Loader2 size={12} className="animate-spin text-muted flex-shrink-0" />
                ) : (
                  <span
                    className={`relative w-8 h-4 rounded-full flex-shrink-0 transition-colors ${
                      user.leaderboard_private ? 'bg-outline' : 'bg-accent/40'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-text transition-all ${
                        user.leaderboard_private ? 'left-0.5' : 'left-[18px] bg-accent'
                      }`}
                    />
                  </span>
                )}
              </button>
            </div>

            {/* Billing */}
            <div className="py-1 border-b border-outline">
              {isPaid ? (
                <button
                  onClick={handleBilling}
                  disabled={billingLoading}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-panel transition-colors disabled:opacity-60"
                  role="menuitem"
                >
                  {billingLoading
                    ? <Loader2 size={14} className="animate-spin text-muted flex-shrink-0" />
                    : <CreditCard size={14} className="text-muted flex-shrink-0" />}
                  <span className="text-xs font-semibold text-text">Manage subscription</span>
                </button>
              ) : (
                <button
                  onClick={() => { setOpen(false); onUpgradeClick?.() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-panel transition-colors"
                  role="menuitem"
                >
                  <Sparkles size={14} className="text-accent flex-shrink-0" />
                  <span className="text-xs font-semibold text-text">Upgrade to Pro</span>
                </button>
              )}
            </div>

            {/* Coach badge row (read-only — for coaches only) */}
            {user.is_coach && (
              <div className="px-4 py-2 border-b border-outline flex items-center gap-2 bg-accent3/5">
                <Shield size={12} className="text-accent3" />
                <span className="text-[11px] font-semibold text-accent3">Coach access</span>
              </div>
            )}

            {/* Log out */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); onLogout() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent2/10 text-accent2 transition-colors"
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
