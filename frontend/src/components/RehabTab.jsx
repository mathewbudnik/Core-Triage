import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { Stethoscope, LogIn, Info, ChevronDown, ChevronUp } from 'lucide-react'
import RehabProtocol from './RehabProtocol'
import BodyIcon from './BodyIcon'
import { EXERCISE_REGIONS, EXERCISES } from '../data/exercises'

// URL-friendly slug for region names. "Lower Back" → "lower-back".
const regionToSlug = (r) => r.toLowerCase().replace(/\s+/g, '-')
const slugToRegion = (slug) => {
  if (!slug) return null
  const t = slug.toLowerCase()
  return EXERCISE_REGIONS.find((r) => regionToSlug(r) === t) || null
}

// Region grouping for the lobby card grid. Mirrors the brainstorm spec —
// regions that have a body-silhouette icon are split into three columns of
// section. Regions with no front-view representation (Upper Back, Lats) sit
// in a compact pill row at the bottom. General is its own catch-all pill.
const REGION_GROUPS = [
  { key: 'upper', label: 'Upper body',        regions: ['Finger', 'Wrist', 'Elbow', 'Triceps'] },
  { key: 'trunk', label: 'Trunk & shoulder', regions: ['Neck', 'Shoulder', 'Chest', 'Abs', 'Lower Back'] },
  { key: 'lower', label: 'Lower body',        regions: ['Hip', 'Glutes', 'Hamstrings', 'Knee', 'Calves', 'Ankle'] },
]
const BACK_PILL_REGIONS = ['Upper Back', 'Lats']

// Subtle group-color tints applied to card backgrounds. Matches the
// triage wizard accent palette.
const GROUP_BG = {
  upper: 'bg-[linear-gradient(180deg,rgba(125,211,192,0.06),rgba(125,211,192,0))] border-[rgba(125,211,192,0.2)]',
  trunk: 'bg-[linear-gradient(180deg,rgba(247,187,81,0.06),rgba(247,187,81,0))] border-[rgba(247,187,81,0.2)]',
  lower: 'bg-[linear-gradient(180deg,rgba(244,114,114,0.06),rgba(244,114,114,0))] border-[rgba(244,114,114,0.2)]',
}

// Per-region default protocol-duration label shown in card meta.
// Estimates only — adjust freely. Missing entries fall back to "—".
const REGION_WEEKS = {
  Finger: 3,  Wrist: 4,  Elbow: 4,  Triceps: 4,
  Neck: 3,    Shoulder: 6, Chest: 4, Abs: 4, 'Lower Back': 5, 'Upper Back': 5, Lats: 5,
  Hip: 5,     Glutes: 4,  Hamstrings: 4, Knee: 4, Calves: 3, Ankle: 4,
  General: 4,
}

// Total exercise count for a region across all three phases.
function exerciseCount(region) {
  const data = EXERCISES[region]
  if (!data) return 0
  return (data[1]?.length || 0) + (data[2]?.length || 0) + (data[3]?.length || 0)
}

