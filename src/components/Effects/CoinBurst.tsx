import { useMemo } from 'react'
import './Effects.css'

const COLORS = ['#ffd23f', '#ff7a18', '#62d321', '#2bd9d2', '#b15bff', '#2f6bff']

interface CoinBurstProps {
  /** Increment this to re-fire the burst. 0 = nothing. */
  fireKey: number
}

export function CoinBurst({ fireKey }: CoinBurstProps) {
  const pieces = useMemo(() => {
    if (fireKey === 0) return []
    return Array.from({ length: 20 }).map((_, i) => {
      const angle = (Math.PI * (i / 20)) * 2
      const dist = 70 + Math.random() * 90
      return {
        id: i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 30, // bias upward
        rot: (Math.random() * 720 - 360).toFixed(0),
        delay: (Math.random() * 0.08).toFixed(2),
        color: COLORS[i % COLORS.length],
        coin: i % 3 === 0,
      }
    })
  }, [fireKey])

  if (fireKey === 0) return null

  return (
    <div className="coin-burst" key={fireKey} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={p.coin ? 'burst-coin' : 'burst-confetti'}
          style={
            {
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--rot': `${p.rot}deg`,
              '--delay': `${p.delay}s`,
              background: p.coin ? undefined : p.color,
            } as React.CSSProperties
          }
        >
          {p.coin ? '★' : ''}
        </span>
      ))}
    </div>
  )
}
