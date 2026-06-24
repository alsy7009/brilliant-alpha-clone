import { useCallback, useMemo, useState } from 'react'
import type { ExpressionBuildConfig, ExpressionBuildState } from '../../types/lesson'
import { createInitialSlotState } from '../../lib/validation/slots'
import { useTileDrag } from '../../lib/widgets/useTileDrag'
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
  const [selectedTile, setSelectedTile] = useState<string | null>(null)

  const usedTiles = useMemo(
    () => new Set(Object.values(state.slots).filter(Boolean)),
    [state.slots],
  )

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
    (slotId: string, tile: string) => {
      if (!tileAccepted(slotId, tile)) return
      const nextSlots = { ...state.slots }
      // remove the tile from any slot it already occupies (move, not duplicate)
      for (const key of Object.keys(nextSlots)) {
        if (nextSlots[key] === tile) nextSlots[key] = null
      }
      nextSlots[slotId] = tile
      onStateChange({ slots: nextSlots })
      setSelectedTile(null)
    },
    [onStateChange, state.slots, tileAccepted],
  )

  const { registerSlot, startDrag, dragTile, pointer, hoverSlot } = useTileDrag({
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
    if (selectedTile) {
      placeInSlot(slotId, selectedTile)
      return
    }
    clearSlot(slotId)
  }

  const handleTileClick = (tile: string) => {
    if (disabled || usedTiles.has(tile)) return
    setSelectedTile((prev) => (prev === tile ? null : tile))
  }

  const handleStartOver = () => {
    if (disabled) return
    onStateChange(createInitialSlotState(config.slots))
    setSelectedTile(null)
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
                selectedTile || dragTile ? 'drop-ready' : ''
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
        {config.tileBank.map((tile) => {
          const inSlot = usedTiles.has(tile)
          const isVar = isVariable(tile, config)
          return (
            <button
              key={tile}
              type="button"
              className={`bank-tile ${isVar ? 'bank-tile-var' : ''} ${
                selectedTile === tile ? 'selected' : ''
              } ${inSlot ? 'used' : ''} ${dragTile === tile ? 'dragging' : ''}`}
              disabled={disabled || inSlot}
              onPointerDown={(e) => startDrag(tile, e)}
              onClick={() => handleTileClick(tile)}
              style={
                isVar && tile === variable
                  ? { borderColor: variableColor, color: variableColor }
                  : undefined
              }
            >
              {tile}
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
        tile={dragTile}
        pointer={pointer}
        variant={dragTile && isVariable(dragTile, config) ? 'variable' : 'default'}
      />
    </div>
  )
}
