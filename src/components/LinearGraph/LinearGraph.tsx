import { type MouseEvent } from 'react'
import type { LinearGraphConfig, LinearGraphState } from '../../types/lesson'
import './LinearGraph.css'

interface LinearGraphProps {
  config: LinearGraphConfig
  state: LinearGraphState
  onStateChange: (state: LinearGraphState) => void
  disabled?: boolean
}

const W = 320
const H = 280
const PAD = 32

function toSvg(
  x: number,
  y: number,
  grid: LinearGraphConfig['grid'],
): { sx: number; sy: number } {
  const { xMin, xMax, yMin, yMax } = grid
  const sx = PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD)
  const sy = H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD)
  return { sx, sy }
}

function fromSvg(
  sx: number,
  sy: number,
  grid: LinearGraphConfig['grid'],
): { x: number; y: number } {
  const { xMin, xMax, yMin, yMax } = grid
  const x = xMin + ((sx - PAD) / (W - 2 * PAD)) * (xMax - xMin)
  const y = yMin + ((H - PAD - sy) / (H - 2 * PAD)) * (yMax - yMin)
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  }
}

function linePoints(config: LinearGraphConfig): { x1: number; y1: number; x2: number; y2: number } {
  const { slope, intercept } = config.equation
  const { xMin, xMax } = config.grid
  return {
    x1: xMin,
    y1: slope * xMin + intercept,
    x2: xMax,
    y2: slope * xMax + intercept,
  }
}

export function LinearGraph({
  config,
  state,
  onStateChange,
  disabled = false,
}: LinearGraphProps) {
  const lp = linePoints(config)
  const p1 = toSvg(lp.x1, lp.y1, config.grid)
  const p2 = toSvg(lp.x2, lp.y2, config.grid)
  const origin = toSvg(0, 0, config.grid)

  const handleGridClick = (event: MouseEvent<SVGSVGElement>) => {
    if (disabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    const sx = ((event.clientX - rect.left) / rect.width) * W
    const sy = ((event.clientY - rect.top) / rect.height) * H
    const point = fromSvg(sx, sy, config.grid)
    onStateChange({ placedPoint: point })
  }

  const placed = state.placedPoint
    ? toSvg(state.placedPoint.x, state.placedPoint.y, config.grid)
    : null

  const modeHint =
    config.mode === 'find-y-intercept'
      ? 'Tap where the line crosses the y-axis.'
      : 'Tap where the line crosses the x-axis.'

  return (
    <div className="linear-graph">
      {config.equationLabel && (
        <p className="graph-equation">{config.equationLabel}</p>
      )}
      <p className="graph-hint">{modeHint}</p>
      <svg
        className="graph-svg"
        viewBox={`0 0 ${W} ${H}`}
        onClick={handleGridClick}
        role="img"
        aria-label="Coordinate grid"
      >
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#889" strokeWidth="1" />
        <line x1={origin.sx} y1={PAD} x2={origin.sx} y2={H - PAD} stroke="#889" strokeWidth="1" />

        {Array.from({ length: 11 }).map((_, i) => {
          const x = config.grid.xMin + i
          const pt = toSvg(x, 0, config.grid)
          return (
            <line
              key={`gx-${i}`}
              x1={pt.sx}
              y1={H - PAD - 4}
              x2={pt.sx}
              y2={H - PAD + 4}
              stroke="#aab"
              strokeWidth="1"
            />
          )
        })}

        <line
          x1={p1.sx}
          y1={p1.sy}
          x2={p2.sx}
          y2={p2.sy}
          stroke="#2d6cdf"
          strokeWidth="3"
        />

        {placed && (
          <circle cx={placed.sx} cy={placed.sy} r="8" fill="#e74c3c" stroke="#fff" strokeWidth="2" />
        )}
      </svg>
    </div>
  )
}
