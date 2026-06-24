import { useMemo } from 'react'
import { getDecoration, useGamification } from '../../context/GamificationContext'
import { rewardsForLevel } from '../../lib/gamification'
import { AvatarDecoration } from './AvatarDecoration'
import { LevelBadge } from './LevelBadge'
import './LevelUpModal.css'

interface LevelUpModalProps {
  displayName?: string
  photoURL?: string
}

const PARTICLE_COLORS = ['#ffd166', '#06d6a0', '#4ad7ff', '#f78fb3', '#b15bff', '#ff9d2e']

export function LevelUpModal({ displayName, photoURL }: LevelUpModalProps) {
  const { pendingLevelUp, dismissLevelUp, equip, equippedId } = useGamification()

  const particles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * Math.PI * 2
      const dist = 90 + Math.random() * 70
      return {
        id: i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        delay: Math.random() * 0.1,
      }
    })
    // regenerate per modal open
  }, [pendingLevelUp])

  if (pendingLevelUp === null) return null

  const rewards = rewardsForLevel(pendingLevelUp)

  return (
    <div className="levelup-overlay" role="dialog" aria-modal="true" aria-label="Level up">
      <div className="levelup-modal">
        <div className="levelup-burst" aria-hidden="true">
          {particles.map((p) => (
            <span
              key={p.id}
              className="burst-particle"
              style={
                {
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  '--delay': `${p.delay}s`,
                  background: p.color,
                } as React.CSSProperties
              }
            />
          ))}
          <div className="levelup-badge-pop">
            <LevelBadge level={pendingLevelUp} size="lg" />
          </div>
        </div>

        <h2 className="levelup-title">LEVEL UP!</h2>
        <p className="levelup-sub">You hit Level {pendingLevelUp}! ★</p>

        {rewards.length > 0 && (
          <>
            <p className="levelup-prompt">Choose your loot:</p>
            <div className="levelup-rewards">
              {rewards.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`levelup-reward ${equippedId === d.id ? 'chosen' : ''}`}
                  onClick={() => equip(d.id)}
                >
                  <AvatarDecoration
                    name={displayName}
                    photoURL={photoURL}
                    variant={d.variant}
                    size={64}
                  />
                  <span className="reward-name">{d.name}</span>
                  <span className="reward-blurb">{d.blurb}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <button type="button" className="levelup-continue" onClick={dismissLevelUp}>
          {getDecoration(equippedId).variant === 'none' ? 'Let’s go!' : 'Equip & go!'}
        </button>
      </div>
    </div>
  )
}
