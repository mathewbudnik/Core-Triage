/**
 * 8-week sparkline. Renders the user's hours/week as a filled line, with
 * the cohort's peer-average as a dashed gray line for comparison. No
 * x-axis labels — the shape is the information.
 *
 * Props:
 *   - trend: Array<{ week_start: string, hours: number, peer_avg_hours: number }>
 *            Exactly 8 entries, oldest first.
 */
export default function TrainTrendChart({ trend }) {
  if (!trend || trend.length === 0) return null

  const W = 280
  const H = 64
  const PAD_Y = 6

  // Use the max of (user + peer) so both lines fit. Add a small floor so a
  // mostly-empty chart still draws something.
  const maxVal = Math.max(
    1,
    ...trend.map((d) => Math.max(d.hours || 0, d.peer_avg_hours || 0))
  )

  const xFor = (i) => (i / (trend.length - 1)) * W
  const yFor = (v) => H - PAD_Y - ((v / maxVal) * (H - PAD_Y * 2))

  const userPts = trend.map((d, i) => `${xFor(i)},${yFor(d.hours || 0)}`).join(' ')
  const peerPts = trend.map((d, i) => `${xFor(i)},${yFor(d.peer_avg_hours || 0)}`).join(' ')

  // Closed polygon for the area fill under the user line.
  const userArea =
    `0,${H} ` + userPts + ` ${W},${H}`

  const last = trend[trend.length - 1]
  const lastX = xFor(trend.length - 1)
  const lastY = yFor(last.hours || 0)

  return (
    <div className="bg-panel border border-outline rounded-xl px-3 pt-3 pb-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text/85">
          Last 8 weeks
        </span>
        <div className="flex items-center gap-3 text-[9px] text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-sm bg-accent" /> You
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-sm bg-muted/60" /> Peers avg
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <defs>
          <linearGradient id="tt-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"  stopColor="#7dd3c0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7dd3c0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Peer dashed line */}
        <polyline
          fill="none"
          stroke="#8a93a6"
          strokeWidth="1"
          strokeDasharray="4,3"
          opacity="0.6"
          points={peerPts}
        />
        {/* User area + line */}
        <polyline fill="url(#tt-grad)" stroke="none" points={userArea} />
        <polyline
          fill="none"
          stroke="#7dd3c0"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={userPts}
        />
        {/* Latest data point */}
        <circle cx={lastX} cy={lastY} r="3.5" fill="#7dd3c0" stroke="#0b1220" strokeWidth="2" />
      </svg>
    </div>
  )
}
