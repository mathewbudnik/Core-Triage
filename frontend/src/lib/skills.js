// src/lib/skills.js — single source of truth for the 5 climbing skills + colors
export const SKILLS = {
  power:     { key:'power',     label:'Power',     color:'#b85c44' },
  crimp:     { key:'crimp',     label:'Crimp',     color:'#c79a3c' },
  dynamic:   { key:'dynamic',   label:'Dynamic',   color:'#5f87a0' },
  technique: { key:'technique', label:'Technique', color:'#7f9466' },
  mobility:  { key:'mobility',  label:'Mobility',  color:'#a06f8a' },
}
export const SKILL_KEYS = ['power','crimp','dynamic','technique','mobility']
const INK = '#2a2722'
export function skillColor(key) { return SKILLS[String(key||'').toLowerCase()]?.color ?? INK }
export function skillLabel(key) { return SKILLS[String(key||'').toLowerCase()]?.label ?? '' }
