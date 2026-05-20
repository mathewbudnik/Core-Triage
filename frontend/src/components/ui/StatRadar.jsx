import { motion } from 'framer-motion'
import { TRANSITIONS, useReducedTransition } from '../../lib/motion'

/**
 * Pentagon radar showing five stat axes (0-10 each). Renders as SVG with
 * a terracotta-tinted fill polygon and vertex dots.
 *
 * Props:
 *   stats: { power, crimpy, dynamic, technical, mobility }   values 0-10
 *   size:  pixel size — width/height of the square viewport (default: 130)
 *   className: extra classes
 *   animate: bool — animate the polygon on mount/value change (default: true)
 */
const AXES = ['power', 'crimpy', 'dynamic', 'technical', 'mobility']

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

function statPolygon(stats, cx, cy, radius) {
  return AXES
    .map((axis, i) => pointAt(stats[axis] ?? 0, AXIS_ANGLES[i], cx, cy, radius))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

export default function StatRadar({ stats, size = 130, className = '', animate = true }) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.42
  // Starter pentagon for brand-new climbers — a clean small uniform pentagon
  // at value 3 (~half the size of balanced) so very-low-stat climbers don't
  // see a jagged near-zero spike. Threshold is mean < 1.5 so anyone with
  // real activity sees their real shape.
  const total = AXES.reduce((sum, axis) => sum + (stats[axis] ?? 0), 0)
  const isStarter = total / AXES.length < 1.5
  const renderStats = isStarter
    ? { power: 3, crimpy: 3, dynamic: 3, technical: 3, mobility: 3 }
    : stats
  const points = statPolygon(renderStats, cx, cy, radius)
  const transition = useReducedTransition(TRANSITIONS.surface_rise)
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
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
        stroke="#d97757"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={animate ? { opacity: 0, scale: 0.92 } : false}
        animate={animate ? { opacity: 1, scale: 1 } : undefined}
        transition={transition}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* Vertex dots */}
      <g fill="#f0a875">
        {AXES.map((axis, i) => {
          const [x, y] = pointAt(renderStats[axis] ?? 0, AXIS_ANGLES[i], cx, cy, radius)
          return <circle key={axis} cx={x} cy={y} r="2.5" />
        })}
      </g>
    </svg>
  )
}
