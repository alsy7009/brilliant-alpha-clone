import { LESSONS } from '../../content/catalog'
import type { UserProgress } from '../../types/progress'
import { isLessonUnlocked } from '../../lib/progress'
import { GoalsCard } from '../Gamification/GoalsCard'
import './Roadmap.css'

interface RoadmapProps {
  progressList: UserProgress[]
  onSelectLesson: (lessonId: string) => void
}

export function Roadmap({ progressList, onSelectLesson }: RoadmapProps) {
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
              {lesson.order < LESSONS.length && <div className="path-connector" />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
