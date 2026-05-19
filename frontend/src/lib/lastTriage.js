// Persists the most recently submitted triage diagnosis to sessionStorage so
// refreshing /body (or returning to it later in the same tab session) keeps
// the diagnosis visible. Lives client-side only — signed-in users get this
// as a UX nicety on top of their DB-backed session; signed-out users rely
// on it entirely.
//
// Storage is sessionStorage (not localStorage) so the diagnosis is naturally
// scoped to "this tab session" — closing the tab forgets it, which matches
// the user's mental model of a one-off screening tool.

const KEY = 'ct_last_triage_v1'

export function saveLastTriage({ result, form, sessionId = null }) {
  if (!result || !form?.region) return
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        result, form,
        // sessionId is the DB row id returned by POST /api/sessions —
        // null for anonymous users (no DB write). Lets the recover view
        // surface a "Saved to history. Undo?" affordance and back it
        // with a deleteSession call.
        sessionId,
        savedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // sessionStorage can throw under private-mode quotas; non-fatal
  }
}

export function readLastTriage() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v?.result || !v?.form?.region) return null
    return v
  } catch {
    return null
  }
}

// Wipe just the sessionId without dropping the cached diagnosis — used after
// the user hits Undo so the banner doesn't keep offering Undo on a row that's
// already been deleted.
export function forgetLastTriageSessionId() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return
    const v = JSON.parse(raw)
    if (!v) return
    sessionStorage.setItem(KEY, JSON.stringify({ ...v, sessionId: null }))
  } catch {}
}

export function clearLastTriage() {
  try { sessionStorage.removeItem(KEY) } catch {}
}
