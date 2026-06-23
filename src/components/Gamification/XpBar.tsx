import './XpBar.css'

interface XpBarProps {
  level: number
  xpIntoLevel: number
  xpForNext: number
  compact?: boolean
}

export function XpBar({ level, xpIntoLevel, xpForNext, compact = false }: XpBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100)))
  return (
    <div className={`xp-bar ${compact ? 'xp-bar-compact' : ''}`}>
      {!compact && (
        <div className="xp-bar-labels">
          <span>Level {level}</span>
          <span className="xp-bar-count">
            {xpIntoLevel} / {xpForNext} XP to Level {level + 1}
          </span>
        </div>
      )}
      <div className="xp-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="xp-bar-fill" style={{ width: `${pct}%` }}>
          <span className="xp-bar-shine" />
        </div>
      </div>
    </div>
  )
}
