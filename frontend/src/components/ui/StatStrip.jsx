/**
 * 5-cell horizontal stat strip. Compact alternative to StatRadar for narrow surfaces.
 *
 * Props:
 *   stats: { power, crimpy, dynamic, technical, mobility } — values 0-10
 *   className: extra classes
 */
import { formatGrade } from '../../lib/gradeUtil'
import { skillColor } from '../../lib/skills'

// Legacy stat keys still accepted on the `stats` prop, paired with the
// canonical skill key that drives the label color (see lib/skills.js).
const AXES = [
  { key: 'power',     skill: 'power',     label: 'POWER' },
  { key: 'crimpy',    skill: 'crimp',     label: 'CRIMPY' },
  { key: 'dynamic',   skill: 'dynamic',   label: 'DYNAMIC' },
  { key: 'technical', skill: 'technique', label: 'TECHNICAL' },
  { key: 'mobility',  skill: 'mobility',  label: 'MOBILITY' },
]

export default function StatStrip({ stats, className = '' }) {
  return (
    <div className={['flex gap-1.5', className].filter(Boolean).join(' ')}>
      {AXES.map(({ key, skill, label }) => (
        <div key={key} className="flex-1 text-center">
          <p className="ct-stat-num text-[16px] leading-none">{formatGrade(stats[key])}</p>
          <p className="text-[8px] tracking-[0.08em] uppercase font-bold mt-1"
             style={{ color: skillColor(skill) }}>{label}</p>
        </div>
      ))}
    </div>
  )
}
