import { useId, type ChangeEvent } from 'react'
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
const PAD = 36

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

function integerRange(min: number, max: number): number[] {
  const out: number[] = []
  for (let v = Math.ceil(min); v <= Math.floor(max); v += 1) out.push(v)
  return out
}

export function LinearGraph({
  config,
  state,
  onStateChange,
  disabled = false,
}: LinearGraphProps) {
  const clipId = useId()
  const { slope, intercept } = config.equation
  const { grid } = config
  const isYMode = config.mode === 'find-y-intercept'
  const axisLabel = isYMode ? 'y-intercept' : 'x-intercept'
  const showGraph = config.showGraph !== false

  // Line endpoints at the grid's left/right edges; clipped to the plot area in SVG.
  const p1 = toSvg(grid.xMin, slope * grid.xMin + intercept, grid)
  const p2 = toSvg(grid.xMax, slope * grid.xMax + intercept, grid)
  const origin = toSvg(0, 0, grid)

  const xs = integerRange(grid.xMin, grid.xMax)
  const ys = integerRange(grid.yMin, grid.yMax)

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    onStateChange({ typedValue: event.target.value })
  }

  const typedNum =
    state.typedValue !== null && state.typedValue.trim() !== ''
      ? Number(state.typedValue)
      : NaN
  let marker: { sx: number; sy: number } | null = null
  if (showGraph && Number.isFinite(typedNum)) {
    const point = isYMode ? { x: 0, y: typedNum } : { x: typedNum, y: 0 }
    const within =
      point.x >= grid.xMin &&
      point.x <= grid.xMax &&
      point.y >= grid.yMin &&
      point.y <= grid.yMax
    if (within) marker = toSvg(point.x, point.y, grid)
  }

  return (
    <div className="linear-graph">
      {config.equationLabel && <p className="graph-equation">{config.equationLabel}</p>}
      <p className="graph-hint">
        {showGraph
          ? `Read the graph, then type the ${axisLabel} as a whole number.`
          : `Use the equation only. Type the ${axisLabel} as a whole number.`}
      </p>

      {showGraph && (
        <svg className="graph-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Coordinate grid">
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
            </clipPath>
          </defs>

          {/* faint grid lines */}
          {xs.map((x) => {
            const pt = toSvg(x, 0, grid)
            return (
              <line
                key={`vx-${x}`}
                x1={pt.sx}
                y1={PAD}
                x2={pt.sx}
                y2={H - PAD}
                stroke="#e9edf3"
                strokeWidth="1"
              />
            )
          })}
          {ys.map((y) => {
            const pt = toSvg(0, y, grid)
            return (
              <line
                key={`hy-${y}`}
                x1={PAD}
                y1={pt.sy}
                x2={W - PAD}
                y2={pt.sy}
                stroke="#e9edf3"
                strokeWidth="1"
              />
            )
          })}

          {/* axes */}
          <line x1={PAD} y1={origin.sy} x2={W - PAD} y2={origin.sy} stroke="#889" strokeWidth="1.5" />
          <line x1={origin.sx} y1={PAD} x2={origin.sx} y2={H - PAD} stroke="#889" strokeWidth="1.5" />

          {/* x-axis integer labels */}
          {xs.map((x) =>
            x === 0 ? null : (
              <text
                key={`xl-${x}`}
                x={toSvg(x, 0, grid).sx}
                y={origin.sy + 14}
                className="axis-label"
                textAnchor="middle"
              >
                {x}
              </text>
            ),
          )}
          {/* y-axis integer labels */}
          {ys.map((y) =>
            y === 0 ? null : (
              <text
                key={`yl-${y}`}
                x={origin.sx - 8}
                y={toSvg(0, y, grid).sy + 3}
                className="axis-label"
                textAnchor="end"
              >
                {y}
              </text>
            ),
          )}
          <text x={origin.sx - 8} y={origin.sy + 14} className="axis-label" textAnchor="end">
            0
          </text>

          {/* plotted line, clipped to plot area */}
          <line
            x1={p1.sx}
            y1={p1.sy}
            x2={p2.sx}
            y2={p2.sy}
            stroke="#2d6cdf"
            strokeWidth="3"
            clipPath={`url(#${clipId})`}
          />

          {marker && (
            <circle cx={marker.sx} cy={marker.sy} r="8" fill="#e74c3c" stroke="#fff" strokeWidth="2" />
          )}
        </svg>
      )}

      <div className="intercept-input">
        <label htmlFor={`intercept-${clipId}`}>{isYMode ? 'y-intercept =' : 'x-intercept ='}</label>
        <input
          id={`intercept-${clipId}`}
          type="number"
          step="1"
          inputMode="numeric"
          className="intercept-field"
          value={state.typedValue ?? ''}
          onChange={handleInput}
          disabled={disabled}
          placeholder="?"
          aria-label={`Enter the ${axisLabel}`}
        />
      </div>
    </div>
  )
}
