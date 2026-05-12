import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'coretriage_tour_v1'

const TIPS = [
  { step: 0, anchorId: 'region-diagram', label: 'Step 1 of 5', body: 'Tap where it hurts. You can change this anytime.' },
  { step: 1, anchorId: 'onset-row',      label: 'Step 2 of 5', body: 'Was it gradual or sudden? Then pick how it happened.' },
  { step: 2, anchorId: 'severity-slider', label: 'Step 3 of 5', body: "Slide to rate today's pain, then pick what it feels like." },
  { step: 3, anchorId: 'symptoms-grid',  label: 'Step 4 of 5', body: 'Tick everything that applies — none is fine too.' },
  { step: 4, anchorId: 'free-text',      label: 'Step 5 of 5', body: 'Add anything else (climbs, holds, history). Optional.' },
]

function readSeen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const v = JSON.parse(raw)
    return !!v?.seen
  } catch {
    return false
  }
}

function writeSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ seen: true, completedAt: new Date().toISOString() }))
  } catch {}
}

function clearSeen() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export default function useTriageTour({ step }) {
  const [seen, setSeen] = useState(() => readSeen())
  const [skipped, setSkipped] = useState(false)
  const [dismissed, setDismissed] = useState(() => new Set())
  const anchors = useRef(new Map())

  // Active = first-time user (not seen) AND not session-skipped
  const active = !seen && !skipped

  const tip = useMemo(() => {
    if (!active) return null
    if (dismissed.has(step)) return null
    const t = TIPS.find((x) => x.step === step)
    if (!t) return null
    return { ...t, index: step, total: TIPS.length }
  }, [active, dismissed, step])

  const dismiss = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(step)
      return next
    })
  }, [step])

  const skip = useCallback(() => setSkipped(true), [])

  const markSeen = useCallback(() => {
    writeSeen()
    setSeen(true)
  }, [])

  const replay = useCallback(() => {
    clearSeen()
    setSeen(false)
    setSkipped(false)
    setDismissed(new Set())
  }, [])

  // Auto-mark-seen the first time the user reaches the final step while
  // the tour is active — so completing the wizard naturally completes the tour.
  useEffect(() => {
    if (active && step === TIPS.length - 1) markSeen()
  }, [active, step, markSeen])

  // Auto-dismiss the current tip the first time the user interacts with the
  // step's content. Lets them act on the hint without having to dismiss it
  // manually, so the coachmark never sits between the user and the next tap.
  useEffect(() => {
    if (!tip) return
    const el = anchors.current.get(tip.anchorId)
    if (!el) return
    const handler = () => dismiss()
    el.addEventListener('pointerdown', handler, { capture: true, once: true })
    return () => el.removeEventListener('pointerdown', handler, { capture: true })
  }, [tip, dismiss])

  // Returns a callback ref that stashes the element under the given anchorId
  const anchor = useCallback((id) => (el) => {
    if (el) anchors.current.set(id, el)
    else anchors.current.delete(id)
  }, [])

  const getAnchor = useCallback((id) => anchors.current.get(id) ?? null, [])

  return { active, tip, dismiss, skip, replay, anchor, getAnchor }
}
