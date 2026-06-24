import { useRef, useState, type ChangeEvent } from 'react'
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
  onAvatarFile?: (file: File) => Promise<void>
}

export function ProfilePage({
  displayName,
  photoURL,
  progressList,
  onAvatarFile,
}: ProfilePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file
    if (!file || !onAvatarFile) return
    setUploadError(null)
    setUploading(true)
    try {
      await onAvatarFile(file)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }
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
      <h1 className="profile-title">★ Hero Profile</h1>

      <div className="profile-grid">
        {/* Profile card */}
        <section className="profile-card">
          <div className="profile-avatar-wrap">
            <AvatarDecoration
              name={displayName}
              photoURL={photoURL}
              variant={equipped.variant}
              size={120}
            />
            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Upload profile photo"
              title="Upload profile photo"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M4 7h3l2-2h6l2 2h3v12H4z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="avatar-file-input"
              onChange={handleFileChange}
            />
          </div>
          <h2 className="profile-name">{displayName ?? 'Learner'}</h2>
          <button
            type="button"
            className="avatar-upload-link"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : photoURL ? 'Change photo' : 'Upload photo'}
          </button>
          {uploadError && <p className="avatar-upload-error">{uploadError}</p>}
          <div className="profile-badges">
            <span className="profile-badge">
              <LevelBadge level={level} size="sm" /> LVL {level}
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
          <h3 className="section-heading">Gear Locker</h3>
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
                    {isEquipped ? 'Equipped' : unlocked ? 'Tap to equip' : `🔒 LVL ${d.unlockLevel}`}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* History feed */}
        <section className="profile-history">
          <h3 className="section-heading">
            Trophies <span className="history-count">{masteredCount}/{LESSONS.length}</span>
          </h3>
          <ul className="history-feed">
            {mastered.map(({ lesson, completed, stepsDone, total }) => (
              <li key={lesson.lessonId} className={`history-item ${completed ? 'done' : ''}`}>
                <span className="history-icon" aria-hidden="true">
                  {completed ? '★' : stepsDone > 0 ? '▷' : '·'}
                </span>
                <span className="history-info">
                  <span className="history-name">{lesson.title}</span>
                  <span className="history-sub">
                    {completed ? 'CLEARED' : `${stepsDone}/${total} stages`}
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
