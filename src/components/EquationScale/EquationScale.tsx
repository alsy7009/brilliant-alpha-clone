import { useCallback, useRef, useState, type PointerEvent } from 'react'
import type { ScaleBalanceConfig, ScaleBalanceState } from '../../types/lesson'
import { subtractConstantFromBothSides } from '../../lib/validation/scaleBalance'
import './EquationScale.css'

interface EquationScaleProps {
  config: ScaleBalanceConfig
  state: ScaleBalanceState
  onStateChange: (state: ScaleBalanceState) => void
  disabled?: boolean
}

function tiltAngle(left: string, right: string): number {
  const leftNum = left.includes('+')
    ? Number(left.match(/\+(\d+)/)?.[1] ?? 0) + 1
    : left === 'X'
      ? 1
      : 2
  const rightNum = Number(right.replace(/[^\d]/g, '')) || 1
  const diff = leftNum - rightNum
  return Math.max(-18, Math.min(18, diff * 4))
}

export function EquationScale({
  config,
  state,
  onStateChange,
  disabled = false,
}: EquationScaleProps) {
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef(0)
  const constant = config.equationLeft.match(/\+\s*(\d+)/)?.[1] ?? '3'
  const angle = tiltAngle(state.leftExpression, state.rightExpression)

  const applySubtract = useCallback(() => {
    if (disabled) return
    onStateChange(subtractConstantFromBothSides(state, config))
  }, [config, disabled, onStateChange, state])

  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    if (disabled) return
    setDragging(true)
    dragOffset.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<SVGGElement>) => {
    if (!dragging || disabled) return
    const delta = event.clientX - dragOffset.current
    if (delta > 80) {
      applySubtract()
      setDragging(false)
    }
  }

  const onPointerUp = () => setDragging(false)

  const showConstantOnLeft = state.leftExpression.includes(`+ ${constant}`) ||
    state.leftExpression.includes(`+${constant}`)

  return (
    <div className="equation-scale">
      <div className="equation-labels">
        <span className="equation-chip">{state.leftExpression}</span>
        <span className="equation-equals">=</span>
        <span className="equation-chip">{state.rightExpression}</span>
      </div>

      <svg
        className="scale-svg"
        viewBox="0 0 400 260"
        role="img"
        aria-label="Balance scale for equation"
      >
        <rect x="185" y="30" width="30" height="140" fill="#5c4d3c" rx="4" />
        <polygon points="120,170 280,170 200,200" fill="#6b5a47" />

        <g
          className="scale-beam"
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: '200px 170px',
            transition: dragging ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          <rect x="40" y="162" width="320" height="10" fill="#8b7355" rx="5" />
          <line x1="80" y1="172" x2="80" y2="210" stroke="#6b5a47" strokeWidth="3" />
          <line x1="320" y1="172" x2="320" y2="210" stroke="#6b5a47" strokeWidth="3" />

          <g transform="translate(50, 185)">
            <path d="M0,30 L60,30 L30,0 Z" fill="#4a90d9" opacity="0.35" />
            <rect x="5" y="30" width="50" height="8" fill="#4a90d9" />
            <text x="30" y="52" textAnchor="middle" className="pan-label">
              {state.leftExpression}
            </text>
            {showConstantOnLeft && (
              <g
                className={`term-block ${dragging ? 'dragging' : ''}`}
                transform={`translate(14, 8)`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: disabled ? 'default' : 'grab' }}
              >
                <rect width="32" height="24" rx="6" fill="#f5a623" />
                <text x="16" y="17" textAnchor="middle" className="block-text">
                  +{constant}
                </text>
              </g>
            )}
            {!showConstantOnLeft && (
              <g transform="translate(14, 8)">
                <rect width="32" height="24" rx="6" fill="#7ed321" />
                <text x="16" y="17" textAnchor="middle" className="block-text">
                  X
                </text>
              </g>
            )}
          </g>

          <g transform="translate(270, 185)">
            <path d="M0,30 L60,30 L30,0 Z" fill="#4a90d9" opacity="0.35" />
            <rect x="5" y="30" width="50" height="8" fill="#4a90d9" />
            <text x="30" y="52" textAnchor="middle" className="pan-label">
              {state.rightExpression}
            </text>
            <g transform="translate(14, 8)">
              <rect width="32" height="24" rx="6" fill="#bd10e0" />
              <text x="16" y="17" textAnchor="middle" className="block-text">
                {state.rightExpression.replace(/[^\d]/g, '') || '?'}
              </text>
            </g>
          </g>
        </g>
      </svg>

      <button
        type="button"
        className="op-button"
        onClick={applySubtract}
        disabled={disabled}
      >
        Subtract {constant} from both sides
      </button>
      <p className="scale-hint">Drag the +{constant} block right, or tap the button above.</p>
    </div>
  )
}
