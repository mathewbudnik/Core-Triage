/**
 * Plain-language identity derived from the pentagon axes.
 *
 * Replaces the old proper-noun archetypes ("Crimper", "Slabber", "Dynamo")
 * with a legible sentence the way the approved field-card mockup reads:
 *   title: "Powerful & crimp-strong."
 *   gap:   "Technique is your gap."
 *
 * Pure — no React, no side effects. Accepts both the canonical axis keys
 * (crimp / technique) and the legacy keys (crimpy / technical) that the
 * /api/me/state payload still sends, so it works at every call site.
 *
 * @param {object|null} axes - { power, crimp|crimpy, dynamic, technique|technical, mobility } 0-10
 * @returns {{ title: string, gap: string|null }}
 */

// Canonical axis -> the adjective used when this axis is a strength.
const STRONG = {
  power: 'Powerful',
  crimp: 'Crimp-strong',
  dynamic: 'Explosive',
  technique: 'Technical',
  mobility: 'Mobile',
}

// Canonical axis -> the plain noun used when this axis is the gap.
const GAP_NOUN = {
  power: 'Power',
  crimp: 'Crimp strength',
  dynamic: 'Explosiveness',
  technique: 'Technique',
  mobility: 'Mobility',
}

const CANONICAL = ['power', 'crimp', 'dynamic', 'technique', 'mobility']
const ALIASES = { crimpy: 'crimp', technical: 'technique' }

// Normalize any incoming shape into canonical numeric axes (missing -> null).
function normalize(raw) {
  const out = { power: null, crimp: null, dynamic: null, technique: null, mobility: null }
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    const key = ALIASES[k] ?? k
    if (key in out) out[key] = typeof v === 'number' ? v : null
  }
  return out
}

// Lowercase the strength adjective when it's the second clause
// ("Powerful & crimp-strong"). Leaves the leading one capitalized.
function lower(adj) {
  return adj.charAt(0).toLowerCase() + adj.slice(1)
}

export function identityPhrase(axes) {
  const v = normalize(axes)
  const present = CANONICAL.filter((a) => typeof v[a] === 'number')

  // No data → onboarding nudge.
  if (present.length === 0 || present.every((a) => v[a] === 0)) {
    return { title: 'New climber, log a few sends', gap: null }
  }

  // Strongest first, then second strongest. Stable on the canonical order
  // so ties resolve deterministically (power > crimp > dynamic > …).
  const ranked = [...present].sort((a, b) => v[b] - v[a])
  const strongest = ranked[0]
  const second = ranked[1]

  let title
  if (second && v[second] >= v[strongest] - 2 && v[second] > 0) {
    // Two close strengths read as a pairing: "Powerful & crimp-strong"
    title = `${STRONG[strongest]} & ${lower(STRONG[second])}`
  } else {
    title = STRONG[strongest]
  }

  // Gap = weakest present axis, named as a plain sentence. Only call it a
  // gap when it's actually a relative weakness (below the strongest).
  const weakest = ranked[ranked.length - 1]
  const gap =
    weakest !== strongest && v[weakest] < v[strongest]
      ? `${GAP_NOUN[weakest]} is your gap`
      : null

  return { title, gap }
}
