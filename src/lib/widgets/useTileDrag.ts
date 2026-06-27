import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'

interface UseTileDragOptions {
  /** Place a tile's VALUE into a slot. */
  onPlace: (slotId: string, value: string) => void
  canAccept?: (slotId: string, value: string) => boolean
  disabled?: boolean
  /** Max distance (px) from a slot center to snap into it. */
  snapRadius?: number
}

export interface TileDragApi {
  registerSlot: (slotId: string) => (el: HTMLElement | null) => void
  /** Begin dragging a specific tile instance (id) carrying a value. */
  startDrag: (id: string, value: string, event: PointerEvent) => void
  /** Instance id of the tile being dragged (distinguishes duplicate values). */
  dragId: string | null
  /** Value of the tile being dragged. */
  dragValue: string | null
  pointer: { x: number; y: number } | null
  hoverSlot: string | null
}

export function useTileDrag({
  onPlace,
  canAccept,
  disabled,
  snapRadius = 160,
}: UseTileDragOptions): TileDragApi {
  const slotRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragValue, setDragValue] = useState<string | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [hoverSlot, setHoverSlot] = useState<string | null>(null)

  const registerSlot = useCallback(
    (slotId: string) => (el: HTMLElement | null) => {
      if (el) slotRefs.current.set(slotId, el)
      else slotRefs.current.delete(slotId)
    },
    [],
  )

  const findNearestSlot = useCallback(
    (x: number, y: number, value: string): string | null => {
      let nearest: string | null = null
      let best = Infinity
      for (const [slotId, el] of slotRefs.current.entries()) {
        if (canAccept && !canAccept(slotId, value)) continue
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dist = Math.hypot(x - cx, y - cy)
        if (dist < best) {
          best = dist
          nearest = slotId
        }
      }
      return best <= snapRadius ? nearest : null
    },
    [canAccept, snapRadius],
  )

  const startDrag = useCallback(
    (id: string, value: string, event: PointerEvent) => {
      if (disabled) return
      event.preventDefault()
      setDragId(id)
      setDragValue(value)
      setPointer({ x: event.clientX, y: event.clientY })
    },
    [disabled],
  )

  useEffect(() => {
    if (!dragValue) return

    const handleMove = (event: globalThis.PointerEvent) => {
      setPointer({ x: event.clientX, y: event.clientY })
      setHoverSlot(findNearestSlot(event.clientX, event.clientY, dragValue))
    }

    const handleUp = (event: globalThis.PointerEvent) => {
      const slot = findNearestSlot(event.clientX, event.clientY, dragValue)
      if (slot) onPlace(slot, dragValue)
      setDragId(null)
      setDragValue(null)
      setPointer(null)
      setHoverSlot(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [dragValue, findNearestSlot, onPlace])

  return { registerSlot, startDrag, dragId, dragValue, pointer, hoverSlot }
}
