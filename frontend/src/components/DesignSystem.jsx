import { TRANSITIONS, DURATIONS, EASE } from '../lib/motion'

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
        <p className="ct-body-soft">Pending Task 5.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Eyebrow</h2>
        <p className="ct-body-soft">Pending Task 6.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">TierBadge</h2>
        <p className="ct-body-soft">Pending Task 7.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">LevelMeter</h2>
        <p className="ct-body-soft">Pending Task 8.</p>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StreakEmblem</h2>
        <p className="ct-body-soft">Pending Task 9.</p>
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
