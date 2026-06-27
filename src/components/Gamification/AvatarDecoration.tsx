import type { ReactNode } from 'react'
import type { Decoration } from '../../lib/gamification'
import './AvatarDecoration.css'

interface AvatarDecorationProps {
  name?: string
  photoURL?: string
  variant: Decoration['variant']
  size?: number
  /** Custom face content (e.g. a designed SVG character). Overrides photo/default. */
  face?: ReactNode
}

function DefaultTankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="avatar-default-icon" aria-hidden="true">
      <rect x="3" y="13" width="15" height="4" rx="2" fill="#9aa3b0" />
      <circle cx="6" cy="15" r="1.4" fill="#5a6470" />
      <circle cx="9.5" cy="15" r="1.4" fill="#5a6470" />
      <circle cx="13" cy="15" r="1.4" fill="#5a6470" />
      <path d="M5 13 L7 9 L15 9 L16.5 13 Z" fill="#c2c9d6" />
      <rect x="9" y="6" width="6" height="4" rx="1" fill="#c2c9d6" />
      <rect x="14" y="7" width="8" height="2" rx="1" fill="#9aa3b0" />
    </svg>
  )
}

export function AvatarDecoration({
  name,
  photoURL,
  variant,
  size = 96,
  face,
}: AvatarDecorationProps) {
  return (
    <div
      className={`avatar-deco avatar-deco-${variant}`}
      style={{ width: size, height: size }}
    >
      {/* decoration layers sit absolutely around the avatar */}
      {variant === 'neon-ring' && <span className="deco-layer deco-neon-ring" aria-hidden="true" />}
      {variant === 'cyber-frame' && (
        <>
          <span className="deco-layer deco-cyber-corner tl" aria-hidden="true" />
          <span className="deco-layer deco-cyber-corner tr" aria-hidden="true" />
          <span className="deco-layer deco-cyber-corner bl" aria-hidden="true" />
          <span className="deco-layer deco-cyber-corner br" aria-hidden="true" />
        </>
      )}
      {variant === 'golden-crown' && (
        <span className="deco-layer deco-crown" aria-hidden="true">
          <svg viewBox="0 0 48 32" width={size * 0.5} height={size * 0.33}>
            <path
              d="M4 28 L4 10 L14 18 L24 4 L34 18 L44 10 L44 28 Z"
              fill="url(#crowngrad)"
              stroke="#b8860b"
              strokeWidth="1.5"
            />
            <circle cx="24" cy="6" r="2.5" fill="#fff3b0" />
            <defs>
              <linearGradient id="crowngrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffe98a" />
                <stop offset="100%" stopColor="#f0b520" />
              </linearGradient>
            </defs>
          </svg>
        </span>
      )}

      <div className={`avatar-core ${face || photoURL ? '' : 'avatar-core-empty'}`}>
        {face ? (
          face
        ) : photoURL ? (
          <img src={photoURL} alt={name ?? 'avatar'} className="avatar-img" />
        ) : (
          <DefaultTankIcon />
        )}
      </div>
    </div>
  )
}
