import { useId } from 'react'
import type { GraphSelectConfig, GraphSelectOption, GraphSelectState } from '../../types/lesson'
import './GraphSelect.css'

interface GraphSelectProps {
  config: GraphSelectConfig
  state: GraphSelectState
  onStateChange: (state: GraphSelectState) => void
  disabled?: boolean
}

const W = 168
const H = 150
const PAD = 14
const GRID = { xMin: -5, xMax: 5, yMin: -6, yMax: 6 }

function toSvg(x: number, y: number): { sx: number; sy: number } {
  const sx = PAD + ((x - GRID.xMin) / (GRID.xMax - GRID.xMin)) * (W - 2 * PAD)
  const sy = H - PAD - ((y - GRID.yMin) / (GRID.yMax - GRID.yMin)) * (H - 2 * PAD)
  return { sx, sy }
}

function integerRange(min: number, max: number): number[] {
  const out: number[] = []
  for (let v = Math.ceil(min); v <= Math.floor(max); v += 1) out.push(v)
  return out
}

function parabolaPath(option: GraphSelectOption): string {
  const [r1, r2] = option.roots
  const sign = option.opens === 'up' ? 1 : -1
  const points: string[] = []
  let started = false
  for (let x = GRID.xMin; x <= GRID.xMax + 0.001; x += 0.1) {
    const y = sign * (x - r1) * (x - r2)
    const { sx, sy } = toSvg(x, y)
    points.push(`${started ? 'L' : 'M'} ${sx.toFixed(1)} ${sy.toFixed(1)}`)
    started = true
  }
  return points.join(' ')
}

function MiniParabola({ option }: { option: GraphSelectOption }) {
  const clipId = useId()
  const origin = toSvg(0, 0)
  const xs = integerRange(GRID.xMin, GRID.xMax)
  const ys = integerRange(GRID.yMin, GRID.yMax)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mini-parabola" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
        </clipPath>
      </defs>

      {xs.map((x) => {
        const pt = toSvg(x, 0)
        return (
          <line key={`vx-${x}`} x1={pt.sx} y1={PAD} x2={pt.sx} y2={H - PAD} stroke="#e9edf3" strokeWidth="1" />
        )
      })}
      {ys.map((y) => {
        const pt = toSvg(0, y)
        return (
          <line key={`hy-${y}`} x1={PAD} y1={pt.sy} x2={W - PAD} y2={pt.sy} stroke="#e9edf3" strokeWidth="1" />
        )
      })}

      <line x1={PAD} y1={origin.sy} x2={W - PAD} y2={origin.sy} stroke="#9aa3b0" strokeWidth="1.25" />
      <line x1={origin.sx} y1={PAD} x2={origin.sx} y2={H - PAD} stroke="#9aa3b0" strokeWidth="1.25" />

      {xs.map((x) =>
        x === 0 || x % 2 !== 0 ? null : (
          <text key={`xl-${x}`} x={toSvg(x, 0).sx} y={origin.sy + 9} className="mini-axis-label" textAnchor="middle">
            {x}
          </text>
        ),
      )}
      {ys.map((y) =>
        y === 0 || y % 2 !== 0 ? null : (
          <text key={`yl-${y}`} x={origin.sx - 4} y={toSvg(0, y).sy + 3} className="mini-axis-label" textAnchor="end">
            {y}
          </text>
        ),
      )}

      <path
        d={parabolaPath(option)}
        fill="none"
        stroke="#2d6cdf"
        strokeWidth="2.25"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  )
}

export function GraphSelect({
  config,
  state,
  onStateChange,
  disabled = false,
}: GraphSelectProps) {
  return (
    <div className="graph-select">
      <p className="graph-select-label">{config.equationLabel}</p>
      <div className="graph-options">
        {config.options.map((option) => (
          <button
            key={option.optionId}
            type="button"
            className={`graph-option ${state.selectedOptionId === option.optionId ? 'selected' : ''}`}
            disabled={disabled}
            onClick={() => onStateChange({ selectedOptionId: option.optionId })}
          >
            <MiniParabola option={option} />
            <span className="option-id">{option.optionId.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
