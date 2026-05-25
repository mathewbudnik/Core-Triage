import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Loader2, Check, RotateCcw } from 'lucide-react'
import { setAvatar as apiSetAvatar, getMe } from '../api'
import { AVATAR_PRESETS, AVATAR_COLORS, resolveAvatar } from '../data/avatars'
import AvatarChip from './AvatarChip'
import { TRANSITIONS } from '../lib/motion'

/**
 * Picker modal for the user's avatar icon + optional color override.
 * Live-previews the chip at the top so users see exactly what others
 * will see on the leaderboard.
 *
 * Props:
 *   - user:         current user object (for fallback name + initial values)
 *   - onClose:      called to dismiss
 *   - onUserChange: called with the refreshed /me payload after save
 *   - onToast:      pass-through for the App-level toast strip
 */
export default function AvatarPickerModal({ user, onClose, onUserChange, onToast }) {
  const [icon, setIcon]   = useState(user?.avatar_icon  ?? null)
  const [color, setColor] = useState(user?.avatar_color ?? null)
  const [saving, setSaving] = useState(false)

  // Lock body scroll while open — same pattern as DisplayNamePromptModal.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Esc to dismiss, like the AccountMenu dropdown.
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const dirty = (icon ?? null) !== (user?.avatar_icon ?? null)
              || (color ?? null) !== (user?.avatar_color ?? null)

  async function handleSave() {
    if (!dirty || saving) return
    // Optimistic update: apply the new avatar to the user object + close
    // the modal immediately. Background sync runs after; on failure we
    // revert the user object and re-open the modal so the user can retry.
    const previous = { avatar_icon: user?.avatar_icon, avatar_color: user?.avatar_color }
    onUserChange?.({ ...user, avatar_icon: icon, avatar_color: color })
    onClose?.()
    setSaving(true)
    try {
      await apiSetAvatar({ icon, color })
      // Refresh in the background to pick up any normalization. Non-blocking.
      getMe().then((me) => onUserChange?.(me)).catch(() => {})
    } catch (err) {
      // Revert + notify. The modal is already closed; toast carries the
      // failure so the user knows the avatar didn't actually save.
      onUserChange?.({ ...user, avatar_icon: previous.avatar_icon, avatar_color: previous.avatar_color })
      onToast?.({ kind: 'error', message: err.message || 'Could not save avatar.' })
    } finally {
      setSaving(false)
    }
  }

  function handleClear() {
    setIcon(null)
    setColor(null)
  }

  // Resolve the live-preview style — falls back to initial if no icon.
  const previewName = user?.display_name || user?.email || '?'

  // Portal to body so the modal escapes the header's `backdrop-blur-sm`
  // — backdrop-filter on an ancestor creates a containing block for
  // descendants with `position: fixed`, which was clipping us.
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-bg/85 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={TRANSITIONS.dialog_in}
        className="relative w-full max-w-md bg-ct-forest-deep border border-ct-hairline rounded-2xl shadow-xl p-5 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-ct-cream/60 hover:text-ct-cream p-1"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Live preview — keyed on (icon,color) so any state change forces a
            clean re-mount of the chip. Fixes a stale-render case where the
            preview wasn't reflecting the picked shape after rapid cycling. */}
        <div className="flex items-center gap-3 pb-4 border-b border-ct-hairline">
          <AvatarChip
            key={`preview-${icon || 'none'}-${color || 'none'}`}
            icon={icon}
            color={color}
            name={previewName}
            size={64}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-ct-cream">Customize avatar</h2>
            <p className="text-xs text-ct-cream/60 leading-snug mt-0.5">
              Pick a shape and an optional color. This shows next to your name on leaderboards.
            </p>
          </div>
        </div>

        {/* Icon grid — 4 columns × 3 rows so each cell can be larger and
            the icons inside read at a glance. The grid wrapper gets extra
            padding so the selection ring + check badge never clip against
            the modal's overflow boundary. */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ct-cream/60 mb-2">Shape</p>
          <div className="grid grid-cols-4 gap-3 px-0.5 py-0.5">
            {AVATAR_PRESETS.map((preset) => {
              const selected = icon === preset.key
              const styled = resolveAvatar(preset.key, color)
              return (
                <button
                  key={preset.key}
                  onClick={() => setIcon(preset.key)}
                  className={`relative aspect-square rounded-xl flex items-center justify-center transition-shadow duration-100 ${
                    selected
                      ? 'ring-2 ring-ct-terracotta ring-offset-2 ring-offset-ct-forest-deep'
                      : 'hover:brightness-110'
                  }`}
                  style={{
                    background: styled.bg,
                    border: `1px solid ${styled.border}`,
                    boxShadow: `0 2px 6px rgba(0,0,0,0.3), ${styled.boxShadow}`,
                  }}
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={selected}
                >
                  <styled.Icon size={34} color={styled.iconColor} strokeWidth={2.5} />
                  {/* Check badge sits INSIDE the chip — outside-positioning
                      was getting clipped by the modal's overflow boundary
                      on edge cells. */}
                  {selected && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-ct-terracotta border border-ct-forest-deep flex items-center justify-center shadow">
                      <Check size={9} color="#0d1117" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Color overrides */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ct-cream/60">Color</p>
            {color && (
              <button
                onClick={() => setColor(null)}
                className="text-[10px] text-ct-cream/60 hover:text-ct-terracotta flex items-center gap-1"
              >
                <RotateCcw size={9} />
                Use default
              </button>
            )}
          </div>
          {/* 6-col grid (matches the 12 swatches at 2 rows). Removed
              min-w/min-h to stop swatch sizing from fighting the grid;
              aspect-square + the natural cell width give consistent rows. */}
          <div className="grid grid-cols-6 gap-2.5 px-0.5 py-0.5">
            {AVATAR_COLORS.map((swatch) => {
              const selected = color === swatch.key
              return (
                <button
                  key={swatch.key}
                  onClick={() => setColor(swatch.key)}
                  className={`relative aspect-square rounded-lg transition-shadow duration-100 ${
                    selected
                      ? 'ring-2 ring-ct-terracotta ring-offset-2 ring-offset-ct-forest-deep'
                      : 'hover:brightness-110'
                  }`}
                  style={{
                    background: swatch.bg,
                    border: `1px solid ${swatch.border}`,
                    boxShadow: `0 2px 4px rgba(0,0,0,0.25), ${swatch.boxShadow}`,
                  }}
                  aria-label={`${swatch.key} color`}
                  aria-pressed={selected}
                  title={swatch.key}
                >
                  {selected && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-ct-terracotta border border-ct-forest-deep flex items-center justify-center shadow">
                      <Check size={8} color="#0d1117" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-ct-cream/50 mt-1.5">
            Top row = solid tones. Bottom row = multi-color combos. Leave unset to use the shape's default.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleClear}
            disabled={saving || (!icon && !color)}
            className="text-xs text-ct-cream/60 hover:text-ct-cream px-3 py-2 rounded-lg disabled:opacity-40"
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-ct-hairline text-ct-cream/80 border border-ct-rim hover:brightness-110 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-ct-terracotta text-ct-cream hover:brightness-110 active:brightness-95 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
