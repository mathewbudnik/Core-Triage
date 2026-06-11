import { skillColor, skillLabel } from '../../lib/skills'
export default function SkillTag({ skill, children, className = '' }) {
  const c = skillColor(skill)
  return <span className={`inline-block font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded ${className}`}
    style={{ color: c, background: `color-mix(in srgb, ${c} 18%, transparent)` }}>{children ?? skillLabel(skill)}</span>
}
