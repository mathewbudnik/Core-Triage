// Directional movement score rolled up from the analyzer's findings. It is an
// adherence-of-technique signal derived from ~29 heuristic geometric rules — NOT
// a graded/learned score — so the UI must always label it "directional".

export const SEVERITY_WEIGHT = { critical: 18, important: 10, polish: 4 }

/**
 * Roll findings up into { overall, perRegion }. Each region starts at 100 and
 * loses a penalty per FLAG finding in that region:
 *   penalty = weight(severity) * log2(instanceCount + 1) * confidence * (fallProximal ? 1.5 : 1)
 * Regions clamp to [0,100]; overall is the mean of regions that have findings
 * (100 when there are none). Wins do not subtract.
 *
 * @param {Array} findings
 * @returns {{ overall: number, perRegion: Record<string, number> }}
 */
export function scoreClip(findings) {
  const flags = (findings ?? []).filter((f) => f.kind !== 'win')
  const perRegion = {}
  for (const f of flags) {
    const region = f.bodyRegion || 'other'
    const weight = SEVERITY_WEIGHT[f.severity] ?? SEVERITY_WEIGHT.polish
    const instances = f.instanceCount ?? (f.timestamps?.length ?? 1)
    const confidence = typeof f.confidence === 'number' ? f.confidence : 1
    const fallMult = f.isFallProximal ? 1.5 : 1
    const penalty = weight * Math.log2(instances + 1) * confidence * fallMult
    perRegion[region] = (perRegion[region] ?? 100) - penalty
  }
  for (const k of Object.keys(perRegion)) {
    perRegion[k] = Math.max(0, Math.min(100, Math.round(perRegion[k])))
  }
  const vals = Object.values(perRegion)
  const overall = vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 100
  return { overall, perRegion }
}
