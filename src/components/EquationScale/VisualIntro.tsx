import type { VisualIntroConfig, VisualIntroState } from '../../types/lesson'
import './VisualIntro.css'

interface VisualIntroProps {
  config: VisualIntroConfig
  state: VisualIntroState
  onStateChange: (state: VisualIntroState) => void
  disabled?: boolean
}

function tiltFromWeights(left: number, right: number): number {
  const diff = left - right
  return Math.max(-20, Math.min(20, diff * 5))
}

export function VisualIntro({
  config,
  state,
  onStateChange,
  disabled = false,
}: VisualIntroProps) {
  const angle = tiltFromWeights(state.leftWeight, state.rightWeight)

  const adjust = (side: 'left' | 'right', delta: number) => {
    if (disabled || !config.isInteractive) return
    onStateChange({
      leftWeight: side === 'left' ? state.leftWeight + delta : state.leftWeight,
      rightWeight: side === 'right' ? state.rightWeight + delta : state.rightWeight,
    })
  }

  return (
    <div className="visual-intro">
      <div className="weight-controls">
        <div className="weight-side">
          <span>Left: {state.leftWeight}</span>
          <div className="weight-buttons">
            <button type="button" onClick={() => adjust('left', -1)} disabled={disabled}>−</button>
            <button type="button" onClick={() => adjust('left', 1)} disabled={disabled}>+</button>
          </div>
        </div>
        <div className="weight-side">
          <span>Right: {state.rightWeight}</span>
          <div className="weight-buttons">
            <button type="button" onClick={() => adjust('right', -1)} disabled={disabled}>−</button>
            <button type="button" onClick={() => adjust('right', 1)} disabled={disabled}>+</button>
          </div>
        </div>
      </div>

      <svg className="intro-scale-svg" viewBox="0 0 400 240" aria-hidden="true">
        <rect x="185" y="20" width="30" height="120" fill="#5c4d3c" rx="4" />
        <polygon points="120,140 280,140 200,170" fill="#6b5a47" />
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: '200px 140px',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <rect x="40" y="132" width="320" height="10" fill="#8b7355" rx="5" />
          <g transform="translate(55, 145)">
            {Array.from({ length: state.leftWeight }).map((_, i) => (
              <rect
                key={`l-${i}`}
                x={i * 14}
                y={30 - i * 8}
                width="12"
                height="12"
                rx="2"
                fill="#f5a623"
              />
            ))}
          </g>
          <g transform="translate(255, 145)">
            {Array.from({ length: state.rightWeight }).map((_, i) => (
              <rect
                key={`r-${i}`}
                x={i * 14}
                y={30 - i * 8}
                width="12"
                height="12"
                rx="2"
                fill="#bd10e0"
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  )
}
