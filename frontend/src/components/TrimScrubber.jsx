import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Scissors } from 'lucide-react'

/**
 * Dual-handle trim selector. Lets the user pick a [startMs, endMs] window
 * from the just-uploaded clip. The processing pipeline then only samples
 * frames inside that window.
 *
 * The selection length is clamped to <= maxWindowS. If the user drags one
 * handle past that distance, the other handle follows so the window stays
 * within the cap.
 *
 * Props:
 *   - videoRef:     shared video ref (already pointed at the Blob URL)
 *   - durationS:    full clip duration in seconds
 *   - startMs:      current start (controlled)
 *   - endMs:        current end (controlled)
 *   - maxWindowS:   max length of the selected window in seconds
 *   - onChange:     ({ startMs, endMs }) => void
 */
export default function TrimScrubber({
  videoRef,
  durationS,
  startMs,
  endMs,
  maxWindowS,
  onChange,
}) {
  const previewRef = useRef(null)
  const [previewSrc, setPreviewSrc] = useState(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (v.src) setPreviewSrc(v.src)
    const onLoad = () => v.src && setPreviewSrc(v.src)
    v.addEventListener('loadedmetadata', onLoad)
    return () => v.removeEventListener('loadedmetadata', onLoad)
  }, [videoRef])

  // Drive the preview's currentTime to whichever handle is being dragged
  // so the user sees the in/out frame they're picking.
  const seekPreview = useCallback((seconds) => {
    const v = previewRef.current
    if (!v) return
    try { v.currentTime = Math.max(0, Math.min(durationS, seconds)) } catch {}
  }, [durationS])

  const startS = startMs / 1000
  const endS = endMs / 1000
  const windowS = endS - startS
  const overCap = windowS > maxWindowS + 0.05

  const updateStart = (nextStartS) => {
    let s = Math.max(0, Math.min(durationS, nextStartS))
    let e = endS
    // Push the end forward if the window would exceed the cap
    if (e - s > maxWindowS) e = Math.min(durationS, s + maxWindowS)
    // Don't allow start to cross end
    if (s > e - 0.1) s = Math.max(0, e - 0.1)
    onChange({ startMs: Math.round(s * 1000), endMs: Math.round(e * 1000) })
    seekPreview(s)
  }

  const updateEnd = (nextEndS) => {
    let e = Math.max(0, Math.min(durationS, nextEndS))
    let s = startS
    if (e - s > maxWindowS) s = Math.max(0, e - maxWindowS)
    if (e < s + 0.1) e = Math.min(durationS, s + 0.1)
    onChange({ startMs: Math.round(s * 1000), endMs: Math.round(e * 1000) })
    seekPreview(e)
  }

  // Show the start frame initially in the preview
  useEffect(() => {
    if (previewSrc) seekPreview(startS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSrc])

  // CSS percentages for the highlighted band on the track
  const leftPct = useMemo(() => (durationS > 0 ? (startS / durationS) * 100 : 0), [startS, durationS])
  const rightPct = useMemo(() => (durationS > 0 ? (endS / durationS) * 100 : 100), [endS, durationS])

  if (!previewSrc) {
    return <div className="text-xs text-ink-muted">Loading clip preview…</div>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-48">
        <video
          ref={previewRef}
          src={previewSrc}
          className="w-full h-full object-contain"
          muted
          playsInline
          preload="auto"
        />
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-clay/10 border border-clay/40 text-clay-deep text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            <Scissors size={10} />
            {windowS.toFixed(1)}s selected
          </div>
          {overCap && (
            <div className="bg-clay text-cream text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
              Max {maxWindowS}s
            </div>
          )}
        </div>
      </div>

      {/* Dual-handle: two stacked range inputs over a highlighted band. */}
      <div className="relative h-8">
        {/* Track background */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-ink/[0.10] pointer-events-none" />
        {/* Selected band */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-clay pointer-events-none"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={durationS}
          step={1 / 30}
          value={startS}
          onChange={(e) => updateStart(parseFloat(e.target.value))}
          aria-label="Trim start"
          style={trimRangeStyle}
          className="ct-trim-range accent-clay"
        />
        <input
          type="range"
          min={0}
          max={durationS}
          step={1 / 30}
          value={endS}
          onChange={(e) => updateEnd(parseFloat(e.target.value))}
          aria-label="Trim end"
          style={trimRangeStyle}
          className="ct-trim-range accent-clay"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-ink-soft ct-tnum">
        <span>Start {formatTime(startS)}</span>
        <span>{windowS.toFixed(1)}s · max {maxWindowS}s</span>
        <span>End {formatTime(endS)}</span>
      </div>
    </div>
  )
}

const trimRangeStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  background: 'transparent',
  WebkitAppearance: 'none',
  appearance: 'none',
  pointerEvents: 'auto',
  outline: 'none',
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00.0'
  const m = Math.floor(seconds / 60)
  const s = seconds - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}
