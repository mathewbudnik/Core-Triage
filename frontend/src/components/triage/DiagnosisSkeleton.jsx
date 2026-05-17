/**
 * Shimmering placeholder shown between submit and the API response (typically
 * 1–3s). Shape mirrors the real TriageDiagnosis hero so the transition into
 * real content feels continuous, not a jump.
 *
 * The shimmer animation lives in `index.css` (@keyframes shimmer) and is
 * automatically disabled by `prefers-reduced-motion`.
 */
function ShimmerBar({ className = '' }) {
  return (
    <div
      className={`rounded-lg bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.10)_50%,rgba(255,255,255,0.04)_100%)]
                  bg-[length:200%_100%] animate-ct-shimmer ${className}`}
    />
  )
}

export default function DiagnosisSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your guidance"
      className="space-y-3"
    >
      {/* Hero card placeholder — matches TriageDiagnosis's ResultsHero shape */}
      <div className="rounded-2xl border border-outline bg-panel2/40 p-4 sm:p-5 space-y-3">
        {/* Pill row */}
        <div className="flex gap-1.5">
          <ShimmerBar className="h-4 w-16" />
          <ShimmerBar className="h-4 w-14" />
        </div>
        {/* Title */}
        <ShimmerBar className="h-5 w-3/4" />
        {/* Lead */}
        <div className="space-y-1.5">
          <ShimmerBar className="h-3 w-full" />
          <ShimmerBar className="h-3 w-5/6" />
        </div>
        {/* Action chips grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2">
          <ShimmerBar className="h-7" />
          <ShimmerBar className="h-7" />
          <ShimmerBar className="h-7" />
          <ShimmerBar className="h-7" />
        </div>
      </div>

      {/* Action plan placeholder */}
      <div className="rounded-2xl border border-outline bg-panel2/40 p-4 sm:p-5 space-y-3">
        <ShimmerBar className="h-3 w-24" />
        <div className="space-y-2">
          <ShimmerBar className="h-3 w-full" />
          <ShimmerBar className="h-3 w-4/5" />
          <ShimmerBar className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  )
}
