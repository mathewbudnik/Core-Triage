import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'
import { SKILL_KEYS, skillColor } from '../../lib/skills'

/**
 * Pentagon — the single skill-colored radar for the climber's 5-axis shape.
 * Matches the approved almanac mockup: skill-colored spokes, ink grid rings,
 * an ink-outlined data polygon with a faint fill, skill-colored vertex dots,
 * skill-colored mono axis labels, and emphasis on the weakest axis.
 *
 * Axes (canonical): power, crimp, dynamic, technique, mobility — values 0-10.
 * Legacy axis keys `crimpy` / `technical` (from deriveStatShape) are accepted
 * as aliases for `crimp` / `technique` so existing call sites keep working.
 *
 * Props:
 *   axes:  { power, crimp, dynamic, technique, mobility } values 0-10 (null ok)
 *   stats: same shape — back-compat alias for the legacy StatRadar API.
 *          If both are passed, `axes` wins.
 *   size:  pixel size — width/height of the square viewport (default: 240)
 *   mini:  bool — emblem variant: grid + colored spokes + data polygon +
 *          colored vertex dots, WITHOUT text labels or values (sidebar emblem)
 *   tier:  string written to data-tier (kept for back-compat / styling hooks)
 *   animate:    bool — animate the polygon on mount / value change
 *   showLabels: bool — render the 5 skill-colored axis labels
 *   showValues: bool — render numeric values near each vertex
 *   className:  extra classes
 */

// Canonical axis order, top-up clockwise: power, crimp, dynamic, technique, mobility.
const AXES = SKILL_KEYS // ['power','crimp','dynamic','technique','mobility']
const AXIS_LABELS = ['POWER', 'CRIMP', 'DYNAMIC', 'TECHNIQUE', 'MOBILITY']

// Legacy keys -> canonical keys.
const ALIASES = { crimpy: 'crimp', technical: 'technique' }

// 5 vertices, top-up, at -90, -18, +54, +126, +198 degrees.
const AXIS_ANGLES = [-90, -18, 54, 126, 198].map((d) => (d * Math.PI) / 180)

// Label anchors per axis, matching the mockup placement.
const LABEL_ANCHORS = ['middle', 'start', 'middle', 'middle', 'end']

const INK = '#2a2722'
const CARD = '#f4ecdb'
const CLAY_DEEP = '#b06a4f'

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

// Normalize whatever shape the caller passes into canonical keys with numeric
// (or null) values. Accepts legacy `crimpy` / `technical` aliases.
function normalizeAxes(raw) {
  const out = { power: null, crimp: null, dynamic: null, technique: null, mobility: null }
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    const key = ALIASES[k] ?? k
    if (key in out) out[key] = v
  }
  return out
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

  const isEmpty = AXES.every((a) => values[a] === null || values[a] === undefined || values[a] === 0)

  // Empty state: faint, uniform "resting" pentagon at value 3 so the radar
  // reads as intentional rather than broken. No vertex emphasis, no values.
  const renderValues = isEmpty
    ? { power: 3, crimp: 3, dynamic: 3, technique: 3, mobility: 3 }
    : AXES.reduce((acc, a) => {
        acc[a] = values[a] === null || values[a] === undefined ? 0 : values[a]
        return acc
      }, {})

  // Weakest real axis (lowest value) gets emphasis. Skip in empty state.
  let weakestAxis = null
  if (!isEmpty) {
    weakestAxis = AXES.reduce(
      (min, a) => (renderValues[a] < renderValues[min] ? a : min),
      AXES[0],
    )
  }

  const dataPoints = polygonPoints(renderValues, cx, cy, radius)
  const transition = useReducedTransition(TRANSITIONS.surface_rise)

  const dataOpacity = isEmpty ? 0.5 : 1
  // Scale stroke / dot sizes with the viewport (tuned at size 200 -> radius 80).
  const k = size / 200
  const spokeWidth = 1.3 * k
  const ringWidth = 1 * k
  const dataStrokeWidth = 2 * k
  const dotR = 4 * k
  const weakR = 5 * k

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
        <polygon points={ringPoints(10, cx, cy, radius)} strokeWidth={ringWidth} opacity="0.2" />
        <polygon points={ringPoints(5, cx, cy, radius)} strokeWidth={ringWidth} opacity="0.1" />
      </g>

      {/* Skill-colored spokes from center to each axis vertex */}
      <g opacity={dataOpacity}>
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
              opacity={0.5}
            />
          )
        })}
      </g>

      {/* Data polygon — ink outline, faint ink fill */}
      <motion.polygon
        points={dataPoints}
        fill="rgba(42,39,34,0.05)"
        stroke={INK}
        strokeOpacity={isEmpty ? 0.3 : 0.5}
        strokeWidth={dataStrokeWidth}
        strokeLinejoin="round"
        initial={animate ? { opacity: 0, scale: 0.92 } : false}
        animate={animate ? { opacity: 1, scale: 1 } : undefined}
        transition={transition}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Skill-colored vertex dots — weakest axis slightly larger w/ card ring */}
      <g opacity={dataOpacity}>
        {AXES.map((axis, i) => {
          const [x, y] = pointAt(renderValues[axis], AXIS_ANGLES[i], cx, cy, radius)
          const isWeak = axis === weakestAxis
          return (
            <circle
              key={axis}
              cx={x}
              cy={y}
              r={isWeak ? weakR : dotR}
              fill={skillColor(axis)}
              stroke={isWeak ? CARD : 'none'}
              strokeWidth={isWeak ? 1.5 * k : 0}
            />
          )
        })}
      </g>

      {/* Skill-colored axis labels (mono) — full variant only */}
      {!mini && showLabels && AXES.map((axis, i) => {
        const [x, y] = pointAt(11.2, AXIS_ANGLES[i], cx, cy, radius)
        return (
          <text
            key={axis + '-lbl'}
            x={x.toFixed(1)}
            y={(y + (y < cy ? -2 : 8)).toFixed(1)}
            textAnchor={LABEL_ANCHORS[i]}
            fontFamily="'JetBrains Mono', ui-monospace, monospace"
            fontSize={(8 * k).toFixed(1)}
            fontWeight="500"
            letterSpacing="0.05em"
            fill={skillColor(axis)}
          >
            {AXIS_LABELS[i]}
          </text>
        )
      })}

      {/* Numeric values near vertices — full variant, non-empty only */}
      {!mini && showValues && !isEmpty && AXES.map((axis, i) => {
        const [x, y] = pointAt(Math.min(renderValues[axis] + 1.6, 10.5), AXIS_ANGLES[i], cx, cy, radius)
        const isWeak = axis === weakestAxis
        return (
          <text
            key={axis + '-val'}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="'JetBrains Mono', ui-monospace, monospace"
            fontSize={(11 * k).toFixed(1)}
            fontWeight="600"
            fill={isWeak ? CLAY_DEEP : INK}
          >
            {Number(renderValues[axis]).toFixed(renderValues[axis] % 1 ? 1 : 0)}
          </text>
        )
      })}
    </svg>
  )
}
