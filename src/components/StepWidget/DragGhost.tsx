import './DragGhost.css'

interface DragGhostProps {
  tile: string | null
  pointer: { x: number; y: number } | null
  variant?: 'default' | 'variable'
}

export function DragGhost({ tile, pointer, variant = 'default' }: DragGhostProps) {
  if (!tile || !pointer) return null
  return (
    <div
      className={`drag-ghost ${variant === 'variable' ? 'drag-ghost-var' : ''}`}
      style={{ left: pointer.x, top: pointer.y }}
      aria-hidden="true"
    >
      {tile}
    </div>
  )
}
