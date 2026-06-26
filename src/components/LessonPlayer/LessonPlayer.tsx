import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lesson, LessonStep, WidgetState } from '../../types/lesson'
import { buildFeedback, checkStep, summarizeAttempt } from '../../lib/widgets/checkStep'
import { initWidgetState } from '../../lib/widgets/widgetState'
import { completeStep, fetchLessonProgress } from '../../lib/progress'
import { isAiEnabled, TUTOR_NAME, type TutorContext } from '../../lib/ai'
import { useGamification } from '../../context/GamificationContext'
import { StepWidget } from '../StepWidget/StepWidget'
import { CoinBurst } from '../Effects/CoinBurst'
import { TrophyOverlay } from '../Effects/TrophyOverlay'
import { TutorChat } from '../Tutor/TutorChat'
import './LessonPlayer.css'

function expressionContext(step: LessonStep): string | undefined {
  const c = step.widgetConfig as unknown as Record<string, unknown>
  switch (step.type) {
    case 'foil-multiply':
      return c.factors as string
    case 'expression-evaluate': {
      const sub = c.substitute as { variable: string; value: number } | undefined
      return sub ? `${c.expression} for ${sub.variable} = ${sub.value}` : (c.expression as string)
    }
    case 'linear-graph':
    case 'plot-line':
    case 'graph-select':
      return c.equationLabel as string | undefined
    case 'expression-build': {
      const m = c.visualModel as { variable: string; variableCount: number; constantCount: number } | undefined
      return m ? `${m.variableCount} "${m.variable}" bars and ${m.constantCount} unit squares` : undefined
    }
    default:
      return undefined
  }
}

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
  const { registerAnswer, markSession, registerLessonComplete } = useGamification()
  const [stepIndex, setStepIndex] = useState(0)
  const alreadyCompletedRef = useRef(false)
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
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set())
  const [attempts, setAttempts] = useState(0)
  const [slotFeedback, setSlotFeedback] = useState<Record<string, boolean> | null>(null)
  const [showTutor, setShowTutor] = useState(false)

  const step: LessonStep = lesson.steps[stepIndex]
  const isLastStep = stepIndex >= lesson.steps.length - 1
  // Can advance only after finishing the current step — unless it was completed before.
  const canAdvance = solved || completedStepIds.has(step.stepId)

  const resetWidgetState = useCallback((targetStep: LessonStep) => {
    setWidgetState(initWidgetState(targetStep))
    setFeedback(null)
    setSolved(false)
    setCelebrate(false)
    setShake(false)
    setFlash(false)
    setAttempts(0)
    setSlotFeedback(null)
    setShowTutor(false)
  }, [])

  // Editing the widget clears the previous check's coloring/feedback.
  const updateWidgetState = useCallback((next: WidgetState) => {
    setWidgetState(next)
    setSlotFeedback(null)
    setFeedback(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      let resumeStepId: string | null = null
      let completed: string[] = []
      try {
        const progress = await fetchLessonProgress(userId, lesson)
        resumeStepId = progress.currentStepId
        completed = progress.completedSteps ?? []
        alreadyCompletedRef.current = progress.isCompleted
      } catch {
        resumeStepId = null
      }
      if (cancelled) return
      setCompletedStepIds(new Set(completed))
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

  const isScored = step.type !== 'explanation-slide' && step.type !== 'quad-explore'

  const handleCheck = async () => {
    if (solved) return
    const start = performance.now()
    const result = checkStep(step, widgetState)

    const elapsed = performance.now() - start
    if (elapsed > 100) {
      console.warn(`Feedback latency ${elapsed.toFixed(1)}ms exceeds 100ms target`)
    }

    if (result.status === 'incomplete') {
      setSlotFeedback(null)
      setFeedback(buildFeedback(step, widgetState, attempts).message)
      setFeedbackTone('neutral')
      return
    }

    setSlotFeedback(result.slotResults)

    if (result.status === 'correct') {
      setFeedback(buildFeedback(step, widgetState, attempts).message)
      setFeedbackTone('success')
      if (isScored) registerAnswer(true, attempts === 0)
      setSolved(true)
      setCompletedStepIds((prev) => new Set(prev).add(step.stepId))
      markSession()
      setBurstKey((k) => k + 1)
      await completeStep(userId, lesson, step.stepId)
      onStepComplete?.()
      if (isLastStep) {
        setCelebrate(true)
        // Count toward daily goals only the first time this lesson is finished.
        if (!alreadyCompletedRef.current) {
          alreadyCompletedRef.current = true
          registerLessonComplete()
        }
      }
      return
    }

    // Wrong answer → escalate hints by attempt count.
    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    if (isScored) registerAnswer(false, false)
    setFeedback(buildFeedback(step, widgetState, nextAttempts).message)
    setFeedbackTone('error')
    setShake(true)
    setFlash(true)
    window.setTimeout(() => setShake(false), 450)
    window.setTimeout(() => setFlash(false), 350)
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
        <StepWidget
          step={step}
          state={widgetState}
          onStateChange={updateWidgetState}
          slotFeedback={slotFeedback}
        />

        {feedback && (
          <div className={`feedback feedback-${feedbackTone}`} role="status">
            {feedback}
          </div>
        )}

        {isScored && isAiEnabled() && !solved && (
          <button
            type="button"
            className="ask-bolt"
            onClick={() => setShowTutor(true)}
            disabled={attempts === 0}
            title={
              attempts === 0
                ? `Make a first attempt before asking ${TUTOR_NAME}!`
                : `Ask ${TUTOR_NAME} for a hint`
            }
          >
            ⚡ Ask {TUTOR_NAME} if you're stuck
          </button>
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
          <button
            type="button"
            className="secondary-button"
            onClick={handleNext}
            disabled={!canAdvance}
          >
            Next
          </button>
        ) : (
          <span className="footer-spacer" aria-hidden="true" />
        )}
      </footer>

      {celebrate && (
        <TrophyOverlay onClaim={() => onComplete(lesson.lessonId)} />
      )}

      {showTutor &&
        (() => {
          const summary = summarizeAttempt(step, widgetState)
          const ctx: TutorContext = {
            instruction: step.instruction,
            expression: expressionContext(step),
            answerSummary: summary.answer,
            wrongSummary: summary.wrong,
          }
          return (
            <TutorChat
              context={ctx}
              onClose={() => setShowTutor(false)}
              sessionId={`${lesson.lessonId}:${step.stepId}`}
            />
          )
        })()}
    </div>
  )
}
