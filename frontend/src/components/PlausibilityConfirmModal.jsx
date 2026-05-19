import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, X } from 'lucide-react'

/**
 * Plausibility check shown before saving a training log that contains a
 * grade well above the user's all-time hardest. The intent is friction,
 * not gatekeeping — every confirm path goes through, but the explicit
 * "this is 4 tiers above your hardest" math adds a cognitive cost that
 * deters casual fabrication.
 *
 * Two intensity levels:
 *   - 'soft':   simple confirm. Triggered when logged > hardest + 2 tiers.
 *   - 'strong': confirm + required short note. Triggered at +4 tiers.
 *
 * Props:
 *   level:        'soft' | 'strong'
 *   newGrade:     string ('V12', '5.13a', etc.)
 *   hardestGrade: string | null   — the user's previous hardest send (same discipline)
 *   tierDiff:     number          — how many tiers above hardest
 *   onConfirm:    (note?: string) => void
 *   onEdit:       () => void      — dismiss + let user edit the counter
 */
export default function PlausibilityConfirmModal({
  level, newGrade, hardestGrade, tierDiff, onConfirm, onEdit,
}) {
  const [note, setNote] = useState('')
  const needsNote = level === 'strong'
  const noteValid = !needsNote || note.trim().length >= 10

  return (
    <div className="fixed inset-0 z-[150] bg-bg/80 backdrop-blur-sm flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-sm rounded-2xl p-5 relative"
        style={{
          background: 'linear-gradient(180deg, rgba(20,30,48,0.98), rgba(11,18,32,0.98))',
          border: '0.5px solid rgba(251,113,133,0.25)',
          boxShadow: '0 8px 36px rgba(0,0,0,0.5), 0 0 60px rgba(251,113,133,0.08)',
        }}
      >
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit grade"
          className="absolute top-3 right-3 w-7 h-7 rounded-md inline-flex items-center justify-center
                     text-muted hover:text-text hover:bg-white/5 transition-colors"
        >
          <X size={14} />
        </button>

        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl
                        bg-[rgba(251,113,133,0.15)] border-[0.5px] border-[rgba(251,113,133,0.35)]
                        text-[#fda4af] mb-3">
          <AlertTriangle size={18} strokeWidth={2.2} />
        </div>

        <h2 className="text-lg font-extrabold text-text -tracking-[0.01em] mb-1.5">
          Confirm this send?
        </h2>
        <p className="text-[13px] text-muted leading-relaxed mb-4">
          <span className="text-text font-bold">{newGrade}</span> is{' '}
          <span className="text-[#fda4af] font-bold">
            +{tierDiff} {tierDiff === 1 ? 'tier' : 'tiers'}
          </span>{' '}
          above your previous hardest
          {hardestGrade ? <> (<span className="text-text font-bold">{hardestGrade}</span>)</> : null}.
          {level === 'strong' && ' Add a quick note about the send to log it.'}
        </p>

        {needsNote && (
          <div className="mb-4">
            <label className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted/80 block mb-1.5">
              About this send
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. flash, project send, outdoor day at Bishop…"
              rows={2}
              maxLength={300}
              className="input-base w-full text-xs leading-snug resize-none"
            />
            <p className="text-[10px] text-muted/50 mt-1">
              {Math.max(0, 10 - note.trim().length)} chars to go
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 h-10 rounded-xl text-xs font-bold
                       bg-white/[0.04] border-[0.5px] border-white/12
                       text-muted hover:text-text transition-colors"
          >
            Edit grade
          </button>
          <button
            type="button"
            onClick={() => noteValid && onConfirm(needsNote ? note.trim() : undefined)}
            disabled={!noteValid}
            className="flex-1 h-10 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5
                       bg-[var(--tier-c,#14b8a6)] text-bg transition-opacity
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm send
            <ArrowRight size={13} strokeWidth={2.6} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
