import { useMemo } from 'react'
import './Effects.css'

const COLORS = ['#ffd23f', '#ff7a18', '#62d321', '#2bd9d2', '#b15bff', '#2f6bff']

interface TrophyOverlayProps {
  title?: string
  subtitle?: string
  claimLabel?: string
  onClaim: () => void
}

export function TrophyOverlay({
  title = 'MISSION CLEARED!',
  subtitle = 'Trophy earned ★',
  claimLabel = 'Claim win',
  onClaim,
}: TrophyOverlayProps) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / 28
        const dist = 90 + Math.random() * 90
        return {
          id: i,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist,
          rot: (Math.random() * 720 - 360).toFixed(0),
          delay: (Math.random() * 0.12).toFixed(2),
          color: COLORS[i % COLORS.length],
        }
      }),
    [],
  )

  return (
    <div className="trophy-overlay" role="dialog" aria-modal="true" aria-label="Mission cleared">
      <div className="trophy-modal">
        <div className="trophy-burst" aria-hidden="true">
          {confetti.map((c) => (
            <span
              key={c.id}
              className="trophy-confetti"
              style={
                {
                  '--tx': `${c.tx}px`,
                  '--ty': `${c.ty}px`,
                  '--rot': `${c.rot}deg`,
                  '--delay': `${c.delay}s`,
                  background: c.color,
                } as React.CSSProperties
              }
            />
          ))}
          <div className="trophy-icon-pop">
            <svg viewBox="0 0 64 64" width="96" height="96" aria-hidden="true">
              <path d="M16 8h32v6c0 10-7 16-16 16S16 24 16 14z" fill="url(#tg)" stroke="#7a5b00" strokeWidth="2" />
              <path d="M16 10H8v4c0 6 4 9 9 9" fill="none" stroke="#7a5b00" strokeWidth="3" />
              <path d="M48 10h8v4c0 6-4 9-9 9" fill="none" stroke="#7a5b00" strokeWidth="3" />
              <rect x="28" y="30" width="8" height="10" fill="#caa400" />
              <rect x="20" y="40" width="24" height="6" rx="1" fill="#e0b800" stroke="#7a5b00" strokeWidth="2" />
              <rect x="24" y="46" width="16" height="8" rx="1" fill="#e0b800" stroke="#7a5b00" strokeWidth="2" />
              <text x="32" y="22" textAnchor="middle" className="trophy-star">★</text>
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffe98a" />
                  <stop offset="100%" stopColor="#f0b520" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h2 className="trophy-title">{title}</h2>
        <p className="trophy-sub">{subtitle}</p>

        <button type="button" className="trophy-claim" onClick={onClaim}>
          {claimLabel}
        </button>
      </div>
    </div>
  )
}
