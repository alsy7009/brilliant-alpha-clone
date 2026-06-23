import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'

interface UseTileDragOptions {
  onPlace: (slotId: string, tile: string) => void
  canAccept?: (slotId: string, tile: string) => boolean
  disabled?: boolean
  /** Max distance (px) from a slot center to snap into it. */
  snapRadius?: number
}

export interface TileDragApi {
  registerSlot: (slotId: string) => (el: HTMLElement | null) => void
  startDrag: (tile: string, event: PointerEvent) => void
  dragTile: string | null
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
  const [dragTile, setDragTile] = useState<string | null>(null)
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
    (x: number, y: number, tile: string): string | null => {
      let nearest: string | null = null
      let best = Infinity
      for (const [slotId, el] of slotRefs.current.entries()) {
        if (canAccept && !canAccept(slotId, tile)) continue
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
    (tile: string, event: PointerEvent) => {
      if (disabled) return
      event.preventDefault()
      setDragTile(tile)
      setPointer({ x: event.clientX, y: event.clientY })
    },
    [disabled],
  )

  useEffect(() => {
    if (!dragTile) return

    const handleMove = (event: globalThis.PointerEvent) => {
      setPointer({ x: event.clientX, y: event.clientY })
      setHoverSlot(findNearestSlot(event.clientX, event.clientY, dragTile))
    }

    const handleUp = (event: globalThis.PointerEvent) => {
      const slot = findNearestSlot(event.clientX, event.clientY, dragTile)
      if (slot) onPlace(slot, dragTile)
      setDragTile(null)
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
  }, [dragTile, findNearestSlot, onPlace])

  return { registerSlot, startDrag, dragTile, pointer, hoverSlot }
}
