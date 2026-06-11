import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useSessionLog } from '../../hooks/useSessionLog'
import { previewSendXP } from '../../lib/sendPreview'
import { getActiveStyle, setActiveStyle } from '../../lib/styleStore'
import GradeScroller from './GradeScroller'
import OutcomeSegmented from './OutcomeSegmented'
import PendingSendsList from './PendingSendsList'
import SessionDetailsPanel from './SessionDetailsPanel'
import StyleChipStrip from '../StyleChipStrip'
import RewardPreview from '../ui/RewardPreview'
import ClimbLogSection from '../ClimbLogSection'
import SessionSummaryOverlay from '../ui/SessionSummaryOverlay'
import PlausibilityConfirmModal from '../PlausibilityConfirmModal'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// Single/Bulk segmented toggle in the hero header.
function ModeToggle({ bulk, onChange }) {
  return (
    <div className="flex p-0.5 rounded-xl bg-panel/70 border border-ct-hairline text-[11px] font-bold shrink-0">
      {[['single', 'Single'], ['bulk', 'Bulk']].map(([id, label]) => {
        const active = (id === 'bulk') === bulk
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id === 'bulk')}
            aria-pressed={active}
            className={['px-2.5 py-1 rounded-lg transition-colors', active ? 'bg-clay/15 text-clay-deep' : 'text-ink-muted'].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// The fast single-send hero: grade scroller → outcome → style → Add.
function LogHero({ sessionType, engineState, onAdd }) {
  const [grade, setGrade] = useState(null)
  const [outcome, setOutcome] = useState('redpoint')
  const [style, setStyle] = useState(getActiveStyle)

  const { xp } = previewSendXP({ grade, outcome, stylePrimary: style, sessionType }, engineState)

  function commitStyle(next) { setStyle(next); setActiveStyle(next) }
  function add() {
    if (!grade) return
    onAdd({ grade, outcome, stylePrimary: style })
    setGrade(null)
    try { navigator.vibrate?.(12) } catch { /* no haptics */ }
  }

  return (
    <div className="space-y-3">
      <GradeScroller value={grade} onChange={setGrade} ariaLabel="Boulder grade" />
      <OutcomeSegmented value={outcome} onChange={setOutcome} />
      <StyleChipStrip value={style} onChange={commitStyle} />
      <button
        type="button"
        disabled={!grade}
        onClick={add}
        className={[
          'w-full py-3 rounded-2xl text-[14px] font-extrabold flex items-center justify-center gap-2 transition-colors',
          grade ? 'bg-clay text-cream' : 'bg-ink/10 text-ink-muted cursor-not-allowed',
        ].join(' ')}
      >
        {grade ? <>Add {grade}<span className="opacity-80 font-bold">+{xp} XP</span></> : 'Pick a grade'}
      </button>
    </div>
  )
}

// "Session details" expander (climb sessions). Tapping it both expands the
// fields inline and asks the host drawer to open to its full height.
function CollapsibleDetails({ form, set, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-ct-hairline bg-card/60 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left"
      >
        <span className="flex flex-col">
          <span className="ct-eyebrow">Session details</span>
          <span className="text-[12px] font-semibold text-ink-soft mt-0.5">
            {cap(form.session_type)} · {form.duration_min} min · RPE {form.intensity}
          </span>
        </span>
        <ChevronDown size={16} className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-4 pt-1">
              <SessionDetailsPanel form={form} set={set} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * The shared inner layout of the log experience — rendered by LogDrawer inside
 * either the mobile vaul sheet or the desktop modal. Owns all logging logic via
 * useSessionLog; the host only supplies open/close + prefill.
 *
 * Props:
 *   user, prefill, onClose      — forwarded to useSessionLog
 *   onRequestFullSnap?: () => void  — ask the host (mobile) to open to full height
 */
export default function LogDrawerContent({ user, prefill, onClose, onRequestFullSnap }) {
  const log = useSessionLog({ user, prefill, onClose })
  const [detailsOpen, setDetailsOpen] = useState(false)
  const climb = log.showClimbSection

  function toggleDetails() {
    setDetailsOpen((o) => {
      const next = !o
      if (next) onRequestFullSnap?.()
      return next
    })
  }

  const totalBreakdown = log.sessionTotal.count > 0
    ? `${log.sessionTotal.count} climb${log.sessionTotal.count === 1 ? '' : 's'}`
    : (climb ? 'No climbs yet' : 'Ready to save')

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <SessionSummaryOverlay
        open={log.summaryOpen}
        onClose={log.closeSummary}
        events={log.summary.events}
        totalXP={log.summary.totalXP}
      />

      {/* Header */}
      <div className="px-4 pb-2 flex items-start justify-between gap-3 shrink-0">
        <div>
          <p className="ct-eyebrow" style={{ color: '#b06a4f' }}>{climb ? 'Log a climb' : 'Log session'}</p>
          <h3 className="font-serif text-[19px] font-semibold -tracking-[0.02em] text-ink mt-0.5">
            {cap(log.form.session_type)} session
          </h3>
        </div>
        {climb && <ModeToggle bulk={log.bulkMode} onChange={log.setBulkMode} />}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-4">
        {climb && !log.bulkMode && (
          <LogHero sessionType={log.form.session_type} engineState={log.engineState} onAdd={log.addSend} />
        )}
        {climb && log.bulkMode && (
          <ClimbLogSection
            value={log.form.climbs}
            onChange={(next) => log.set('climbs', next)}
            defaultTab={log.form.session_type === 'routes' ? 'route' : 'boulder'}
          />
        )}
        {climb && <PendingSendsList sends={log.quickSends} onRemove={log.removeSend} />}
        {climb ? (
          <CollapsibleDetails form={log.form} set={log.set} open={detailsOpen} onToggle={toggleDetails} />
        ) : (
          <SessionDetailsPanel form={log.form} set={log.set} />
        )}
        <div className="h-1" />
      </div>

      {/* Pinned footer: live session total + Save */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-3
                      pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                      bg-card/95 backdrop-blur-md border-t border-ct-rim">
        <div className="flex-1 min-w-0">
          <RewardPreview xp={log.sessionTotal.xp} breakdown={totalBreakdown} label="Session total" />
        </div>
        <button
          type="button"
          disabled={!log.canSave || log.saving}
          onClick={log.save}
          className={[
            'shrink-0 px-5 py-3.5 rounded-2xl font-extrabold text-[13px] -tracking-[0.01em] transition-colors',
            log.canSave && !log.saving ? 'bg-clay text-cream' : 'bg-ink/10 text-ink-muted cursor-not-allowed',
          ].join(' ')}
        >
          {log.saving ? 'Saving…' : 'Save session'}
        </button>
      </div>

      {log.pending && (
        <PlausibilityConfirmModal
          level={log.pending.level}
          newGrade={log.pending.newGrade}
          hardestGrade={log.pending.hardestGrade}
          tierDiff={log.pending.tierDiff}
          onConfirm={log.confirmPending}
          onEdit={log.dismissPending}
        />
      )}
    </div>
  )
}
