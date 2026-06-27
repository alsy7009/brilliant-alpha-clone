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

/**
 * True physical weights of each pan. The variable X "weighs" the equation's solution,
 * so a valid equation (e.g. X+3 = 7, or the solved X = 4) is genuinely balanced (level).
 */
function sideWeights(
  state: ScaleBalanceState,
  config: ScaleBalanceConfig,
): { left: number; right: number } {
  const startConstant = Number(config.equationLeft.match(/\+\s*(\d+)/)?.[1] ?? 0)
  const startRight = Number(config.equationRight.replace(/[^\d]/g, '')) || 0
  const solution = startRight - startConstant

  const hasVariable = /[a-z]/i.test(state.leftExpression)
  const leftConstant = Number(state.leftExpression.match(/\+\s*(\d+)/)?.[1] ?? 0)
  const left = (hasVariable ? solution : 0) + leftConstant
  const right = Number(state.rightExpression.replace(/[^\d]/g, '')) || 0
  return { left, right }
}

export function EquationScale({
  config,
  state,
  onStateChange,
  disabled = false,
}: EquationScaleProps) {
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const dragOffset = useRef(0)
  const constant = config.equationLeft.match(/\+\s*(\d+)/)?.[1] ?? '3'
  const weights = sideWeights(state, config)
  const balanced = weights.left === weights.right
  const angle = Math.max(-18, Math.min(18, (weights.left - weights.right) * 4))

  const applySubtract = useCallback(() => {
    if (disabled || leaving) return
    // Let the subtracted blocks fly off, then commit the new state.
    setLeaving(true)
    window.setTimeout(() => {
      onStateChange(subtractConstantFromBothSides(state, config))
      setLeaving(false)
    }, 450)
  }, [config, disabled, leaving, onStateChange, state])

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

  const hasVariable = /[a-z]/i.test(state.leftExpression)
  const leftConstant = Number(state.leftExpression.match(/\+\s*(\d+)/)?.[1] ?? 0)
  const rightValue = Number(state.rightExpression.replace(/[^\d]/g, '')) || 0
  const variable = config.targetVariable
  const solved = leftConstant === 0

  // Lay out `count` unit blocks in a bottom-up grid sitting on a pan tray.
  // Blocks at index >= leavingFrom animate off the pan in `leaveDir`.
  const unitBlocks = (
    count: number,
    fill: string,
    cols: number,
    leavingFrom = Infinity,
    leaveDir: 'left' | 'right' = 'right',
  ) => {
    const U = 13
    const P = 16
    return Array.from({ length: Math.max(0, count) }).map((_, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const isLeaving = i >= leavingFrom
      return (
        <rect
          key={i}
          x={col * P}
          y={-(row + 1) * P}
          width={U}
          height={U}
          rx={2}
          fill={fill}
          className={isLeaving ? `unit-leaving unit-leaving-${leaveDir}` : ''}
          style={isLeaving ? { animationDelay: `${(i - leavingFrom) * 45}ms` } : undefined}
        />
      )
    })
  }

  return (
    <div className="equation-scale">
      <div className="equation-labels">
        <span className="equation-chip">{state.leftExpression}</span>
        <span className="equation-equals">=</span>
        <span className="equation-chip">{state.rightExpression}</span>
      </div>

      <span className={`balance-badge ${balanced ? 'is-balanced' : 'is-tilted'}`}>
        {balanced ? '⚖ Balanced!' : '⚠ Not balanced'}
      </span>

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
          <rect x="40" y="162" width="320" height="10" fill={balanced ? '#62d321' : '#8b7355'} rx="5" />
          <line x1="80" y1="172" x2="80" y2="210" stroke="#6b5a47" strokeWidth="3" />
          <line x1="320" y1="172" x2="320" y2="210" stroke="#6b5a47" strokeWidth="3" />

          <g transform="translate(45, 185)">
            <path d="M0,30 L70,30 L35,0 Z" fill="#4a90d9" opacity="0.35" />
            <rect x="5" y="30" width="60" height="8" fill="#4a90d9" />
            <text x="35" y="52" textAnchor="middle" className="pan-label">
              {state.leftExpression}
            </text>

            {hasVariable && (
              <g transform="translate(6, 30)">
                <rect x="0" y="-16" width="13" height="13" rx="2" fill="#7ed321" />
                <text x="6.5" y="-5.5" textAnchor="middle" className="unit-var-text">
                  {variable}
                </text>
              </g>
            )}

            {leftConstant > 0 && (
              <g
                className={`term-block ${dragging ? 'dragging' : ''}`}
                transform="translate(28, 30)"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: disabled ? 'default' : 'grab' }}
              >
                {unitBlocks(leftConstant, '#f5a623', 3, leaving ? 0 : Infinity, 'left')}
              </g>
            )}
          </g>

          <g transform="translate(255, 185)">
            <path d="M0,30 L70,30 L35,0 Z" fill="#4a90d9" opacity="0.35" />
            <rect x="5" y="30" width="60" height="8" fill="#4a90d9" />
            <text x="35" y="52" textAnchor="middle" className="pan-label">
              {state.rightExpression}
            </text>
            <g transform="translate(6, 30)">
              {unitBlocks(
                rightValue,
                '#bd10e0',
                4,
                leaving ? rightValue - leftConstant : Infinity,
                'right',
              )}
            </g>
          </g>
        </g>
      </svg>

      {!solved && (
        <>
          <button
            type="button"
            className="op-button"
            onClick={applySubtract}
            disabled={disabled || leaving}
          >
            Subtract {constant} from both sides
          </button>
          <p className="scale-hint">
            Drag the {leftConstant} orange unit block{leftConstant === 1 ? '' : 's'} off the left
            pan, or tap the button above.
          </p>
        </>
      )}
      {solved && (
        <p className="scale-hint">
          The {variable} block balances {rightValue} units — so {variable} = {rightValue}!
        </p>
      )}
    </div>
  )
}