function RegionCard({ region, groupKey, onClick }) {
  const count = exerciseCount(region)
  const weeks = REGION_WEEKS[region]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center text-center gap-2 px-3 py-3 rounded-xl border transition-all duration-150 ${GROUP_BG[groupKey]} hover:border-accent/40 hover:shadow-glow`}
    >
      <BodyIcon region={region} size={56} />
      <div className="mt-1">
        <p className="text-sm font-bold text-text">{region}</p>
        <p className="text-[10px] text-muted mt-0.5">
          {count} exercise{count === 1 ? '' : 's'}
          {weeks ? ` · ${weeks} wk` : ''}
        </p>
      </div>
    </button>
  )
}

// Phase reference content. Examples are intentionally generic since this
// guide is shown before the user picks a region — region-specific exercises
// surface in <RehabProtocol> after a region is chosen.
const PHASE_GUIDE = [
  {
    phase: 1,
    label: 'Phase 1 — Weeks 1–2',
    short: 'Gentle exercises to reduce pain and keep things moving while your injury heals.',
    free: true,
    feel: 'Mild stretch or light muscle effort — no sharp pain, no joint discomfort.',
    examples: ['Range-of-motion stretches', 'Tendon glides', 'Light isometric holds'],
    progress: '5+ days completely pain-free → ready for Phase 2.',
  },
  {
    phase: 2,
    label: 'Phase 2 — Weeks 3–6',
    short: "Reload the tissue with progressive strength work. You're ready here once Phase 1 feels easy.",
    free: false,
    feel: 'Challenging effort, 6–7 out of 10 — fatigue is OK, sharp pain is not.',
    examples: ['Eccentric loading sets', 'Open-hand hangs / banded resistance', 'Controlled progressive holds'],
    progress: 'All sets feel strong and pain-free → start Phase 3.',
  },
  {
    phase: 3,
    label: 'Phase 3 — Week 7+',
    short: 'Sport-specific exercises to get you back on the wall — return-to-climbing drills and load progressions.',
    free: false,
    feel: 'Climbing-style intensity. Light boards, easier grades, gradual ramp.',
    examples: ['Hangboard repeaters', 'Crimp progressions', 'Easy-grade boulder reintroduction'],
    progress: 'Full session at normal volume with no symptoms → returned to sport.',
  },
]

function PhaseCard({ phase, label, short, free, feel, examples, progress, expanded, onToggle }) {
  return (
    <div className="bg-panel border border-outline rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-panel2/50 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-accent">
          {phase}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-text">{label}</p>
            {free ? (
              <span className="text-[9px] font-semibold bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">Free</span>
            ) : (
              <span className="text-[9px] font-semibold bg-panel2 text-muted px-1.5 py-0.5 rounded-full border border-outline">Pro</span>
            )}
          </div>
          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{short}</p>
        </div>
        <div className="text-muted/60 shrink-0 mt-0.5">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden border-t border-outline"
          >
            <div className="px-4 pt-3 pb-4 space-y-3 bg-panel2/30">
              <div>
                <p className="text-[10px] font-semibold text-muted/70 uppercase tracking-wide mb-1">Example exercises</p>
                <ul className="space-y-1">
                  {examples.map((ex) => (
                    <li key={ex} className="text-[11px] text-text leading-snug flex items-start gap-2">
                      <span className="text-accent shrink-0">·</span>
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted/70 uppercase tracking-wide mb-1">What it should feel like</p>
                <p className="text-[11px] text-muted leading-relaxed">{feel}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted/70 uppercase tracking-wide mb-1">Move to next phase when</p>
                <p className="text-[11px] text-muted leading-relaxed">{progress}</p>
              </div>
              <p className="text-[10px] text-muted/50 italic pt-1">Pick your injury area below to see your specific exercises.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function RehabTab({ user, onLoginClick }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Region is URL-driven so the browser back button steps from /rehab/finger
  // → /rehab cleanly.
  const regionSlug = location.pathname.replace(/^\/rehab\/?/, '').split('/')[0]
  const region = slugToRegion(regionSlug)
  const setRegion = (r) => navigate(r ? `/rehab/${regionToSlug(r)}` : '/rehab')

  const [expandedPhase, setExpandedPhase] = useState(null)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  const togglePhase = (phase) => setExpandedPhase((cur) => (cur === phase ? null : phase))

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">
      {/* Header — minimal one-line intro */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope size={18} className="text-accent" />
          <h2 className="text-lg font-bold text-text">Rehab Exercise Library</h2>
        </div>
        <p className="text-sm text-muted">
          Pick your injury area to start a week-by-week plan.
        </p>
      </div>

      {/* Region picker — body-silhouette card grid grouped by body section. */}
      {!region && (
        <div className="space-y-5">
          {REGION_GROUPS.map((g) => (
            <div key={g.key}>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2 ml-1">{g.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {g.regions.map((r) => (
                  <RegionCard
                    key={r}
                    region={r}
                    groupKey={g.key}
                    onClick={() => setRegion(r)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Back-side regions: no front-view silhouette equivalent, so they
              live in a compact pill row instead of getting their own cards. */}
          <div>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2 ml-1">
              Back side <span className="font-normal normal-case text-muted/60">— not visible on the front diagram</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {BACK_PILL_REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border bg-panel border-outline text-muted hover:text-text hover:border-accent/20 transition-colors"
                >
                  {r}
                </button>
              ))}
              <button
                onClick={() => setRegion('General')}
                className="px-3 py-1.5 rounded-full text-xs font-medium border bg-panel border-outline text-muted/70 hover:text-text hover:border-accent/20 transition-colors"
              >
                General
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Once a region is picked, show a compact change-region link instead. */}
      {region && (
        <button
          type="button"
          onClick={() => setRegion(null)}
          className="text-xs text-muted hover:text-accent transition-colors flex items-center gap-1"
        >
          <ChevronUp size={12} /> Pick a different area
        </button>
      )}

      {/* "How does this work?" toggle — phase cards + Triage callout live behind here */}
      <div>
        <button
          type="button"
          onClick={() => setHowItWorksOpen((v) => !v)}
          aria-expanded={howItWorksOpen}
          className="w-full flex items-center justify-between text-xs font-semibold text-muted uppercase tracking-wide py-2 hover:text-text transition-colors"
        >
          <span>How does this work?</span>
          {howItWorksOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence initial={false}>
          {howItWorksOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3">
                <p className="text-xs text-muted leading-relaxed">
                  Each rehab plan has three phases. Tap any phase below to see what to expect.
                </p>

                {/* Phase cards — tap to expand */}
                <div className="space-y-2">
                  {PHASE_GUIDE.map((p) => (
                    <PhaseCard
                      key={p.phase}
                      {...p}
                      expanded={expandedPhase === p.phase}
                      onToggle={() => togglePhase(p.phase)}
                    />
                  ))}
                </div>

                {/* Triage cross-link */}
                <div className="flex items-start gap-3 bg-panel border border-outline rounded-xl px-4 py-3">
                  <Info size={14} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-text mb-0.5">Not sure what's wrong?</p>
                    <p className="text-xs text-muted">
                      Use <span className="text-accent font-medium">Triage</span> first — it walks you through your symptoms and tells you what's likely injured. Come back here once you know what you're dealing with.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Protocol — only renders once a region is picked. The card grid above
          is the empty-state interface; no separate "select your injury area"
          empty card is needed anymore. */}
      <AnimatePresence mode="wait">
        {region && (
          <motion.div
            key={region}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-panel2 border border-outline rounded-2xl p-5"
          >
            <RehabProtocol region={region} user={user} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login nudge */}
      {!user && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-panel border border-outline rounded-xl px-4 py-3">
          <p className="text-xs text-muted leading-relaxed">
            Sign in to save your rehab progress · Phase 2 &amp; 3 require Pro
          </p>
          <button
            onClick={onLoginClick}
            className="flex items-center justify-center gap-1.5 text-xs btn-secondary shrink-0 whitespace-nowrap w-full sm:w-auto"
          >
            <LogIn size={12} />
            Log in
          </button>
        </div>
      )}
    </div>
  )
}
