import { useMemo } from 'react'
import { TIER_NAMES, TIER_TOKENS, workingTierFromHardest } from '../lib/tier'

/**
 * Resolves the user's working tier + its color tokens.
 *
 * @param hardest  { boulder: string|null, route: string|null }
 *                 from useHubData / direct API. If undefined, defaults to v0.
 * @returns { tierId, tierName, tokens: { c, light, deep, glow } }
 */
export function useTierTheme(hardest) {
  return useMemo(() => {
    const tierId = workingTierFromHardest(hardest || {})
    const t = TIER_TOKENS[tierId]
    return {
      tierId,
      tierName: TIER_NAMES[tierId],
      tokens: {
        c: t.c,
        light: t.light,
        deep: t.deep,
        glow: `${t.c}38`,  // ~22% alpha (38 hex = 56/255 ≈ 22%)
      },
    }
  }, [hardest?.boulder, hardest?.route])
}
