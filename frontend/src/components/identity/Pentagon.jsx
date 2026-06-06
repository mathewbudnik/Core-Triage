import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Pentagon radar showing five stat axes (0-10 each). Renders as SVG with
 * a terracotta-tinted fill polygon and vertex dots.
 *
 * Props:
 *   axes:  { power, crimpy, dynamic, technical, mobility }   values 0-10
 *   stats: same shape as `axes` — kept as a back-compat alias for the
 *          legacy StatRadar API. If both are passed, `axes` wins.
 *   size:  pixel size — width/height of the square viewport (default: 240)
 *   tier:  string label written to data-tier; CSS can swap stroke/vertex
 *          colors via --ct-tier-stroke / --ct-tier-vertex variables.
 *   animate:    bool — animate the polygon on mount/value change
 *   showLabels: bool — render the 5 axis labels (POWER/CRIMPY/...)
 *   showValues: bool — render numeric values near each vertex
 *   className:  extra classes
 */
const AXES = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']
const AXIS_LABELS = ['POWER', 'CRIMPY', 'DYNAMIC', 'TECHNICAL', 'MOBILITY']

// 5 vertices of a pentagon, top-up, normalized to a unit circle centered at (0.5, 0.5).
// Each at -90deg, -18deg, +54deg, +126deg, +198deg.
const AXIS_ANGLES = [-90, -18, 54, 126, 198].map((d) => (d * Math.PI) / 180)

function pointAt(value, angle, cx, cy, radius) {
  const r = radius * (value / 10)
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
}

function gridPolygon(level, cx, cy, radius) {
  return AXIS_ANGLES
    .map((angle) => pointAt(level, angle, cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

function statPolygon(values, cx, cy, radius) {
  return AXES
    .map((axis, i) => pointAt(values[axis] ?? 0, AXIS_ANGLES[i], cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

export default function Pentagon({
  axes,
  stats,
  size = 240,
  tier = null,
  animate = true,
  showLabels = false,
  showValues = false,
  className = '',
}) {
  // Accept both `axes` (new) and `stats` (legacy StatRadar) — axes wins.
  const values = axes ?? stats ?? {}
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.42

  // Starter pentagon for brand-new climbers: when every axis is null
  // (no sends logged in any style), render a uniform pentagon at value 3
  // so the radar looks intentional, not broken. Otherwise honor real values
  // and treat null as 0 in the polygon path so the vertex sits at center.
  const allNull = AXES.every((axis) => values[axis] === null || values[axis] === undefined)
  const renderValues = allNull
    ? { power: 3, crimpy: 3, dynamic: 3, technical: 3, mobility: 3 }
    : AXES.reduce((acc, axis) => {
        acc[axis] = values[axis] === null || values[axis] === undefined ? 0 : values[axis]
        return acc
      }, {})

  const points = statPolygon(renderValues, cx, cy, radius)
  const transition = useReducedTransition(TRANSITIONS.surface_rise)
  const labelOffset = size * 0.05

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      data-tier={tier}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid rings */}
      <g stroke="rgba(240,168,117,0.18)" strokeWidth="1" fill="none">
        <polygon points={gridPolygon(10, cx, cy, radius)} />
        <polygon points={gridPolygon(6,  cx, cy, radius)} />
        <polygon points={gridPolygon(3,  cx, cy, radius)} />
      </g>
      {/* Stat polygon */}
      <motion.polygon
        points={points}
        fill="rgba(217,119,87,0.22)"
        stroke="var(--ct-tier-stroke, #d97757)"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={animate ? { opacity: 0, scale: 0.92 } : false}
        animate={animate ? { opacity: 1, scale: 1 } : undefined}
        transition={transition}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* Vertex dots: skip null axes on real climbers; show all 5 in starter mode */}
      <g fill="var(--ct-tier-vertex, #f0a875)">
        {AXES.map((axis, i) => {
          const isNull = values[axis] === null || values[axis] === undefined
          if (isNull && !allNull) return null
          const [x, y] = pointAt(renderValues[axis], AXIS_ANGLES[i], cx, cy, radius)
          return <circle key={axis} cx={x} cy={y} r="2.5" />
        })}
      </g>
      {/* Axis labels */}
      {showLabels && AXES.map((axis, i) => {
        const [x, y] = pointAt(11, AXIS_ANGLES[i], cx, cy, radius)
        const anchor = x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle'
        return (
          <text
            key={axis}
            x={x}
            y={y + (y < cy ? -labelOffset / 2 : labelOffset / 2)}
            textAnchor={anchor}
            fontFamily="var(--ct-font-mono, monospace)"
            fontSize={size * 0.04}
            fontWeight="700"
            letterSpacing="0.18em"
            fill="rgba(26,38,32,0.55)"
          >
            {AXIS_LABELS[i]}
          </text>
        )
      })}
      {/* Numeric values near vertices */}
      {showValues && AXES.map((axis, i) => {
        const [x, y] = pointAt(renderValues[axis] + 1.5, AXIS_ANGLES[i], cx, cy, radius)
        return (
          <text
            key={axis + '-val'}
            x={x}
            y={y}
            textAnchor="middle"
            fontFamily="var(--ct-font-serif, serif)"
            fontSize={size * 0.055}
            fill="var(--ct-ink, #1a2620)"
          >
            {(renderValues[axis] ?? 0).toFixed(1)}
          </text>
        )
      })}
    </svg>
  )
}
