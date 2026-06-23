import { LESSONS } from '../../content/catalog'
import { getDecoration, useGamification } from '../../context/GamificationContext'
import type { UserProgress } from '../../types/progress'
import { AvatarDecoration } from '../Gamification/AvatarDecoration'
import { LevelBadge } from '../Gamification/LevelBadge'
import { StreakFlame } from '../Gamification/StreakFlame'
import { XpBar } from '../Gamification/XpBar'
import './ProfilePage.css'

interface ProfilePageProps {
  displayName?: string
  photoURL?: string
  progressList: UserProgress[]
}

export function ProfilePage({ displayName, photoURL, progressList }: ProfilePageProps) {
  const {
    level,
    xpIntoLevel,
    xpForNext,
    totalXp,
    streak,
    decorations,
    unlockedIds,
    equippedId,
    equip,
  } = useGamification()

  const equipped = getDecoration(equippedId)

  const mastered = LESSONS.map((lesson) => {
    const p = progressList.find((x) => x.lessonId === lesson.lessonId)
    return {
      lesson,
      completed: p?.isCompleted ?? false,
      stepsDone: p?.completedSteps.length ?? 0,
      total: lesson.steps.length,
    }
  })

  const masteredCount = mastered.filter((m) => m.completed).length

  return (
    <div className="profile-page">
      <h1 className="profile-title">Your Profile</h1>

      <div className="profile-grid">
        {/* Profile card */}
        <section className="profile-card">
          <AvatarDecoration
            name={displayName}
            photoURL={photoURL}
            variant={equipped.variant}
            size={120}
          />
          <h2 className="profile-name">{displayName ?? 'Learner'}</h2>
          <div className="profile-badges">
            <span className="profile-badge">
              <LevelBadge level={level} size="sm" /> Level {level}
            </span>
            <span className="profile-badge">
              <StreakFlame streak={streak} size={22} /> streak
            </span>
            <span className="profile-badge">{totalXp} XP</span>
          </div>
          <div className="profile-xp">
            <XpBar level={level} xpIntoLevel={xpIntoLevel} xpForNext={xpForNext} />
          </div>
        </section>

        {/* Decoration customization */}
        <section className="profile-decorations">
          <h3 className="section-heading">Avatar Decorations</h3>
          <div className="deco-grid">
            {decorations.map((d) => {
              const unlocked = unlockedIds.includes(d.id)
              const isEquipped = equippedId === d.id
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`deco-option ${isEquipped ? 'equipped' : ''} ${unlocked ? '' : 'locked'}`}
                  onClick={() => unlocked && equip(d.id)}
                  disabled={!unlocked}
                >
                  <AvatarDecoration name={displayName} photoURL={photoURL} variant={d.variant} size={64} />
                  <span className="deco-name">{d.name}</span>
                  <span className="deco-status">
                    {isEquipped ? 'Equipped' : unlocked ? 'Tap to equip' : `Level ${d.unlockLevel}`}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* History feed */}
        <section className="profile-history">
          <h3 className="section-heading">
            Mastered Concepts <span className="history-count">{masteredCount}/{LESSONS.length}</span>
          </h3>
          <ul className="history-feed">
            {mastered.map(({ lesson, completed, stepsDone, total }) => (
              <li key={lesson.lessonId} className={`history-item ${completed ? 'done' : ''}`}>
                <span className="history-icon" aria-hidden="true">
                  {completed ? '✓' : stepsDone > 0 ? '◐' : '○'}
                </span>
                <span className="history-info">
                  <span className="history-name">{lesson.title}</span>
                  <span className="history-sub">
                    {completed ? 'Mastered' : `${stepsDone}/${total} steps`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
