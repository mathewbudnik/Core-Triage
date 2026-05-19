import { useState } from 'react'
import { Check, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { deleteSession } from '../api'
import { forgetLastTriageSessionId } from '../lib/lastTriage'

/**
 * Slim confirmation banner shown on the Recover diagnosis screen letting the
 * user know their session was saved to History — with an Undo affordance for
 * the user who didn't actually want to keep this triage on their record.
 *
 * Auto-save still runs silently in TriageTab on submit; this is the explicit
 * "we saved it; here's how to take it back" transparency layer.
 *
 * Props:
 *   - sessionId: the DB row id returned from POST /api/sessions. Required —
 *     banner renders nothing if absent (anonymous users / failed save).
 */
export default function SavedToHistoryBanner({ sessionId }) {
  // Local state machine:
  //   'saved'   — initial confirmation, Undo button live
  //   'undoing' — deleteSession request in flight
  //   'undone'  — deletion confirmed; banner shows "Removed from history"
  //   'error'   — deletion failed; banner shows error + retry
  //   'hidden'  — user dismissed
  const [state, setState] = useState(sessionId ? 'saved' : 'hidden')
  const [error, setError] = useState(null)

  if (!sessionId || state === 'hidden') return null

  async function handleUndo() {
    if (state !== 'saved') return
    setState('undoing')
    setError(null)
    try {
      await deleteSession(sessionId)
      forgetLastTriageSessionId()
      setState('undone')
    } catch (err) {
      setError(err?.message || 'Could not remove from history.')
      setState('error')
    }
  }

  const tone =
    state === 'error' ? 'rose' :
    state === 'undone' ? 'muted' :
                         'teal'
  const styles = {
    teal:  { border: 'rgba(125,211,192,0.30)', bg: 'rgba(125,211,192,0.08)', icon: '#7dd3c0' },
    muted: { border: 'rgba(138,147,166,0.30)', bg: 'rgba(138,147,166,0.08)', icon: '#8a93a6' },
    rose:  { border: 'rgba(244,114,114,0.35)', bg: 'rgba(244,114,114,0.08)', icon: '#f47272' },
  }[tone]

  return (
    <div
      className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-xs"
      style={{ borderColor: styles.border, background: styles.bg }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {state === 'undoing' ? (
          <Loader2 size={13} className="animate-spin shrink-0" style={{ color: styles.icon }} />
        ) : state === 'error' ? (
          <XCircle size={13} className="shrink-0" style={{ color: styles.icon }} />
        ) : (
          <Check size={13} className="shrink-0" style={{ color: styles.icon }} strokeWidth={2.6} />
        )}
        <span className="truncate text-text/90">
          {state === 'saved'   && 'Saved to your history.'}
          {state === 'undoing' && 'Removing from history…'}
          {state === 'undone'  && 'Removed from history.'}
          {state === 'error'   && (error || 'Could not remove from history.')}
        </span>
      </div>

      {state === 'saved' && (
        <button
          type="button"
          onClick={handleUndo}
          className="flex items-center gap-1 text-[11px] font-bold whitespace-nowrap text-text/85 hover:text-text px-2 py-0.5 rounded"
        >
          <RotateCcw size={10} strokeWidth={2.4} />
          Undo
        </button>
      )}
      {state === 'error' && (
        <button
          type="button"
          onClick={handleUndo}
          className="text-[11px] font-bold whitespace-nowrap text-accent2 hover:text-text"
        >
          Try again
        </button>
      )}
      {(state === 'undone') && (
        <button
          type="button"
          onClick={() => setState('hidden')}
          className="text-[11px] font-bold whitespace-nowrap text-muted hover:text-text"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
