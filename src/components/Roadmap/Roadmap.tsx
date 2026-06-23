import { LESSONS } from '../../content/catalog'
import type { UserProgress } from '../../types/progress'
import { isLessonUnlocked } from '../../lib/progress'
import './Roadmap.css'

interface RoadmapProps {
  progressList: UserProgress[]
  onSelectLesson: (lessonId: string) => void
}

export function Roadmap({ progressList, onSelectLesson }: RoadmapProps) {
  return (
    <div className="roadmap">
      <header className="roadmap-header">
        <h1>Algebra: Visual Equation Balancing</h1>
        <p>Master isolating variables by keeping the scale balanced.</p>
      </header>

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
                <span className="lesson-order">{lesson.order}</span>
                <div className="lesson-card-body">
                  <strong>{lesson.title}</strong>
                  <span className="lesson-status">
                    {!unlocked && 'Locked'}
                    {unlocked && completed && 'Completed'}
                    {unlocked && inProgress && 'In progress'}
                    {unlocked && !completed && !inProgress && 'Start'}
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
