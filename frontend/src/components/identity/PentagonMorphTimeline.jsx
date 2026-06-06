import Pentagon from './Pentagon'

function formatMonth(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()
}

function generateCaption(snapshots) {
  if (snapshots.length < 2) return null
  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]
  const months = snapshots.length
  const firstArch = first.archetype
  const lastArch = last.archetype

  // Find the most-changed axis
  const axisDeltas = ['power', 'crimpy', 'dynamic', 'technical', 'mobility'].map((k) => ({
    axis: k,
    delta: (last.axes[k] || 0) - (first.axes[k] || 0),
  }))
  const grew = axisDeltas.reduce((max, d) => (d.delta > max.delta ? d : max), axisDeltas[0])
  const shrank = axisDeltas.reduce((min, d) => (d.delta < min.delta ? d : min), axisDeltas[0])

  let arc = firstArch === lastArch ? lastArch : `${firstArch} → ${lastArch}`
  let detail = grew.delta > 0.5
    ? `Your ${grew.axis} axis grew ${grew.delta.toFixed(1)} points.`
    : ''
  let weak = shrank.delta < -0.5
    ? `${shrank.axis} cooled.`
    : (last.axes[shrank.axis] < 5
       ? `${shrank.axis.charAt(0).toUpperCase() + shrank.axis.slice(1)} stayed quiet — that's the next push.`
       : '')

  return `${months} months. ${arc}. ${detail} ${weak}`.replace(/\s+/g, ' ').trim()
}

export default function PentagonMorphTimeline({ snapshots = [], onCellClick }) {
  const cells = snapshots.slice(0, 6)
  const caption = generateCaption(cells)

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--ct-paper-mid)', border: '1px solid var(--ct-ink-quiet)' }}>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {cells.map((snap, i) => (
          <button
            key={snap.capturedAt}
            data-morph-cell
            data-now={snap.isNow || i === cells.length - 1 ? 'true' : 'false'}
            type="button"
            onClick={() => onCellClick && onCellClick(snap)}
            className="flex flex-col items-center text-center bg-transparent border-0 cursor-pointer"
          >
            <Pentagon axes={snap.axes} size={84} animate={i === cells.length - 1} />
            <span className="font-mono text-[10px] tracking-widest mt-1" style={{ color: 'var(--ct-ink-quiet)' }}>
              {formatMonth(snap.capturedAt)}
            </span>
            <span className="font-serif italic text-xs mt-1" style={{ color: 'var(--ct-ink-soft)' }}>
              {snap.archetype}
            </span>
          </button>
        ))}
      </div>
      {caption && (
        <p role="caption" className="font-serif italic text-center mt-4 pt-3" style={{ color: 'var(--ct-ink-soft)', borderTop: '1px dashed var(--ct-ink-quiet)' }}>
          {caption}
        </p>
      )}
    </div>
  )
}
