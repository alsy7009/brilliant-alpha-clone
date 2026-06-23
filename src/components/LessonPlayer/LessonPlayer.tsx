import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lesson, LessonStep, WidgetState } from '../../types/lesson'
import type { UserProgress } from '../../types/progress'
import { evaluateWidget, getStepExplanation } from '../../lib/widgets/evaluateWidget'
import { initWidgetState } from '../../lib/widgets/widgetState'
import { completeStep, fetchLessonProgress } from '../../lib/progress'
import { StepWidget } from '../StepWidget/StepWidget'
import './LessonPlayer.css'

interface LessonPlayerProps {
  lesson: Lesson
  userId: string
  onExit: () => void
  onComplete: (lessonId: string) => void
}

export function LessonPlayer({ lesson, userId, onExit, onComplete }: LessonPlayerProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [widgetState, setWidgetState] = useState<WidgetState>(() =>
    initWidgetState(lesson.steps[0]),
  )
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error' | 'neutral'>('neutral')
  const [loading, setLoading] = useState(true)
  const [celebrate, setCelebrate] = useState(false)

  const step: LessonStep = lesson.steps[stepIndex]

  const resetWidgetState = useCallback((targetStep: LessonStep) => {
    setWidgetState(initWidgetState(targetStep))
    setFeedback(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const progress = await fetchLessonProgress(userId, lesson)
      if (cancelled) return
      const resumeIndex = lesson.steps.findIndex(
        (s) => s.stepId === progress.currentStepId,
      )
      const index = resumeIndex >= 0 ? resumeIndex : 0
      setStepIndex(index)
      resetWidgetState(lesson.steps[index])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [lesson, userId, resetWidgetState])

  const goToStep = (index: number) => {
    setStepIndex(index)
    resetWidgetState(lesson.steps[index])
  }

  const handleCheck = async () => {
    const start = performance.now()
    const outcome = evaluateWidget(step, widgetState)
    const message = getStepExplanation(step, outcome)
    setFeedback(message)
    setFeedbackTone(outcome === 'correct' ? 'success' : 'error')

    const elapsed = performance.now() - start
    if (elapsed > 100) {
      console.warn(`Feedback latency ${elapsed.toFixed(1)}ms exceeds 100ms target`)
    }

    if (outcome === 'correct') {
      const updated: UserProgress = await completeStep(userId, lesson, step.stepId)
      if (updated.isCompleted) {
        setCelebrate(true)
        setTimeout(() => onComplete(lesson.lessonId), 1200)
      } else if (stepIndex < lesson.steps.length - 1) {
        setTimeout(() => goToStep(stepIndex + 1), 900)
      }
    }
  }

  const handleNext = () => {
    if (stepIndex < lesson.steps.length - 1) {
      goToStep(stepIndex + 1)
    } else {
      onExit()
    }
  }

  const progressPercent = useMemo(
    () => Math.round(((stepIndex + 1) / lesson.steps.length) * 100),
    [lesson.steps.length, stepIndex],
  )

  if (loading) {
    return <div className="lesson-player loading">Loading lesson…</div>
  }

  return (
    <div className="lesson-player">
      <header className="lesson-header">
        <button type="button" className="text-button" onClick={onExit}>
          ← Back
        </button>
        <div className="lesson-meta">
          <h1>{lesson.title}</h1>
          <div className="progress-bar" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="step-count">
            Step {stepIndex + 1} of {lesson.steps.length}
          </p>
        </div>
      </header>

      <section className="lesson-body">
        <p className="instruction">{step.instruction}</p>
        <StepWidget step={step} state={widgetState} onStateChange={setWidgetState} />

        {feedback && (
          <div className={`feedback feedback-${feedbackTone}`} role="status">
            {feedback}
          </div>
        )}

        {celebrate && (
          <div className="celebration" role="status">
            Lesson complete!
          </div>
        )}
      </section>

      <footer className="lesson-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={() => goToStep(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
        >
          Previous
        </button>
        <button type="button" className="primary-button" onClick={handleCheck}>
          Check
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={handleNext}
          disabled={stepIndex >= lesson.steps.length - 1}
        >
          Next
        </button>
      </footer>
    </div>
  )
}
