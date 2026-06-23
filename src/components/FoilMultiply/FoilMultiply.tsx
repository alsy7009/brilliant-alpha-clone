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

const SLOT_TOKEN = /^\{(.+)\}$/

export function FoilMultiply({
  config,
  state,
  onStateChange,
  disabled = false,
}: FoilMultiplyProps) {
  const [selectedTile, setSelectedTile] = useState<string | null>(null)

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
      <p className="foil-factors">{config.factors} =</p>

      <div className="foil-polynomial">
        {config.layout.map((token, index) => {
          const match = token.match(SLOT_TOKEN)
          if (!match) {
            return (
              <span key={`lit-${index}`} className="poly-literal">
                {token}
              </span>
            )
          }
          const slotId = match[1]
          const value = state.slots[slotId]
          return (
            <button
              key={slotId}
              ref={registerSlot(slotId)}
              type="button"
              className={`poly-slot ${value ? 'filled' : ''} ${
                selectedTile || dragTile ? 'drop-ready' : ''
              } ${hoverSlot === slotId ? 'snap-hover' : ''}`}
              onClick={() => handleSlot(slotId)}
              disabled={disabled}
              aria-label={`Coefficient slot ${slotId}${value ? `: ${value}` : ', empty'}`}
            >
              {value ?? '□'}
            </button>
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

      <button type="button" className="start-over" onClick={reset} disabled={disabled}>
        ↺ Start over
      </button>

      <p className="tile-hint">Drag a coefficient into each box — or tap a number, then tap a box.</p>

      <DragGhost tile={dragTile} pointer={pointer} />
    </div>
  )
}
