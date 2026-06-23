import { logOut } from '../../lib/auth'
import './Header.css'

interface HeaderProps {
  streak: number
  displayName?: string
  onSignOut: () => void
  demoMode?: boolean
}

export function Header({ streak, displayName, onSignOut, demoMode }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">ActiveLearn</div>
      <div className="header-actions">
        {streak > 0 && (
          <span className="streak-badge" title="Daily streak">
            {streak} day streak
          </span>
        )}
        {displayName && <span className="user-name">{displayName}</span>}
        {demoMode && <span className="demo-pill">Demo</span>}
        <button
          type="button"
          className="sign-out"
          onClick={async () => {
            await logOut()
            onSignOut()
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
