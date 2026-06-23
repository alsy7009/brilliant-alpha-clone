import { useCallback, useMemo, useState } from 'react'
import type { FoilMultiplyConfig, SlotWidgetState } from '../../types/lesson'
import { createInitialSlotState } from '../../lib/validation/slots'
import { useTileDrag } from '../../lib/widgets/useTileDrag'
import { DragGhost } from '../StepWidget/DragGhost'
import './FoilMultiply.css'

interface FoilMultiplyProps {
  config: FoilMultiplyConfig
  state: SlotWidgetState
  onStateChange: (state: SlotWidgetState) => void
  disabled?: boolean
}

export function FoilMultiply({
  config,
  state,
  onStateChange,
  disabled = false,
}: FoilMultiplyProps) {
  const [selectedTile, setSelectedTile] = useState<string | null>(null)
  const [slotA, slotB] = config.slotIds

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

  const handleSlot = (slotId: string) => {
    if (disabled) return
    if (selectedTile) {
      placeInSlot(slotId, selectedTile)
      return
    }
    if (state.slots[slotId]) {
      onStateChange({ slots: { ...state.slots, [slotId]: null } })
    }
  }

  const reset = () => {
    onStateChange(createInitialSlotState(config.slotIds.map((id) => ({ slotId: id }))))
    setSelectedTile(null)
  }

  return (
    <div className="foil-multiply">
      <div className="foil-template">
        <span>(x +</span>
        <button
          ref={registerSlot(slotA)}
          type="button"
          className={`foil-slot ${state.slots[slotA] ? 'filled' : ''} ${
            selectedTile || dragTile ? 'drop-ready' : ''
          } ${hoverSlot === slotA ? 'snap-hover' : ''}`}
          onClick={() => handleSlot(slotA)}
          disabled={disabled}
        >
          {state.slots[slotA] ?? '□'}
        </button>
        <span>)(x +</span>
        <button
          ref={registerSlot(slotB)}
          type="button"
          className={`foil-slot ${state.slots[slotB] ? 'filled' : ''} ${
            selectedTile || dragTile ? 'drop-ready' : ''
          } ${hoverSlot === slotB ? 'snap-hover' : ''}`}
          onClick={() => handleSlot(slotB)}
          disabled={disabled}
        >
          {state.slots[slotB] ?? '□'}
        </button>
        <span>)</span>
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

      <button type="button" className="start-over" onClick={reset} disabled={disabled}>
        ↺ Start over
      </button>

      <p className="tile-hint">Drag a number into a box — or tap a number, then tap a box.</p>

      <DragGhost tile={dragTile} pointer={pointer} />
    </div>
  )
}
