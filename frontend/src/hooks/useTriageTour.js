import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'coretriage_tour_v1'

// Tour tips keyed by slug. The wizard renders different slugs depending on
// region (non-finger: 5 steps; finger: 8 steps with three drill-down screens
// inserted). Slug-based lookup keeps the right tip on the right screen.
const TIPS_BY_SLUG = {
  '':                { anchorId: 'region-diagram',  label: 'Where',         body: 'Tap where it hurts. You can change this anytime.' },
  'finger_which':    { anchorId: 'which-finger',     label: 'Finger',        body: 'Which finger? Helps narrow what got hurt.' },
  'finger_location': { anchorId: 'finger-location',  label: 'Location',      body: 'Where on the finger? Picks out pulley vs joint vs side.' },
  'grip_mode':       { anchorId: 'grip-mode',        label: 'Grip',          body: 'What grip? Crimp loads A2/A4 — pockets load lumbrical.' },
  'onset':           { anchorId: 'onset-row',        label: 'Onset',         body: 'Was it gradual or sudden? Then pick how it happened.' },
  'symptoms':        { anchorId: 'severity-slider', label: 'Pain',          body: "Slide to rate today's pain, then pick what it feels like." },
  'details':         { anchorId: 'symptoms-grid',    label: 'Symptoms',      body: 'Tick everything that applies — none is fine too.' },
  'finish':          { anchorId: 'free-text',        label: 'Notes',         body: 'Add anything else (climbs, holds, history). Optional.' },
}

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

export default function useTriageTour({ slug, totalSteps }) {
  const [seen, setSeen] = useState(() => readSeen())
  const [skipped, setSkipped] = useState(false)
  const [dismissed, setDismissed] = useState(() => new Set())
  const anchors = useRef(new Map())

  // Active = first-time user (not seen) AND not session-skipped
  const active = !seen && !skipped

  const tip = useMemo(() => {
    if (!active) return null
    if (dismissed.has(slug)) return null
    const t = TIPS_BY_SLUG[slug]
    if (!t) return null
    // We don't have a meaningful "tip index" anymore because the visible-tip
    // set depends on which flow the user is on. Surface the slug and the
    // current totalSteps so the Coachmark component can render a relative
    // position label if it wants.
    return { ...t, slug, total: totalSteps ?? 0 }
  }, [active, dismissed, slug, totalSteps])

  const dismiss = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(slug)
      return next
    })
  }, [slug])

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

  // Auto-mark-seen when the user reaches the final wizard step (the 'finish'
  // slug) for the first time while the tour is active.
  useEffect(() => {
    if (active && slug === 'finish') markSeen()
  }, [active, slug, markSeen])

  // Auto-dismiss the current tip on the first pointer interaction with the
  // step's anchor — so the coachmark never blocks the user from continuing.
  useEffect(() => {
    if (!tip) return
    const el = anchors.current.get(tip.anchorId)
    if (!el) return
    const handler = () => dismiss()
    el.addEventListener('pointerdown', handler, { capture: true, once: true })
    return () => el.removeEventListener('pointerdown', handler, { capture: true })
  }, [tip, dismiss])

  const anchor = useCallback((id) => (el) => {
    if (el) anchors.current.set(id, el)
    else anchors.current.delete(id)
  }, [])

  const getAnchor = useCallback((id) => anchors.current.get(id) ?? null, [])

  return { active, tip, dismiss, skip, replay, anchor, getAnchor }
}
