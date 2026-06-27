import { useCallback, useMemo, useState } from 'react'
import type { ExpressionBuildConfig, ExpressionBuildState } from '../../types/lesson'
import { createInitialSlotState } from '../../lib/validation/slots'
import { useTileDrag } from '../../lib/widgets/useTileDrag'
import { buildBankTiles, placeValue, usedFlags } from '../../lib/widgets/slotTiles'
import { DragGhost } from '../StepWidget/DragGhost'
import './ExpressionBuild.css'

interface ExpressionBuildProps {
  config: ExpressionBuildConfig
  state: ExpressionBuildState
  onStateChange: (state: ExpressionBuildState) => void
  disabled?: boolean
  slotFeedback?: Record<string, boolean> | null
}

function isVariable(tile: string, config: ExpressionBuildConfig): boolean {
  return tile === config.visualModel.variable || tile === 'a' || tile === 'b'
}

export function ExpressionBuild({
  config,
  state,
  onStateChange,
  disabled = false,
  slotFeedback,
}: ExpressionBuildProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const tiles = useMemo(() => buildBankTiles(config.tileBank), [config.tileBank])
  const used = useMemo(
    () => usedFlags(config.tileBank, state.slots),
    [config.tileBank, state.slots],
  )
  const selectedValue = selectedId
    ? (tiles.find((t) => t.id === selectedId)?.value ?? null)
    : null

  const tileAccepted = useCallback(
    (slotId: string, tile: string) => {
      const slotConfig = config.slots.find((s) => s.slotId === slotId)
      if (!slotConfig?.accept) return true
      const isNum = !Number.isNaN(Number(tile))
      const isVar = isVariable(tile, config)
      return (
        (slotConfig.accept.includes('number') && isNum) ||
        (slotConfig.accept.includes('variable') && isVar)
      )
    },
    [config],
  )

  const placeInSlot = useCallback(
    (slotId: string, value: string) => {
      if (!tileAccepted(slotId, value)) return
      onStateChange({ slots: placeValue(state.slots, slotId, value, config.tileBank) })
      setSelectedId(null)
    },
    [config.tileBank, onStateChange, state.slots, tileAccepted],
  )

  const { registerSlot, startDrag, dragId, dragValue, pointer, hoverSlot } = useTileDrag({
    onPlace: placeInSlot,
    canAccept: tileAccepted,
    disabled,
  })

  const clearSlot = (slotId: string) => {
    if (!state.slots[slotId]) return
    onStateChange({ slots: { ...state.slots, [slotId]: null } })
  }

  const handleSlotClick = (slotId: string) => {
    if (disabled) return
    if (selectedValue) {
      placeInSlot(slotId, selectedValue)
      return
    }
    clearSlot(slotId)
  }

  const handleTileClick = (id: string, isUsed: boolean) => {
    if (disabled || isUsed) return
    setSelectedId((prev) => (prev === id ? null : id))
  }

  const handleStartOver = () => {
    if (disabled) return
    onStateChange(createInitialSlotState(config.slots))
    setSelectedId(null)
  }

  const { variable, variableColor, variableCount, constantCount } = config.visualModel

  return (
    <div className="expression-build">
      <div className="tile-model" aria-hidden="true">
        <div className="tile-model-inner">
          <div className="variable-tiles">
            {Array.from({ length: variableCount }).map((_, i) => (
              <div
                key={`v-${i}`}
                className="model-bar"
                style={{ backgroundColor: variableColor }}
              >
                {variable}
              </div>
            ))}
          </div>
          <div className="constant-tiles">
            {Array.from({ length: constantCount }).map((_, i) => (
              <div key={`c-${i}`} className="model-unit" />
            ))}
          </div>
        </div>
      </div>

      <div className="expression-slots">
        {config.slotLayout.map((key, index) => {
          if (key === '+') {
            return (
              <span key={`op-${index}`} className="slot-operator">
                +
              </span>
            )
          }
          const value = state.slots[key]
          const fb = slotFeedback?.[key]
          const fbClass = fb === undefined ? '' : fb ? 'slot-correct' : 'slot-wrong'
          return (
            <button
              key={key}
              ref={registerSlot(key)}
              type="button"
              className={`expression-slot ${value ? 'filled' : ''} ${
                selectedValue || dragValue ? 'drop-ready' : ''
              } ${hoverSlot === key ? 'snap-hover' : ''} ${fbClass}`}
              onClick={() => handleSlotClick(key)}
              disabled={disabled}
              aria-label={`Slot ${key}${value ? `: ${value}` : ', empty'}`}
            >
              {value ?? ''}
            </button>
          )
        })}
      </div>

      <div className="tile-bank">
        {tiles.map((t, i) => {
          const inSlot = used[i]
          const isVar = isVariable(t.value, config)
          return (
            <button
              key={t.id}
              type="button"
              className={`bank-tile ${isVar ? 'bank-tile-var' : ''} ${
                selectedId === t.id ? 'selected' : ''
              } ${inSlot ? 'used' : ''} ${dragId === t.id ? 'dragging' : ''}`}
              disabled={disabled || inSlot}
              onPointerDown={(e) => startDrag(t.id, t.value, e)}
              onClick={() => handleTileClick(t.id, inSlot)}
              style={
                isVar && t.value === variable
                  ? { borderColor: variableColor, color: variableColor }
                  : undefined
              }
            >
              {t.value}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="start-over"
        onClick={handleStartOver}
        disabled={disabled}
      >
        ↺ Start over
      </button>

      <p className="tile-hint">Drag a tile into a box — or tap a tile, then tap a box.</p>

      <DragGhost
        tile={dragValue}
        pointer={pointer}
        variant={dragValue && isVariable(dragValue, config) ? 'variable' : 'default'}
      />
    </div>
  )
}
