import type { ReactNode } from 'react'
import { useGamification, getDecoration } from '../../context/GamificationContext'
import { AvatarDecoration } from '../Gamification/AvatarDecoration'
import { LevelBadge } from '../Gamification/LevelBadge'
import { StreakFlame } from '../Gamification/StreakFlame'
import { XpBar } from '../Gamification/XpBar'
import './MainLayout.css'

export type NavKey = 'dashboard' | 'friends' | 'profile'

interface MainLayoutProps {
  active: NavKey
  onNavigate: (key: NavKey) => void
  displayName?: string
  photoURL?: string
  demoMode?: boolean
  onSignOut: () => void
  children: ReactNode
  /** Hide chrome (e.g. during an immersive lesson) but keep the layout grid. */
  immersive?: boolean
}

const NAV_ITEMS: { key: NavKey; label: string; icon: ReactNode }[] = [
  {
    key: 'dashboard',
    label: 'Missions',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: 'friends',
    label: 'Friends',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 5.5a3.5 3.5 0 0 1 0 6.8M17.5 14.5c2.8.4 4.5 2.3 4.5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M4 21c0-4 4-6 8-6s8 2 8 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export function MainLayout({
  active,
  onNavigate,
  displayName,
  photoURL,
  demoMode,
  onSignOut,
  children,
  immersive = false,
}: MainLayoutProps) {
  const { level, xpIntoLevel, xpForNext, streak, equippedId } = useGamification()
  const decoration = getDecoration(equippedId)

  return (
    <div className="main-layout">
      {/* Desktop sidebar */}
      <aside className="ml-sidebar">
        <div className="ml-brand">ALGEBRA QUEST</div>

        <div className="ml-profile-mini">
          <AvatarDecoration
            name={displayName}
            photoURL={photoURL}
            variant={decoration.variant}
            size={72}
          />
          <div className="ml-profile-meta">
            <span className="ml-name">{displayName ?? 'Learner'}</span>
            <span className="ml-level-row">
              <LevelBadge level={level} size="sm" />
              <span className="ml-level-text">LVL {level}</span>
            </span>
          </div>
        </div>

        <div className="ml-xp">
          <XpBar
            level={level}
            xpIntoLevel={xpIntoLevel}
            xpForNext={xpForNext}
            showLevel={false}
          />
        </div>

        <div className="ml-streak-row">
          <StreakFlame streak={streak} size={26} />
          <span className="ml-streak-label">day streak {streak > 0 ? '— on fire!' : ''}</span>
        </div>

        <nav className="ml-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`ml-nav-item ${active === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="ml-signout" onClick={onSignOut}>
          {demoMode ? 'Quit demo' : 'Log out'}
        </button>
      </aside>

      {/* Mobile minimized header */}
      <header className="ml-mobile-header">
        <span className="ml-mobile-brand">ALGEBRA QUEST</span>
        <div className="ml-mobile-stats">
          <StreakFlame streak={streak} size={24} />
          <LevelBadge level={level} size="sm" />
        </div>
      </header>

      <main className={`ml-content ${immersive ? 'immersive' : ''}`}>{children}</main>

      {/* Mobile bottom nav */}
      <nav className="ml-bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`ml-bottom-item ${active === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
