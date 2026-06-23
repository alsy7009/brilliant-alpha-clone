import type { Decoration } from '../../lib/gamification'
import './AvatarDecoration.css'

interface AvatarDecorationProps {
  name?: string
  photoURL?: string
  variant: Decoration['variant']
  size?: number
}

function DefaultPersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="avatar-default-icon" aria-hidden="true">
      <circle cx="12" cy="8.5" r="4" fill="#c2c9d6" />
      <path d="M3.5 21c0-4.4 4-7 8.5-7s8.5 2.6 8.5 7z" fill="#c2c9d6" />
    </svg>
  )
}

export function AvatarDecoration({
  name,
  photoURL,
  variant,
  size = 96,
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

      <div className={`avatar-core ${photoURL ? '' : 'avatar-core-empty'}`}>
        {photoURL ? (
          <img src={photoURL} alt={name ?? 'avatar'} className="avatar-img" />
        ) : (
          <DefaultPersonIcon />
        )}
      </div>
    </div>
  )
}
