import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mountain } from 'lucide-react'
import AwardMedal from './AwardMedal'
import { TIER_NAMES, TIER_TOKENS } from '../lib/tier'

/**
 * Full-screen takeover when working tier advances.
 *
 * Props:
 *   from:    tier id (previous)
 *   to:      tier id (new)
 *   onClose: () => void
 */
export default function TierPromotionTakeover({ from, to, onClose }) {
  const t = TIER_TOKENS[to]
  const name = TIER_NAMES[to]

  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      role="button"
      onClick={onClose}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center cursor-pointer"
      style={{
        background: `
          radial-gradient(circle at 50% 30%, ${t.c}88 0%, transparent 60%),
          linear-gradient(180deg, ${t.deep}cc 0%, #050509 100%)
        `,
      }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
                  className="mb-7">
        <AwardMedal size="lg" light={t.light} mid={t.c} deep={t.deep}
                    icon={Mountain} label={to === 'v10' ? 'V10+' : to.toUpperCase()} />
      </motion.div>
      <div className="text-center max-w-[280px] px-6 relative z-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-1.5">
          New working tier
        </div>
        <div className="text-[30px] font-bold -tracking-[0.025em] text-white mb-2"
             style={{ textShadow: `0 0 22px ${t.c}99` }}>
          {name}
        </div>
        <div className="text-sm text-white/80 leading-snug mb-7">
          You climbed clean into {name}. Keep moving.
        </div>
        <div className="text-[11px] tracking-[0.05em] text-white/60">
          Tap to continue
        </div>
      </div>
    </motion.div>
  )
}
