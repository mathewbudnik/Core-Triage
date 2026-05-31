import { useCallback, useEffect, useRef, useState } from 'react'
import { Pin } from 'lucide-react'

/**
 * Frame-precise scrubber for marking the moment of a fall in the just-
 * uploaded clip. Re-uses the same <video> element that owns the Blob URL
 * (no second download) — we just toggle the element's visible parent and
 * drive its `currentTime` from a range input.
 *
 * Required for the Fell outcome on the upload-context form. Submitting
 * the form is blocked until `value != null`.
 *
 * Props:
 *   - videoRef: the shared video element ref (the one already mounted in
 *               MovementAnalyzer's "always-rendered" hidden container)
 *   - durationS: clip duration in seconds (from loadedmetadata)
 *   - value:    current fall-time in ms (null until marked)
 *   - onChange: (ms | null) => void
 */
export default function FallScrubber({ videoRef, durationS, minS = 0, maxS = null, value, onChange }) {
  const containerRef = useRef(null)
  const previewRef = useRef(null)   // small <video> we render here, separate from the main one
  // Effective bounds: caller can constrain to a sub-range (e.g. trim window).
  const lo = Math.max(0, minS)
  const hi = Math.min(durationS, maxS ?? durationS)
  const [scrubT, setScrubT] = useState(lo)   // current scrub position in seconds (decoupled from `value`)
  const [previewSrc, setPreviewSrc] = useState(null)

  // The parent's <video> element holds the Blob URL we want to mirror.
  // Read `src` on mount; if the src changes (replace flow), refresh.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (v.src) setPreviewSrc(v.src)
    const onLoad = () => v.src && setPreviewSrc(v.src)
    v.addEventListener('loadedmetadata', onLoad)
    return () => v.removeEventListener('loadedmetadata', onLoad)
  }, [videoRef])

  // Wire the range input → preview video's currentTime
  const setTime = useCallback((t) => {
    const clamped = Math.max(lo, Math.min(hi, t))
    setScrubT(clamped)
    const v = previewRef.current
    if (v) {
      try { v.currentTime = clamped } catch { /* may throw if not loaded yet */ }
    }
  }, [lo, hi])

  // When `value` arrives or changes externally (e.g. reset), sync the scrubber
  useEffect(() => {
    if (value != null) setTime(value / 1000)
  }, [value, setTime])

  const handleMark = () => onChange(Math.round(scrubT * 1000))
  const handleClear = () => onChange(null)

  if (!previewSrc) {
    return <div className="text-xs text-ct-cream/40">Loading clip preview…</div>
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      {/* Mini preview video — paused, scrubs via the slider */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-48">
        <video
          ref={previewRef}
          src={previewSrc}
          className="w-full h-full object-contain"
          muted
          playsInline
          preload="auto"
        />
        {value != null && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-ct-terracotta text-ct-cream text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            <Pin size={10} />
            Marked · {formatTime(value / 1000)}
          </div>
        )}
      </div>

      {/* Range slider — frame-precise (we use 0.05s steps for 30fps approx) */}
      <input
        type="range"
        min={lo}
        max={hi}
        step={1 / 30}
        value={scrubT}
        onChange={(e) => setTime(parseFloat(e.target.value))}
        aria-label="Scrub to fall frame"
        className="w-full accent-ct-terracotta"
      />

      {/* Time + actions */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-ct-cream/55 ct-tnum">
          {formatTime(scrubT)} / {formatTime(hi)}
        </span>
        <div className="flex items-center gap-2">
          {value != null && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-ct-cream/60 hover:text-ct-cream px-2 py-1 rounded transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleMark}
            className="flex items-center gap-1 text-[11px] font-bold bg-ct-terra-tint border border-ct-terracotta/40 text-ct-terra-soft hover:bg-[rgba(217,119,87,0.12)] px-2.5 py-1 rounded-md transition-colors"
          >
            <Pin size={11} />
            Mark this frame
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00.0'
  const m = Math.floor(seconds / 60)
  const s = seconds - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}
