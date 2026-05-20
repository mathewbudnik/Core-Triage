/**
 * 5-cell horizontal stat strip. Compact alternative to StatRadar for narrow surfaces.
 *
 * Props:
 *   stats: { power, crimpy, dynamic, technical, mobility } — values 0-10
 *   className: extra classes
 */
const AXES = [
  { key: 'power',     label: 'POW' },
  { key: 'crimpy',    label: 'CRP' },
  { key: 'dynamic',   label: 'DYN' },
  { key: 'technical', label: 'TEC' },
  { key: 'mobility',  label: 'MOB' },
]

export default function StatStrip({ stats, className = '' }) {
  return (
    <div className={['flex gap-1.5', className].filter(Boolean).join(' ')}>
      {AXES.map(({ key, label }) => (
        <div key={key} className="flex-1 text-center">
          <p className="ct-stat-num text-[16px] leading-none">{stats[key] ?? 0}</p>
          <p className="text-[8px] tracking-[0.12em] uppercase text-ct-moss font-bold mt-1">{label}</p>
        </div>
      ))}
    </div>
  )
}
