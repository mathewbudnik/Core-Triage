import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'
import { SKILL_KEYS, skillColor } from '../../lib/skills'

/**
 * Pentagon — the climber's 5-axis skill radar, FIFA stat-card style.
 *
 * A filled radar: a skill-tinted fill (leaning to the climber's strongest
 * skill), crisp ink outline, skill-colored vertex dots, and the stat value
 * sitting on each axis (skill-colored label + bold ink number). The shape is
 * grade-anchored upstream — small for beginners, near-maxed only at the top
 * grades — and empty (no sends) renders just the grid so it reads as "room to
 * grow", never a pre-filled card.
 *
 * Axes (canonical): power, crimp, dynamic, technique, mobility — values 0-10.
 * Legacy axis keys `crimpy` / `technical` are accepted as aliases.
 *
 * Props:
 *   axes:  { power, crimp, dynamic, technique, mobility } values 0-10 (null ok)
 *   stats: same shape — back-compat alias for the legacy StatRadar API.
 *   size:  pixel size of the square viewport (default: 240)
 *   mini:  bool — emblem variant: filled shape + dots only, no labels/values
 *   tier:  string written to data-tier (back-compat / styling hook)
 *   animate:    bool — animate the polygon on mount / value change
 *   showLabels: bool — render the 5 axis labels (full variant)
 *   showValues: bool — render the numeric stat on each axis (full variant)
 *   className:  extra classes
 */

const AXES = SKILL_KEYS // ['power','crimp','dynamic','technique','mobility']
const AXIS_LABELS = ['POWER', 'CRIMP', 'DYNAMIC', 'TECHNIQUE', 'MOBILITY']
const ALIASES = { crimpy: 'crimp', technical: 'technique' }

// 5 vertices, top-up, at -90, -18, +54, +126, +198 degrees.
const AXIS_ANGLES = [-90, -18, 54, 126, 198].map((d) => (d * Math.PI) / 180)
const LABEL_ANCHORS = ['middle', 'start', 'middle', 'middle', 'end']

const INK = '#2a2722'
const CARD = '#f4ecdb'

function pointAt(value, angle, cx, cy, radius) {
  const r = radius * (value / 10)
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
}

function polygonPoints(values, cx, cy, radius) {
  return AXES
    .map((axis, i) => pointAt(values[axis], AXIS_ANGLES[i], cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

function ringPoints(level, cx, cy, radius) {
  return AXIS_ANGLES
    .map((angle) => pointAt(level, angle, cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

function normalizeAxes(raw) {
  const out = { power: null, crimp: null, dynamic: null, technique: null, mobility: null }
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    const key = ALIASES[k] ?? k
    if (key in out) out[key] = v
  }
  return out
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export default function Pentagon({
  axes,
  stats,
  size = 240,
  mini = false,
  tier = null,
  animate = true,
  showLabels = false,
  showValues = false,
  className = '',
}) {
  const values = normalizeAxes(axes ?? stats)
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.4

  const isEmpty = AXES.every(
    (a) => values[a] === null || values[a] === undefined || values[a] === 0,
  )

  // Non-empty render values: null → 0 (with grade-anchored scoring upstream,
  // unlogged axes already arrive at their floor, so 0s are rare).
  const renderValues = AXES.reduce((acc, a) => {
    acc[a] = values[a] === null || values[a] === undefined ? 0 : values[a]
    return acc
  }, {})

  // Strongest axis drives the skill-tinted fill (FIFA "leans to your identity").
  const strongestAxis = AXES.reduce(
    (max, a) => (renderValues[a] > renderValues[max] ? a : max),
    AXES[0],
  )

  const transition = useReducedTransition(TRANSITIONS.surface_rise)

  // Scale stroke / dot / text with the viewport (tuned at size 200 → radius 80).
  const k = size / 200
  const spokeWidth = 1 * k
  const ringWidth = 1 * k
  const dataStrokeWidth = 2.5 * k
  const dotR = 4.5 * k

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      data-tier={tier}
      role="img"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid rings — ink at low opacity */}
      <g fill="none" stroke={INK}>
        <polygon points={ringPoints(10, cx, cy, radius)} strokeWidth={ringWidth} opacity="0.18" />
        <polygon points={ringPoints(6.6, cx, cy, radius)} strokeWidth={ringWidth} opacity="0.1" />
        <polygon points={ringPoints(3.3, cx, cy, radius)} strokeWidth={ringWidth} opacity="0.08" />
      </g>

      {/* Skill-colored spokes */}
      <g>
        {AXES.map((axis, i) => {
          const [x, y] = pointAt(10, AXIS_ANGLES[i], cx, cy, radius)
          return (
            <line
              key={axis}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={skillColor(axis)}
              strokeWidth={spokeWidth}
              opacity={isEmpty ? 0.3 : 0.4}
            />
          )
        })}
      </g>

      {/* Filled data polygon (FIFA) — skill-tinted fill + ink outline. Hidden
          when empty so the radar reads as "room to grow". */}
      {!isEmpty && (
        <motion.polygon
          points={polygonPoints(renderValues, cx, cy, radius)}
          fill={hexToRgba(skillColor(strongestAxis), 0.3)}
          stroke={INK}
          strokeOpacity={0.62}
          strokeWidth={dataStrokeWidth}
          strokeLinejoin="round"
          initial={animate ? { opacity: 0, scale: 0.92 } : false}
          animate={animate ? { opacity: 1, scale: 1 } : undefined}
          transition={transition}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      )}

      {/* Skill-colored vertex dots */}
      {!isEmpty && (
        <g>
          {AXES.map((axis, i) => {
            const [x, y] = pointAt(renderValues[axis], AXIS_ANGLES[i], cx, cy, radius)
            return (
              <circle
                key={axis}
                cx={x}
                cy={y}
                r={dotR}
                fill={skillColor(axis)}
                stroke={CARD}
                strokeWidth={1.2 * k}
              />
            )
          })}
        </g>
      )}

      {/* Outer stat blocks (FIFA) — skill-colored label + bold value on each
          axis. Full variant only. */}
      {!mini && (showLabels || showValues) && AXES.map((axis, i) => {
        const [x, y] = pointAt(11.7, AXIS_ANGLES[i], cx, cy, radius)
        const top = y < cy - 1
        const anchor = LABEL_ANCHORS[i]
        const labelY = top ? y - (showValues && !isEmpty ? 6 * k : 0) : y + (showValues && !isEmpty ? 1 : 3) * k
        return (
          <g key={axis + '-stat'}>
            {showLabels && (
              <text
                x={x.toFixed(1)}
                y={labelY.toFixed(1)}
                textAnchor={anchor}
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                fontSize={(8 * k).toFixed(1)}
                fontWeight="500"
                letterSpacing="0.04em"
                fill={skillColor(axis)}
              >
                {AXIS_LABELS[i]}
              </text>
            )}
            {showValues && !isEmpty && (
              <text
                x={x.toFixed(1)}
                y={(labelY + (showLabels ? (top ? 11 : 12) * k : 4 * k)).toFixed(1)}
                textAnchor={anchor}
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                fontSize={(12 * k).toFixed(1)}
                fontWeight="700"
                fill={INK}
              >
                {Math.round(renderValues[axis])}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
