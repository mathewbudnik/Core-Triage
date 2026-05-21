import { useState } from 'react'
import { TRANSITIONS, DURATIONS, EASE } from '../lib/motion'
import { calculateSendXP, levelFromTotalXP } from '../lib/xp'
import { STYLE_CHIP_TO_STATS, deriveStatShape, AXES } from '../lib/stats'
import { generateDailyQuest } from '../lib/quests'
import { useRewardEngine } from '../lib/rewardEngine'
import CelebrationOverlay from './ui/CelebrationOverlay'
import Surface from './ui/Surface'
import Eyebrow from './ui/Eyebrow'
import TierBadge from './ui/TierBadge'
import LevelMeter from './ui/LevelMeter'
import StreakEmblem from './ui/StreakEmblem'
import RewardPreview from './ui/RewardPreview'
import StatStrip from './ui/StatStrip'
import StatRadar from './ui/StatRadar'
import QuestCard from './ui/QuestCard'
import { TierThemeProvider, useTierTheme } from './ui/TierThemeProvider'

function EngineLiveDemo() {
  const { state, logSend, reset } = useRewardEngine()
  const handleSend = () => {
    logSend({
      grade: 'V6', modality: 'indoor', outcome: 'flash',
      stylePrimary: 'crimpy', isDeepLog: false, ts: Date.now(),
    })
  }
  return (
    <div className="mt-4 space-y-2 text-sm">
      <p className="ct-body-soft">
        Total XP: <strong className="text-ct-terra-soft">{state.totalXP}</strong>
        {' · '}Streak: <strong className="text-ct-terra-soft">{state.streak.days} days</strong>
        {' · '}Sends: <strong className="text-ct-terra-soft">{state.sends.length}</strong>
      </p>
      <p className="ct-body-soft">
        Crimpy best: <strong className="text-ct-terra-soft">
          {state.bestPerStyle.crimpy === null ? '—' : `V${state.bestPerStyle.crimpy}`}
        </strong>
      </p>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={handleSend}
          className="px-3 py-1.5 rounded-md bg-ct-terracotta text-ct-forest text-xs font-bold">
          Log V6 crimpy flash
        </button>
        <button type="button" onClick={reset}
          className="px-3 py-1.5 rounded-md border border-ct-hairline text-ct-cream text-xs font-bold">
          Reset engine
        </button>
      </div>
    </div>
  )
}

function ThemeDemoBody() {
  const { themeKey, theme, setThemeKey } = useTierTheme()
  return (
    <>
      <p className="ct-body-soft">
        Active theme: <span className="font-bold text-ct-terra-soft">{theme.name}</span> ({themeKey})
      </p>
      <p className="ct-meta mt-2">
        Phase 0 ships only Ember. Phase 5 unlocks Frost / Slatehold / Phoenix.
        Theme persistence is wired (localStorage key <code>ct_theme</code>).
      </p>
      <button
        type="button"
        onClick={() => setThemeKey('ember')}
        className="mt-3 px-4 py-2 rounded-md bg-ct-terracotta text-ct-forest text-sm font-bold"
      >
        Set Ember
      </button>
    </>
  )
}

/**
 * Dev-only design system showcase. Mounted at /design-system (only in DEV builds).
 * Each Phase 0 primitive task adds its section below. Production builds tree-shake
 * the route via the import.meta.env.DEV gate in App.jsx.
 */
