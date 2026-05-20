import { TRANSITIONS, DURATIONS, EASE } from '../lib/motion'
import Surface from './ui/Surface'
import Eyebrow from './ui/Eyebrow'
import TierBadge from './ui/TierBadge'
import LevelMeter from './ui/LevelMeter'
import StreakEmblem from './ui/StreakEmblem'

/**
 * Dev-only design system showcase. Mounted at /design-system (only in DEV builds).
 * Each Phase 0 primitive task adds its section below. Production builds tree-shake
 * the route via the import.meta.env.DEV gate in App.jsx.
 */
export default function DesignSystem() {
  return (
    <main className="min-h-screen bg-ct-forest text-ct-cream p-10">
      <header className="mb-12 flex items-baseline justify-between">
        <div>
          <p className="ct-eyebrow">RPG climber · design system</p>
          <h1 className="ct-display mt-2">Primitives</h1>
        </div>
        <p className="ct-meta">REF · DEV · 2026</p>
      </header>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Motion vocabulary</h2>
        <pre className="ct-body-soft bg-ct-forest-deep border border-ct-hairline rounded-lg p-5 overflow-x-auto">
{`DURATIONS = ${JSON.stringify(DURATIONS, null, 2)}

EASE = ${JSON.stringify(EASE, null, 2)}

TRANSITIONS keys: ${Object.keys(TRANSITIONS).join(', ')}`}
        </pre>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Surface</h2>
        <div className="grid grid-cols-3 gap-4">
          <Surface tier="flat" padding="lg">
            <p className="ct-eyebrow mb-2">Flat</p>
            <p className="ct-body-soft">Solid forest, hairline border, no gradient. Tertiary containers.</p>
          </Surface>
          <Surface tier="default" padding="lg">
            <p className="ct-eyebrow mb-2">Default</p>
            <p className="ct-body-soft">Forest gradient + hairline border. The standard surface.</p>
          </Surface>
          <Surface tier="hero" padding="lg">
            <p className="ct-eyebrow mb-2">Hero</p>
            <p className="ct-body-soft">Warmer gradient + terracotta-tinted border. For featured panels.</p>
          </Surface>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Eyebrow</h2>
        <Surface tier="default" padding="lg">
          <Eyebrow>This week · climbing</Eyebrow>
          <p className="ct-title mt-2">Plain eyebrow above a title.</p>
          <Eyebrow divider className="mt-6">With divider</Eyebrow>
          <p className="ct-body-soft mt-3">Body content under a divider eyebrow.</p>
        </Surface>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">TierBadge</h2>
        <Surface tier="default" padding="lg">
          <Eyebrow divider className="mb-4">Tier badges</Eyebrow>
          <div className="flex flex-wrap gap-3">
            <TierBadge name="FROST" color="#7dd3c0" />
            <TierBadge name="SLATEHOLD" color="#94a3b8" />
            <TierBadge name="EMBER" color="#d97757" />
            <TierBadge name="PHOENIX" color="#fbbf24" />
          </div>
        </Surface>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">LevelMeter</h2>
        <Surface tier="default" padding="lg" className="max-w-sm">
          <LevelMeter
            level={14}
            xpInLevel={620}
            xpForNext={1000}
            nextLabel="next: unlock new quest tier"
            animateOnMount
          />
        </Surface>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StreakEmblem</h2>
        <div className="max-w-sm space-y-3">
          <StreakEmblem days={21} best={28} />
          <StreakEmblem days={28} best={28} />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">RewardPreview</h2>
        <p className="ct-body-soft">Pending Task 10.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StatStrip</h2>
        <p className="ct-body-soft">Pending Task 11.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StatRadar</h2>
        <p className="ct-body-soft">Pending Task 12.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">QuestCard</h2>
        <p className="ct-body-soft">Pending Task 13.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">CelebrationOverlay</h2>
        <p className="ct-body-soft">Pending Task 14.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">TierThemeProvider</h2>
        <p className="ct-body-soft">Pending Task 15.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Reward engine</h2>
        <p className="ct-body-soft">Pending Tasks 17-19 (xp.js, stats.js, quests.js).</p>
      </section>
    </main>
  )
}
