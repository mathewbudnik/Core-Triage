import { MapPin } from 'lucide-react'

/**
 * Timeline ribbon — colored markers per finding instance, plus a
 * distinct icon for the user-marked fall (if any). Tap a marker to
 * jump the video to that frame.
 *
 * Per the locked report spec (feature-spec.md §4):
 *   • Severity color codes match the finding cards (red / terracotta /
 *     cream — implemented via lucide circle, not emoji).
 *   • Fall moment gets a distinct icon (MapPin), positioned on top of
 *     the lane so it reads as a separate annotation.
 *   • Markers within ~2% of each other visually overlap — that's fine,
 *     the eye reads "cluster" which is the right interpretation.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │ TIMELINE                       0:00–0:30 │
 *   │ ━━●━━━━━━●●━━━━━━━●━━━━━┃━━━━●━━━━━━━━━ │
 *   │                          fall            │
 *   └──────────────────────────────────────────┘
 */

const SEVERITY_DOT = {
  critical:  'bg-red-400 border-red-200',
  important: 'bg-ct-terracotta border-ct-terra-soft',
  polish:    'bg-ct-cream border-ct-cream/30',
}

const SEVERITY_RANK = { critical: 3, important: 2, polish: 1 }

/**
 * @param {Object} props
 * @param {Array} props.findings — output from runRules()
 * @param {number} props.durationS — clip duration in seconds
 * @param {number|null} props.fallTimeMs — user-marked fall position (or null)
 * @param {(ms: number) => void} props.onJumpTo
 */
export default function TimelineRibbon({ findings, durationS, fallTimeMs, onJumpTo }) {
  if (!durationS || durationS <= 0) return null
  const durationMs = durationS * 1000

  // Flatten all instances into markers. If two findings share an exact
  // timestamp (rare but possible), keep the higher-severity one on top.
  // Wins are excluded — they live in the "What worked" section so the
  // timeline stays focused on flags + the fall annotation.
  const markers = []
  for (const finding of findings ?? []) {
    if (finding.kind === 'win') continue
    for (const ts of finding.timestamps ?? []) {
      markers.push({
        ts,
        severity: finding.severity,
        rank: SEVERITY_RANK[finding.severity] ?? 0,
        name: finding.name,
        ruleId: finding.ruleId,
      })
    }
  }
  markers.sort((a, b) => a.rank - b.rank)  // higher-rank renders last (on top)

  if (markers.length === 0 && fallTimeMs == null) return null

  return (
    <div className="rounded-xl bg-ct-forest-deep border border-ct-hairline px-3 py-2.5">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-ct-cream/45 mb-2">
        <span>Timeline</span>
        <span className="ct-tnum text-ct-cream/35 normal-case tracking-normal">
          {formatTime(0)} – {formatTime(durationMs)}
        </span>
      </div>

      {/* Lane */}
      <div className="relative h-6 bg-ct-hairline rounded-full">
        {/* Fall marker (drawn first so finding markers sit on top of it
            visually for accessibility — tap targets get priority) */}
        {fallTimeMs != null && fallTimeMs >= 0 && fallTimeMs <= durationMs && (
          <FallMarker
            leftPct={(fallTimeMs / durationMs) * 100}
            ts={fallTimeMs}
            onJumpTo={onJumpTo}
          />
        )}

        {/* Finding markers */}
        {markers.map((m, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJumpTo(m.ts)}
            title={`${m.name} · ${formatTime(m.ts)}`}
            aria-label={`${m.name} at ${formatTime(m.ts)} — jump`}
            className={`absolute top-1/2 w-3 h-3 rounded-full border ${SEVERITY_DOT[m.severity]} cursor-pointer hover:scale-125 transition-transform`}
            style={{
              left: `${(m.ts / durationMs) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function FallMarker({ leftPct, ts, onJumpTo }) {
  return (
    <button
      type="button"
      onClick={() => onJumpTo(ts)}
      title={`Fall at ${formatTime(ts)} — jump`}
      aria-label={`Fall at ${formatTime(ts)} — jump`}
      className="absolute top-0 bottom-0 flex flex-col items-center cursor-pointer group"
      style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
    >
      {/* Vertical guideline */}
      <span className="absolute inset-y-0 left-1/2 w-px bg-red-400/70 -translate-x-1/2" aria-hidden />
      {/* Icon at top of lane */}
      <span className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-ct-cream group-hover:scale-125 transition-transform">
        <MapPin size={9} strokeWidth={2.5} />
      </span>
    </button>
  )
}

function formatTime(ms) {
  const total = ms / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}