export default function DesignSystem() {
  const [celebrate, setCelebrate] = useState(false)
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
        <div className="max-w-sm space-y-3">
          <RewardPreview xp={180} breakdown="V6 × flash × indoor" />
          <RewardPreview xp={225} breakdown="V6 × flash × indoor × deep" />
          <RewardPreview xp={50} breakdown="Quest reward" label="QUEST CLEAR" />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StatStrip</h2>
        <div className="grid grid-cols-2 gap-4">
          <Surface tier="default" padding="lg">
            <Eyebrow divider className="mb-3">Sample stats</Eyebrow>
            <StatStrip stats={{ power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 }} />
          </Surface>
          <Surface tier="default" padding="lg">
            <Eyebrow divider className="mb-3">Brand new — no sends yet</Eyebrow>
            <StatStrip stats={{ power: null, crimpy: null, dynamic: null, technical: null, mobility: null }} />
          </Surface>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">StatRadar</h2>
        <div className="grid grid-cols-3 gap-4">
          <Surface tier="default" padding="lg">
            <Eyebrow divider className="mb-3">Asymmetric</Eyebrow>
            <StatRadar stats={{ power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 }} size={130} />
          </Surface>
          <Surface tier="default" padding="lg">
            <Eyebrow divider className="mb-3">Balanced</Eyebrow>
            <StatRadar stats={{ power: 5, crimpy: 5, dynamic: 5, technical: 5, mobility: 5 }} size={130} />
          </Surface>
          <Surface tier="default" padding="lg">
            <Eyebrow divider className="mb-3">Brand new</Eyebrow>
            <StatRadar stats={{ power: 1, crimpy: 1, dynamic: 0, technical: 1, mobility: 0 }} size={130} />
          </Surface>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">QuestCard</h2>
        <div className="max-w-sm space-y-3">
          <QuestCard
            title="Find something slabby"
            why="Work the feet. 2 sends."
            xp={50}
            multiplier="MOBILITY ×1.5"
            progress={{ current: 2, target: 3 }}
          />
          <QuestCard
            title="20 min of mobility"
            why="Hips need it. You've been skipping."
            xp={50}
            progress={{ current: 0, target: 1 }}
          />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">CelebrationOverlay</h2>
        <Surface tier="default" padding="lg" className="max-w-sm">
          <Eyebrow divider className="mb-4">Trigger</Eyebrow>
          <button
            type="button"
            onClick={() => setCelebrate(true)}
            className="w-full py-3 rounded-lg bg-ct-terracotta text-ct-forest font-extrabold text-sm tracking-[0.04em]"
          >
            Fire celebration
          </button>
          <CelebrationOverlay
            open={celebrate}
            onClose={() => setCelebrate(false)}
            title="Clean send. V6."
            subtitle="+180 XP"
          />
        </Surface>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">TierThemeProvider</h2>
        <TierThemeProvider>
          <Surface tier="default" padding="lg" className="max-w-sm">
            <Eyebrow divider className="mb-3">Active theme</Eyebrow>
            <ThemeDemoBody />
          </Surface>
        </TierThemeProvider>
      </section>

      <section className="mb-12">
        <h2 className="ct-title mb-4">Reward engine</h2>
        <Surface tier="default" padding="lg" className="space-y-3">
          <Eyebrow divider>Reward engine · live</Eyebrow>
          <p className="ct-body-soft">
            Sample send: V6 flash outdoor, climber strongest in power, climb is crimpy. XP earned:{' '}
            <strong className="text-ct-terra-soft">
              {calculateSendXP({
                grade: 'V6', modality: 'outdoor', outcome: 'flash',
                isPersonalRecord: false, stylePrimary: 'crimpy',
                climberStatShape: { power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 },
                isDeepLog: false, sessionPosition: 0,
              })}
            </strong>
          </p>
          <p className="ct-body-soft">
            Level breakdown at 2,500 XP:{' '}
            <strong className="text-ct-terra-soft">
              Lv {levelFromTotalXP(2500).level} · {levelFromTotalXP(2500).xpInLevel}/{levelFromTotalXP(2500).xpForNext} XP
            </strong>
          </p>
          <p className="ct-body-soft">
            Today's quest (seeded for Mobility-weak climber):{' '}
            <strong className="text-ct-terra-soft">
              {generateDailyQuest({
                statShape: { power: 7, crimpy: 6, dynamic: 4, technical: 5, mobility: 3 },
                lastTrainingType: 'climbing', lastTrainingDaysAgo: 1,
                hasOutdoorIn30d: true, averageSendGrade: 'V4',
                recentSendsAtGrade: true, seed: 7,
              })?.title}
            </strong>
          </p>
          <EngineLiveDemo />
        </Surface>
      </section>
    </main>
  )
}
