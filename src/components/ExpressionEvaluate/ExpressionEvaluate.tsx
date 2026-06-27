import { useCallback, useMemo, useState } from 'react'
import type { ExpressionEvaluateConfig, SlotWidgetState } from '../../types/lesson'
import { createInitialSlotState } from '../../lib/validation/slots'
import { useTileDrag } from '../../lib/widgets/useTileDrag'
import { buildBankTiles, placeValue, usedFlags } from '../../lib/widgets/slotTiles'
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const color = config.visualModel.variableColor ?? '#9b59b6'
  const { variable, variableCount, constantCount } = config.visualModel

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

  const handleSlotClick = (slotId: string) => {
    if (disabled) return
    if (selectedValue) {
      placeInSlot(slotId, selectedValue)
      return
    }
    if (state.slots[slotId]) {
      onStateChange({ slots: { ...state.slots, [slotId]: null } })
    }
  }

  const handleStartOver = () => {
    onStateChange(createInitialSlotState(config.slotIds.map((id) => ({ slotId: id }))))
    setSelectedId(null)
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
                  selectedValue || dragValue ? 'drop-ready' : ''
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

      <button type="button" className="start-over" onClick={handleStartOver} disabled={disabled}>
        ↺ Start over
      </button>

      <p className="tile-hint">Drag a number into a box — or tap a number, then tap a box.</p>

      <DragGhost tile={dragValue} pointer={pointer} />
    </div>
  )
}
