import { LESSONS } from '../../content/catalog'
import type { UserProgress } from '../../types/progress'
import { isLessonUnlocked } from '../../lib/progress'
import { getBossCleared } from '../../lib/boss'
import { GoalsCard } from '../Gamification/GoalsCard'
import './Roadmap.css'

interface RoadmapProps {
  progressList: UserProgress[]
  userId: string
  onSelectLesson: (lessonId: string) => void
  onStartBoss: () => void
}

export function Roadmap({ progressList, userId, onSelectLesson, onStartBoss }: RoadmapProps) {
  const bossUnlocked = LESSONS.every(
    (l) => progressList.find((p) => p.lessonId === l.lessonId)?.isCompleted,
  )
  const bossCleared = bossUnlocked && getBossCleared(userId)

  return (
    <div className="roadmap">
      <header className="roadmap-header">
        <h1>★ Mission Map</h1>
        <p>Clear each mission to unlock the next. Stack XP and level up!</p>
      </header>

      <GoalsCard />

      <ol className="lesson-path">
        {LESSONS.map((lesson) => {
          const unlocked = isLessonUnlocked(lesson.order, progressList, LESSONS)
          const progress = progressList.find((p) => p.lessonId === lesson.lessonId)
          const completed = progress?.isCompleted ?? false
          const inProgress =
            !completed && (progress?.completedSteps.length ?? 0) > 0

          return (
            <li key={lesson.lessonId} className="lesson-node">
              <button
                type="button"
                className={`lesson-card ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''}`}
                disabled={!unlocked}
                onClick={() => onSelectLesson(lesson.lessonId)}
              >
                <span className="lesson-order">{!unlocked ? '🔒' : completed ? '★' : lesson.order}</span>
                <div className="lesson-card-body">
                  <strong>{lesson.title}</strong>
                  <span className="lesson-status">
                    {!unlocked && 'LOCKED'}
                    {unlocked && completed && 'CLEARED ✓'}
                    {unlocked && inProgress && '▶ CONTINUE'}
                    {unlocked && !completed && !inProgress && '▶ PLAY'}
                  </span>
                </div>
              </button>
              <div className="path-connector" />
            </li>
          )
        })}

        <li className="lesson-node">
          <button
            type="button"
            className={`lesson-card boss-card ${!bossUnlocked ? 'locked' : ''} ${bossCleared ? 'cleared' : ''}`}
            disabled={!bossUnlocked}
            onClick={onStartBoss}
          >
            <span className="lesson-order boss-order">{!bossUnlocked ? '🔒' : '👑'}</span>
            <div className="lesson-card-body">
              <strong>Boss Level</strong>
              <span className="lesson-status">
                {!bossUnlocked && 'CLEAR ALL MISSIONS'}
                {bossCleared && 'CLEARED ✓ — REMATCH'}
                {bossUnlocked && !bossCleared && '▶ FINAL CHALLENGE'}
              </span>
            </div>
          </button>
        </li>
      </ol>
    </div>
  )
}
