import { useCallback, useMemo, useState } from 'react'
import type { FoilMultiplyConfig, SlotWidgetState } from '../../types/lesson'
import { createInitialSlotState } from '../../lib/validation/slots'
import { useTileDrag } from '../../lib/widgets/useTileDrag'
import { buildBankTiles, placeValue, usedFlags } from '../../lib/widgets/slotTiles'
import { DragGhost } from '../StepWidget/DragGhost'
import './FoilMultiply.css'

interface FoilMultiplyProps {
  config: FoilMultiplyConfig
  state: SlotWidgetState
  onStateChange: (state: SlotWidgetState) => void
  disabled?: boolean
  slotFeedback?: Record<string, boolean> | null
}

const SLOT_TOKEN = /^\{(.+)\}$/

export function FoilMultiply({
  config,
  state,
  onStateChange,
  disabled = false,
  slotFeedback,
}: FoilMultiplyProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const tiles = useMemo(() => buildBankTiles(config.tileBank), [config.tileBank])
  const used = useMemo(
    () => usedFlags(config.tileBank, state.slots),
    [config.tileBank, state.slots],
  )
  const selectedValue = selectedId
    ? (tiles.find((t) => t.id === selectedId)?.value ?? null)
    : null

  const placeInSlot = useCallback(
    (slotId: string, value: string) => {
      onStateChange({ slots: placeValue(state.slots, slotId, value, config.tileBank) })
      setSelectedId(null)
    },
    [config.tileBank, onStateChange, state.slots],
  )

  const { registerSlot, startDrag, dragId, dragValue, pointer, hoverSlot } = useTileDrag({
    onPlace: placeInSlot,
    disabled,
  })

  const handleSlot = (slotId: string) => {
    if (disabled) return
    if (selectedValue) {
      placeInSlot(slotId, selectedValue)
      return
    }
    if (state.slots[slotId]) {
      onStateChange({ slots: { ...state.slots, [slotId]: null } })
    }
  }

  const reset = () => {
    onStateChange(createInitialSlotState(config.slotIds.map((id) => ({ slotId: id }))))
    setSelectedId(null)
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
          const fb = slotFeedback?.[slotId]
          const fbClass = fb === undefined ? '' : fb ? 'slot-correct' : 'slot-wrong'
          return (
            <button
              key={slotId}
              ref={registerSlot(slotId)}
              type="button"
              className={`poly-slot ${value ? 'filled' : ''} ${
                selectedValue || dragValue ? 'drop-ready' : ''
              } ${hoverSlot === slotId ? 'snap-hover' : ''} ${fbClass}`}
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
        {tiles.map((t, i) => {
          const inSlot = used[i]
          return (
            <button
              key={t.id}
              type="button"
              className={`bank-tile ${selectedId === t.id ? 'selected' : ''} ${
                inSlot ? 'used' : ''
              } ${dragId === t.id ? 'dragging' : ''}`}
              disabled={disabled || inSlot}
              onPointerDown={(e) => startDrag(t.id, t.value, e)}
              onClick={() => {
                if (inSlot) return
                setSelectedId((p) => (p === t.id ? null : t.id))
              }}
            >
              {t.value}
            </button>
          )
        })}
      </div>

      <button type="button" className="start-over" onClick={reset} disabled={disabled}>
        ↺ Start over
      </button>

      <p className="tile-hint">Drag a coefficient into each box — or tap a number, then tap a box.</p>

      <DragGhost tile={dragValue} pointer={pointer} />
    </div>
  )
}
