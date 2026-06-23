import './LevelBadge.css'

interface LevelBadgeProps {
  level: number
  size?: 'sm' | 'md' | 'lg'
}

export function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  return (
    <span className={`level-badge level-badge-${size}`} title={`Level ${level}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="level-badge-star">
        <polygon
          points="20,2 25,14 38,14 27,22 31,36 20,28 9,36 13,22 2,14 15,14"
          fill="url(#lvlgrad)"
          stroke="#fff"
          strokeWidth="1.5"
        />
        <defs>
          <linearGradient id="lvlgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5b9fff" />
            <stop offset="100%" stopColor="#2d6cdf" />
          </linearGradient>
        </defs>
      </svg>
      <span className="level-badge-num">{level}</span>
    </span>
  )
}
