import './StreakFlame.css'

interface StreakFlameProps {
  streak: number
  size?: number
  showCount?: boolean
}

/**
 * Maps a streak count to a warm→hot color pair.
 * 0–2 ember orange, 3–6 deep orange, 7–13 red, 14+ fiery purple.
 */
function flameColors(streak: number): { core: string; outer: string; glow: string } {
  if (streak >= 14) return { core: '#f5a3ff', outer: '#8b2fd6', glow: 'rgba(139,47,214,0.55)' }
  if (streak >= 7) return { core: '#ffd27a', outer: '#e23b3b', glow: 'rgba(226,59,59,0.5)' }
  if (streak >= 3) return { core: '#ffe08a', outer: '#f5762a', glow: 'rgba(245,118,42,0.5)' }
  return { core: '#ffe9a8', outer: '#ff9d2e', glow: 'rgba(255,157,46,0.45)' }
}

export function StreakFlame({ streak, size = 28, showCount = true }: StreakFlameProps) {
  const { core, outer, glow } = flameColors(streak)
  const intensity = Math.min(1, streak / 14)

  return (
    <span className="streak-flame" title={`${streak} day streak`}>
      <span
        className="flame-wrap"
        style={
          {
            width: size,
            height: size,
            '--flame-glow': glow,
            '--flame-intensity': intensity,
          } as React.CSSProperties
        }
      >
        <svg viewBox="0 0 24 28" width={size} height={size} aria-hidden="true" className="flame-svg">
          <path
            className="flame-outer"
            d="M12 0C12 6 4 8 4 16a8 8 0 0 0 16 0c0-3-2-5-3-7-1 2-2 3-4 3 2-4-1-9-1-12z"
            fill={outer}
          />
          <path
            className="flame-core"
            d="M12 10c0 3-3 4-3 7a3 3 0 0 0 6 0c0-2-2-3-3-7z"
            fill={core}
          />
        </svg>
      </span>
      {showCount && <span className="flame-count">{streak}</span>}
    </span>
  )
}
