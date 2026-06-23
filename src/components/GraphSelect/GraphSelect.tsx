import type { GraphSelectConfig, GraphSelectOption, GraphSelectState } from '../../types/lesson'
import './GraphSelect.css'

interface GraphSelectProps {
  config: GraphSelectConfig
  state: GraphSelectState
  onStateChange: (state: GraphSelectState) => void
  disabled?: boolean
}

function parabolaPath(option: GraphSelectOption, width: number, height: number): string {
  const [r1, r2] = option.roots
  const sign = option.opens === 'up' ? 1 : -1
  const points: string[] = []
  for (let px = 0; px <= width; px += 4) {
    const x = -4 + (px / width) * 8
    const y = sign * (x - r1) * (x - r2)
    const sy = height - 20 - (y + 8) * 8
    const sx = 20 + ((x + 4) / 8) * (width - 40)
    points.push(`${px === 0 ? 'M' : 'L'} ${sx} ${Math.max(10, Math.min(height - 10, sy))}`)
  }
  return points.join(' ')
}

function MiniParabola({ option }: { option: GraphSelectOption }) {
  const w = 140
  const h = 100
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mini-parabola" aria-hidden="true">
      <line x1="20" y1={h - 20} x2={w - 20} y2={h - 20} stroke="#999" strokeWidth="1" />
      <line x1={w / 2} y1="10" x2={w / 2} y2={h - 20} stroke="#999" strokeWidth="1" />
      <path d={parabolaPath(option, w, h)} fill="none" stroke="#2d6cdf" strokeWidth="2.5" />
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
