import { useCallback, useMemo, useState } from 'react'
import type { ExpressionEvaluateConfig, SlotWidgetState } from '../../types/lesson'
import { createInitialSlotState } from '../../lib/validation/slots'
import { useTileDrag } from '../../lib/widgets/useTileDrag'
import { DragGhost } from '../StepWidget/DragGhost'
import './ExpressionEvaluate.css'

interface ExpressionEvaluateProps {
  config: ExpressionEvaluateConfig
  state: SlotWidgetState
  onStateChange: (state: SlotWidgetState) => void
  disabled?: boolean
  slotFeedback?: Record<string, boolean> | null
}

export function ExpressionEvaluate({
  config,
  state,
  onStateChange,
  disabled = false,
  slotFeedback,
}: ExpressionEvaluateProps) {
  const [selectedTile, setSelectedTile] = useState<string | null>(null)
  const color = config.visualModel.variableColor ?? '#9b59b6'
  const { variable, variableCount, constantCount } = config.visualModel

  const usedTiles = useMemo(
    () => new Set(Object.values(state.slots).filter(Boolean)),
    [state.slots],
  )

  const placeInSlot = useCallback(
    (slotId: string, tile: string) => {
      const nextSlots = { ...state.slots }
      for (const key of Object.keys(nextSlots)) {
        if (nextSlots[key] === tile) nextSlots[key] = null
      }
      nextSlots[slotId] = tile
      onStateChange({ slots: nextSlots })
      setSelectedTile(null)
    },
    [onStateChange, state.slots],
  )

  const { registerSlot, startDrag, dragTile, pointer, hoverSlot } = useTileDrag({
    onPlace: placeInSlot,
    disabled,
  })

  const handleSlotClick = (slotId: string) => {
    if (disabled) return
    if (selectedTile) {
      placeInSlot(slotId, selectedTile)
      return
    }
    if (state.slots[slotId]) {
      onStateChange({ slots: { ...state.slots, [slotId]: null } })
    }
  }

  const handleStartOver = () => {
    onStateChange(createInitialSlotState(config.slotIds.map((id) => ({ slotId: id }))))
    setSelectedTile(null)
  }

  return (
    <div className="expression-evaluate">
      <div className="tile-model">
        <div className="tile-model-inner">
          <div className="variable-tiles">
            {Array.from({ length: variableCount }).map((_, i) => (
              <div key={i} className="model-bar" style={{ backgroundColor: color }}>
                {variable}
              </div>
            ))}
          </div>
          <div className="constant-tiles">
            {Array.from({ length: constantCount }).map((_, i) => (
              <div key={i} className="model-unit" />
            ))}
          </div>
        </div>
      </div>

      <div className="eval-equation-row">
        {config.slotLabels.map((label, i) => {
          const slotId = config.slotIds[i]
          const value = state.slots[slotId]
          const parts = label.split('□')
          const fb = slotFeedback?.[slotId]
          const fbClass = fb === undefined ? '' : fb ? 'slot-correct' : 'slot-wrong'
          return (
            <span key={slotId} className="eval-label-group">
              {parts[0]}
              <button
                ref={registerSlot(slotId)}
                type="button"
                className={`eval-slot ${value ? 'filled' : ''} ${
                  selectedTile || dragTile ? 'drop-ready' : ''
                } ${hoverSlot === slotId ? 'snap-hover' : ''} ${fbClass}`}
                onClick={() => handleSlotClick(slotId)}
                disabled={disabled}
              >
                {value ?? ''}
              </button>
              {parts[1] ?? ''}
            </span>
          )
        })}
      </div>

      <div className="tile-bank">
        {config.tileBank.map((tile) => {
          const inSlot = usedTiles.has(tile)
          return (
            <button
              key={tile}
              type="button"
              className={`bank-tile ${selectedTile === tile ? 'selected' : ''} ${
                inSlot ? 'used' : ''
              } ${dragTile === tile ? 'dragging' : ''}`}
              disabled={disabled || inSlot}
              onPointerDown={(e) => startDrag(tile, e)}
              onClick={() => setSelectedTile((p) => (p === tile ? null : tile))}
            >
              {tile}
            </button>
          )
        })}
      </div>

      <button type="button" className="start-over" onClick={handleStartOver} disabled={disabled}>
        ↺ Start over
      </button>

      <p className="tile-hint">Drag a number into a box — or tap a number, then tap a box.</p>

      <DragGhost tile={dragTile} pointer={pointer} />
    </div>
  )
}
