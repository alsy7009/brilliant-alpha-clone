import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lesson, LessonStep, WidgetState } from '../../types/lesson'
import type { UserProgress } from '../../types/progress'
import { evaluateWidget, getStepExplanation } from '../../lib/widgets/evaluateWidget'
import { initWidgetState } from '../../lib/widgets/widgetState'
import { completeStep, fetchLessonProgress } from '../../lib/progress'
import { useGamification } from '../../context/GamificationContext'
import { StepWidget } from '../StepWidget/StepWidget'
import './LessonPlayer.css'

interface LessonPlayerProps {
  lesson: Lesson
  userId: string
  onExit: () => void
  onComplete: (lessonId: string) => void
  onStepComplete?: () => void
}

export function LessonPlayer({
  lesson,
  userId,
  onExit,
  onComplete,
  onStepComplete,
}: LessonPlayerProps) {
  const { registerAnswer, markSession } = useGamification()
  const [stepIndex, setStepIndex] = useState(0)
  const [widgetState, setWidgetState] = useState<WidgetState>(() =>
    initWidgetState(lesson.steps[0]),
  )
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error' | 'neutral'>('neutral')
  const [loading, setLoading] = useState(true)
  const [celebrate, setCelebrate] = useState(false)
  const [solved, setSolved] = useState(false)

  const step: LessonStep = lesson.steps[stepIndex]
  const isLastStep = stepIndex >= lesson.steps.length - 1

  const resetWidgetState = useCallback((targetStep: LessonStep) => {
    setWidgetState(initWidgetState(targetStep))
    setFeedback(null)
    setSolved(false)
    setCelebrate(false)
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
    if (solved) return
    const start = performance.now()
    const outcome = evaluateWidget(step, widgetState)
    const message = getStepExplanation(step, outcome)
    setFeedback(message)
    setFeedbackTone(outcome === 'correct' ? 'success' : 'error')

    const elapsed = performance.now() - start
    if (elapsed > 100) {
      console.warn(`Feedback latency ${elapsed.toFixed(1)}ms exceeds 100ms target`)
    }

    if (step.type !== 'explanation-slide') {
      registerAnswer(outcome === 'correct')
    }

    if (outcome === 'correct') {
      setSolved(true)
      markSession()
      const updated: UserProgress = await completeStep(userId, lesson, step.stepId)
      onStepComplete?.()
      if (updated.isCompleted) {
        setCelebrate(true)
      }
    }
  }

  const handleNext = () => {
    if (isLastStep) {
      onComplete(lesson.lessonId)
    } else {
      goToStep(stepIndex + 1)
    }
  }

  const progressPercent = useMemo(
    () => Math.round(((stepIndex + 1) / lesson.steps.length) * 100),
    [lesson.steps.length, stepIndex],
  )

  if (loading) {
    return <div className="lesson-player loading">LOADING…</div>
  }

  return (
    <div className="lesson-player">
      <header className="lesson-header">
        <button type="button" className="text-button" onClick={onExit}>
          ← Quit
        </button>
        <div className="lesson-meta">
          <h1>{lesson.title}</h1>
          <div className="progress-bar" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="step-count">
            Stage {stepIndex + 1} / {lesson.steps.length}
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
            ★ MISSION CLEARED! ★
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
          Back
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={handleCheck}
          disabled={solved}
        >
          {solved ? 'Nailed it ✓' : 'Fire!'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={handleNext}
          disabled={isLastStep && !solved}
        >
          {isLastStep ? 'Claim win' : 'Next'}
        </button>
      </footer>
    </div>
  )
}
