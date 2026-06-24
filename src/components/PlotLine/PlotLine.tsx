import { useId, useState, type PointerEvent } from 'react'
import type { GridPoint, PlotLineConfig, PlotLineState } from '../../types/lesson'
import './PlotLine.css'

interface PlotLineProps {
  config: PlotLineConfig
  state: PlotLineState
  onStateChange: (state: PlotLineState) => void
  disabled?: boolean
}

const W = 320
const H = 280
const PAD = 36

function toSvg(x: number, y: number, grid: PlotLineConfig['grid']) {
  const { xMin, xMax, yMin, yMax } = grid
  const sx = PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD)
  const sy = H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD)
  return { sx, sy }
}

function integerRange(min: number, max: number): number[] {
  const out: number[] = []
  for (let v = Math.ceil(min); v <= Math.floor(max); v += 1) out.push(v)
  return out
}

function snapFromPointer(
  event: { clientX: number; clientY: number },
  rect: DOMRect,
  grid: PlotLineConfig['grid'],
): GridPoint {
  const sx = ((event.clientX - rect.left) / rect.width) * W
  const sy = ((event.clientY - rect.top) / rect.height) * H
  const xRaw = grid.xMin + ((sx - PAD) / (W - 2 * PAD)) * (grid.xMax - grid.xMin)
  const yRaw = grid.yMin + ((H - PAD - sy) / (H - 2 * PAD)) * (grid.yMax - grid.yMin)
  return {
    x: Math.max(grid.xMin, Math.min(grid.xMax, Math.round(xRaw))),
    y: Math.max(grid.yMin, Math.min(grid.yMax, Math.round(yRaw))),
  }
}

function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y
}

export function PlotLine({ config, state, onStateChange, disabled = false }: PlotLineProps) {
  const clipId = useId()
  const { grid } = config
  const [hover, setHover] = useState<GridPoint | null>(null)

  const xs = integerRange(grid.xMin, grid.xMax)
  const ys = integerRange(grid.yMin, grid.yMax)
  const origin = toSvg(0, 0, grid)

  const updateHover = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    setHover(snapFromPointer(event, rect, grid))
  }

  const handleClick = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    const p = snapFromPointer(event, rect, grid)
    const existingIndex = state.points.findIndex((pt) => samePoint(pt, p))
    if (existingIndex >= 0) {
      // click a placed dot again to remove it
      onStateChange({ points: state.points.filter((_, i) => i !== existingIndex) })
      return
    }
    if (state.points.length >= 2) return
    onStateChange({ points: [...state.points, p] })
  }

  // line through the two placed points, extended across the grid
  let linePts: { x1: number; y1: number; x2: number; y2: number } | null = null
  if (state.points.length === 2) {
    const [a, b] = state.points
    if (a.x !== b.x) {
      const m = (b.y - a.y) / (b.x - a.x)
      const c = a.y - m * a.x
      const p1 = toSvg(grid.xMin, m * grid.xMin + c, grid)
      const p2 = toSvg(grid.xMax, m * grid.xMax + c, grid)
      linePts = { x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy }
    } else {
      const p1 = toSvg(a.x, grid.yMin, grid)
      const p2 = toSvg(a.x, grid.yMax, grid)
      linePts = { x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy }
    }
  }

  const showHoverGhost =
    hover && !disabled && state.points.length < 2 && !state.points.some((p) => samePoint(p, hover))

  return (
    <div className="plot-line">
      {config.equationLabel && <p className="plot-equation">{config.equationLabel}</p>}
      <p className="plot-hint">Place 2 dots on the line. Click a dot again to remove it.</p>

      <svg
        className="plot-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Plot the line by placing two points"
        onPointerMove={updateHover}
        onPointerLeave={() => setHover(null)}
        onClick={handleClick}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
          </clipPath>
        </defs>

        {xs.map((x) => {
          const pt = toSvg(x, 0, grid)
          return (
            <line key={`vx-${x}`} x1={pt.sx} y1={PAD} x2={pt.sx} y2={H - PAD} stroke="#e9edf3" strokeWidth="1" />
          )
        })}
        {ys.map((y) => {
          const pt = toSvg(0, y, grid)
          return (
            <line key={`hy-${y}`} x1={PAD} y1={pt.sy} x2={W - PAD} y2={pt.sy} stroke="#e9edf3" strokeWidth="1" />
          )
        })}

        <line x1={PAD} y1={origin.sy} x2={W - PAD} y2={origin.sy} stroke="#9aa3b0" strokeWidth="1.5" />
        <line x1={origin.sx} y1={PAD} x2={origin.sx} y2={H - PAD} stroke="#9aa3b0" strokeWidth="1.5" />

        {xs.map((x) =>
          x === 0 ? null : (
            <text key={`xl-${x}`} x={toSvg(x, 0, grid).sx} y={origin.sy + 13} className="plot-axis-label" textAnchor="middle">
              {x}
            </text>
          ),
        )}
        {ys.map((y) =>
          y === 0 ? null : (
            <text key={`yl-${y}`} x={origin.sx - 7} y={toSvg(0, y, grid).sy + 3} className="plot-axis-label" textAnchor="end">
              {y}
            </text>
          ),
        )}

        {linePts && (
          <line
            x1={linePts.x1}
            y1={linePts.y1}
            x2={linePts.x2}
            y2={linePts.y2}
            stroke="#2d6cdf"
            strokeWidth="3"
            clipPath={`url(#${clipId})`}
          />
        )}

        {showHoverGhost && hover && (
          <circle
            cx={toSvg(hover.x, hover.y, grid).sx}
            cy={toSvg(hover.x, hover.y, grid).sy}
            r="7"
            className="plot-ghost-dot"
          />
        )}

        {state.points.map((p, i) => {
          const pt = toSvg(p.x, p.y, grid)
          return (
            <circle key={`${p.x}-${p.y}-${i}`} cx={pt.sx} cy={pt.sy} r="7" className="plot-dot" />
          )
        })}
      </svg>

      <p className="plot-status">{state.points.length} / 2 dots placed</p>
    </div>
  )
}
