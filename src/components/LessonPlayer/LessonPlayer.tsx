import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lesson, LessonStep, WidgetState } from '../../types/lesson'
import { evaluateWidget, getStepExplanation } from '../../lib/widgets/evaluateWidget'
import { initWidgetState } from '../../lib/widgets/widgetState'
import { completeStep, fetchLessonProgress } from '../../lib/progress'
import { useGamification } from '../../context/GamificationContext'
import { StepWidget } from '../StepWidget/StepWidget'
import { CoinBurst } from '../Effects/CoinBurst'
import { TrophyOverlay } from '../Effects/TrophyOverlay'
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
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState(false)
  const [burstKey, setBurstKey] = useState(0)

  const step: LessonStep = lesson.steps[stepIndex]
  const isLastStep = stepIndex >= lesson.steps.length - 1

  const resetWidgetState = useCallback((targetStep: LessonStep) => {
    setWidgetState(initWidgetState(targetStep))
    setFeedback(null)
    setSolved(false)
    setCelebrate(false)
    setShake(false)
    setFlash(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      let resumeStepId: string | null = null
      try {
        const progress = await fetchLessonProgress(userId, lesson)
        resumeStepId = progress.currentStepId
      } catch {
        resumeStepId = null
      }
      if (cancelled) return
      const resumeIndex = lesson.steps.findIndex((s) => s.stepId === resumeStepId)
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

    if (step.type !== 'explanation-slide' && step.type !== 'quad-explore') {
      registerAnswer(outcome === 'correct')
    }

    if (outcome === 'correct') {
      setSolved(true)
      markSession()
      setBurstKey((k) => k + 1)
      await completeStep(userId, lesson, step.stepId)
      onStepComplete?.()
      // Trophy only when the final step is cleared this session — not when
      // replaying an earlier step of an already-completed lesson.
      if (isLastStep) {
        setCelebrate(true)
      }
    } else if (outcome !== 'incomplete') {
      setShake(true)
      setFlash(true)
      window.setTimeout(() => setShake(false), 450)
      window.setTimeout(() => setFlash(false), 350)
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
    <div className={`lesson-player ${shake ? 'fx-shake' : ''}`}>
      {flash && <div className="fx-flash" />}
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
        <CoinBurst fireKey={burstKey} />
        <p className="instruction">{step.instruction}</p>
        <StepWidget step={step} state={widgetState} onStateChange={setWidgetState} />

        {feedback && (
          <div className={`feedback feedback-${feedbackTone}`} role="status">
            {feedback}
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
        {!isLastStep ? (
          <button type="button" className="secondary-button" onClick={handleNext}>
            Next
          </button>
        ) : (
          <span className="footer-spacer" aria-hidden="true" />
        )}
      </footer>

      {celebrate && (
        <TrophyOverlay onClaim={() => onComplete(lesson.lessonId)} />
      )}
    </div>
  )
}
