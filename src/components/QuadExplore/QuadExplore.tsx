import { useId, type ChangeEvent } from 'react'
import type { QuadExploreConfig, QuadExploreState } from '../../types/lesson'
import './QuadExplore.css'

interface QuadExploreProps {
  config: QuadExploreConfig
  state: QuadExploreState
  onStateChange: (state: QuadExploreState) => void
  disabled?: boolean
}

const W = 320
const H = 280
const PAD = 36

function toSvg(x: number, y: number, grid: QuadExploreConfig['grid']) {
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

/** factored form: a(x - b)(x - c) with clean signs */
function factoredLabel(a: number, b: number, c: number): string {
  const aPart = a === 1 ? '' : a === -1 ? '−' : String(a)
  const factor = (r: number) => (r === 0 ? '(x)' : r < 0 ? `(x + ${-r})` : `(x − ${r})`)
  return `y = ${aPart}${factor(b)}${factor(c)}`
}

/** expanded form: a x² + p x + q with clean signs */
function expandedLabel(a: number, b: number, c: number): string {
  const A = a
  const B = -a * (b + c)
  const C = a * b * c

  const x2 = A === 1 ? 'x²' : A === -1 ? '−x²' : `${A}x²`
  const term = (coef: number, suffix: string) => {
    if (coef === 0) return ''
    const sign = coef > 0 ? ' + ' : ' − '
    const mag = Math.abs(coef)
    const num = suffix && mag === 1 ? '' : String(mag)
    return `${sign}${num}${suffix}`
  }
  return `y = ${x2}${term(B, 'x')}${term(C, '')}` || 'y = 0'
}

function parabolaPath(a: number, b: number, c: number, grid: QuadExploreConfig['grid']): string {
  const pts: string[] = []
  let started = false
  for (let x = grid.xMin; x <= grid.xMax + 0.001; x += 0.1) {
    const y = a * (x - b) * (x - c)
    const { sx, sy } = toSvg(x, y, grid)
    pts.push(`${started ? 'L' : 'M'} ${sx.toFixed(1)} ${sy.toFixed(1)}`)
    started = true
  }
  return pts.join(' ')
}

export function QuadExplore({ config, state, onStateChange, disabled = false }: QuadExploreProps) {
  const clipId = useId()
  const { grid } = config
  const { a, b, c } = state
  const origin = toSvg(0, 0, grid)
  const xs = integerRange(grid.xMin, grid.xMax)
  const ys = integerRange(grid.yMin, grid.yMax)

  const setVal = (key: 'a' | 'b' | 'c') => (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    onStateChange({ ...state, [key]: Number(e.target.value) })
  }

  const rootInGrid = (r: number) => r >= grid.xMin && r <= grid.xMax
  const monicLabel = a === 1 ? 'monic' : a === 0 ? 'not a quadratic (a = 0)' : 'non-monic'

  return (
    <div className="quad-explore">
      <svg className="quad-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Quadratic graph">
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
          </clipPath>
        </defs>

        {xs.map((x) => {
          const pt = toSvg(x, 0, grid)
          return <line key={`vx-${x}`} x1={pt.sx} y1={PAD} x2={pt.sx} y2={H - PAD} stroke="#e9edf3" strokeWidth="1" />
        })}
        {ys.map((y) => {
          const pt = toSvg(0, y, grid)
          return <line key={`hy-${y}`} x1={PAD} y1={pt.sy} x2={W - PAD} y2={pt.sy} stroke="#e9edf3" strokeWidth="1" />
        })}

        <line x1={PAD} y1={origin.sy} x2={W - PAD} y2={origin.sy} stroke="#9aa3b0" strokeWidth="1.5" />
        <line x1={origin.sx} y1={PAD} x2={origin.sx} y2={H - PAD} stroke="#9aa3b0" strokeWidth="1.5" />

        {xs.map((x) =>
          x === 0 ? null : (
            <text key={`xl-${x}`} x={toSvg(x, 0, grid).sx} y={origin.sy + 13} className="quad-axis-label" textAnchor="middle">
              {x}
            </text>
          ),
        )}
        {ys.map((y) =>
          y === 0 ? null : (
            <text key={`yl-${y}`} x={origin.sx - 7} y={toSvg(0, y, grid).sy + 3} className="quad-axis-label" textAnchor="end">
              {y}
            </text>
          ),
        )}

        {a !== 0 && (
          <path d={parabolaPath(a, b, c, grid)} fill="none" stroke="#2d6cdf" strokeWidth="3" clipPath={`url(#${clipId})`} />
        )}

        {a !== 0 && rootInGrid(b) && (
          <circle cx={toSvg(b, 0, grid).sx} cy={toSvg(b, 0, grid).sy} r="5" fill="#e74c3c" stroke="#fff" strokeWidth="2" />
        )}
        {a !== 0 && rootInGrid(c) && b !== c && (
          <circle cx={toSvg(c, 0, grid).sx} cy={toSvg(c, 0, grid).sy} r="5" fill="#e74c3c" stroke="#fff" strokeWidth="2" />
        )}
      </svg>

      <div className="quad-readout">
        <div className="quad-formula">{factoredLabel(a, b, c)}</div>
        <div className="quad-formula expanded">{expandedLabel(a, b, c)}</div>
        <div className="quad-tag">{monicLabel}</div>
      </div>

      <div className="quad-sliders">
        {(['a', 'b', 'c'] as const).map((key) => {
          const [min, max] = config[`${key}Range`]
          return (
            <label key={key} className="quad-slider-row">
              <span className="quad-slider-label">
                {key} = <strong>{state[key]}</strong>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={state[key]}
                onChange={setVal(key)}
                disabled={disabled}
                className="quad-slider"
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}
