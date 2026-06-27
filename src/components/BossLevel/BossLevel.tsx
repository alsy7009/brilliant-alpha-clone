import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lesson, WidgetState } from '../../types/lesson'
import { generatePracticeLesson, PRACTICE_TOPICS, type TopicId } from '../../lib/practice'
import { initWidgetState } from '../../lib/widgets/widgetState'
import { checkStep, revealAnswer } from '../../lib/widgets/checkStep'
import { recordMastery, recordStruggle, topicForStepType } from '../../lib/weakAreas'
import { BOSS_PASS_RATIO, setBossCleared } from '../../lib/boss'
import { BOSS_XP_PER_CORRECT } from '../../lib/gamification'
import { useGamification } from '../../context/GamificationContext'
import { StepWidget } from '../StepWidget/StepWidget'
import { CoinBurst } from '../Effects/CoinBurst'
import './BossLevel.css'

const ALL_TOPIC_IDS = PRACTICE_TOPICS.map((t) => t.id) as TopicId[]
const BOSS_COUNT = 15
// Lighter on expressions/evaluate; more graphing + FOIL. Every topic stays present.
const BOSS_WEIGHTS: Partial<Record<TopicId, number>> = {
  expressions: 1,
  evaluate: 1,
  linear: 2,
  plot: 2,
  foil: 2,
  quadratic: 2,
}

interface BossLevelProps {
  userId: string
  onExit: () => void
  /** Jump to the Drills tab (used by the "practice these" suggestion). */
  onGoToPractice?: () => void
}

type Phase = 'quiz' | 'results' | 'review'

function topicLabel(id: TopicId): string {
  return PRACTICE_TOPICS.find((t) => t.id === id)?.label ?? id
}

export function BossLevel({ userId, onExit, onGoToPractice }: BossLevelProps) {
  const { registerQuizComplete, markSession } = useGamification()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [index, setIndex] = useState(0)
  const [states, setStates] = useState<WidgetState[]>([])
  const [locked, setLocked] = useState<boolean[]>([])
  const [correct, setCorrect] = useState<boolean[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [burstKey, setBurstKey] = useState(0)
  const awardedRef = useRef(false)

  // Generate (or regenerate) a fresh, randomized quiz. Used on mount and "Play again".
  const loadQuiz = useCallback(() => {
    setLoading(true)
    setPhase('quiz')
    setIndex(0)
    setFeedback(null)
    setBurstKey(0)
    awardedRef.current = false
    return generatePracticeLesson({
      topics: ALL_TOPIC_IDS,
      count: BOSS_COUNT,
      weights: BOSS_WEIGHTS,
      title: 'Boss Level',
    }).then((l) => {
      setLesson(l)
      setStates(l.steps.map((s) => initWidgetState(s)))
      setLocked(l.steps.map(() => false))
      setCorrect(l.steps.map(() => false))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    void loadQuiz()
  }, [loadQuiz])

  const total = lesson?.steps.length ?? 0
  const correctCount = useMemo(() => correct.filter(Boolean).length, [correct])

  // Award score-proportional XP once when the results screen is reached; mark cleared at >= 60%.
  useEffect(() => {
    if (phase === 'results' && !awardedRef.current) {
      awardedRef.current = true
      registerQuizComplete(correctCount)
      if (total > 0 && correctCount / total >= BOSS_PASS_RATIO) {
        setBossCleared(userId)
      }
    }
  }, [phase, correctCount, total, registerQuizComplete, userId])

  if (loading || !lesson) {
    return <div className="lesson-player loading">SUMMONING THE BOSS…</div>
  }

  const step = lesson.steps[index]
  const isLocked = locked[index]
  const isLastQuestion = index >= total - 1
  const currentCheck = isLocked ? checkStep(step, states[index]) : null

  const updateState = (next: WidgetState) => {
    if (locked[index]) return
    setStates((prev) => {
      const copy = [...prev]
      copy[index] = next
      return copy
    })
    setFeedback(null)
  }

  const lockIn = () => {
    if (isLocked) return
    const check = checkStep(step, states[index])
    if (check.status === 'incomplete') {
      setFeedback('Answer every part before you lock it in!')
      return
    }
    const isCorrect = check.status === 'correct'
    setCorrect((prev) => {
      const copy = [...prev]
      copy[index] = isCorrect
      return copy
    })
    setLocked((prev) => {
      const copy = [...prev]
      copy[index] = true
      return copy
    })
    const topic = topicForStepType(step.type)
    if (topic) {
      if (isCorrect) recordMastery(userId, topic)
      else recordStruggle(userId, topic)
    }
    markSession()
    if (isCorrect) {
      setBurstKey((k) => k + 1)
      setFeedback('Direct hit! ✓')
    } else {
      setFeedback(`Missed — the answer was ${revealAnswer(step)}.`)
    }
  }

  const next = () => {
    if (isLastQuestion) {
      setPhase('results')
    } else {
      setIndex((i) => i + 1)
      setFeedback(null)
    }
  }

  // ---------- Results ----------
  if (phase === 'results') {
    const wrongTopics = [
      ...new Set(
        lesson.steps
          .map((s, i) => (correct[i] ? null : topicForStepType(s.type)))
          .filter((t): t is TopicId => t !== null),
      ),
    ]
    const xp = correctCount * BOSS_XP_PER_CORRECT
    const ratio = total > 0 ? correctCount / total : 0
    const passed = ratio >= BOSS_PASS_RATIO
    const verdict =
      ratio === 1 ? 'FLAWLESS VICTORY!' : passed ? 'BOSS DEFEATED!' : 'BOSS SURVIVED…'

    return (
      <div className="boss-level">
        <div className="boss-results">
          <h1 className="boss-verdict">👑 {verdict}</h1>
          {passed ? (
            <div className="boss-cleared-chip">CLEARED ✓</div>
          ) : (
            <div className="boss-retry-chip">
              Score {Math.round(BOSS_PASS_RATIO * 100)}% to clear — try again!
            </div>
          )}
          <div className="boss-score">
            {correctCount}
            <span className="boss-score-total">/ {total}</span>
          </div>
          <p className="boss-score-label">questions correct</p>
          <div className="boss-xp">+{xp} XP</div>

          {wrongTopics.length > 0 ? (
            <div className="boss-suggest">
              <h2>Train these next:</h2>
              <ul>
                {wrongTopics.map((t) => (
                  <li key={t}>{topicLabel(t)}</li>
                ))}
              </ul>
              {onGoToPractice && (
                <button type="button" className="primary-button" onClick={onGoToPractice}>
                  Practice in Drills
                </button>
              )}
            </div>
          ) : (
            <p className="boss-perfect">No weak spots detected — you crushed every topic! 🔥</p>
          )}

          <div className="boss-results-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setReviewIndex(0)
                setPhase('review')
              }}
            >
              Review answers
            </button>
            <button type="button" className="secondary-button" onClick={() => void loadQuiz()}>
              Play again
            </button>
            <button type="button" className="primary-button" onClick={onExit}>
              Back to map
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Review ----------
  if (phase === 'review') {
    const rStep = lesson.steps[reviewIndex]
    const rCheck = checkStep(rStep, states[reviewIndex])
    const wasCorrect = correct[reviewIndex]
    return (
      <div className="boss-level">
        <header className="lesson-header">
          <button type="button" className="text-button" onClick={() => setPhase('results')}>
            ← Back to results
          </button>
          <div className="lesson-meta">
            <h1>Review — Question {reviewIndex + 1} / {total}</h1>
          </div>
        </header>

        <section className="lesson-body">
          <div className={`boss-badge ${wasCorrect ? 'good' : 'bad'}`}>
            {wasCorrect ? 'You got this right ✓' : 'You missed this ✗'}
          </div>
          <p className="instruction">{rStep.instruction}</p>
          <div className="boss-readonly">
            <StepWidget
              step={rStep}
              state={states[reviewIndex]}
              onStateChange={() => {}}
              slotFeedback={rCheck.slotResults}
            />
          </div>
          {!wasCorrect && (
            <div className="feedback feedback-neutral">
              Correct answer: {revealAnswer(rStep)}.
            </div>
          )}
        </section>

        <footer className="lesson-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
            disabled={reviewIndex === 0}
          >
            Back
          </button>
          <span className="footer-spacer" aria-hidden="true" />
          <button
            type="button"
            className="secondary-button"
            onClick={() => setReviewIndex((i) => Math.min(total - 1, i + 1))}
            disabled={reviewIndex >= total - 1}
          >
            Next
          </button>
        </footer>
      </div>
    )
  }

  // ---------- Quiz ----------
  const progressPercent = Math.round(((index + 1) / total) * 100)

  return (
    <div className="boss-level">
      <header className="lesson-header">
        <button type="button" className="text-button" onClick={onExit}>
          ← Quit boss
        </button>
        <div className="lesson-meta">
          <h1>👑 BOSS LEVEL</h1>
          <div className="progress-bar" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="step-count">
            Question {index + 1} / {total}
          </p>
        </div>
      </header>

      <section className="lesson-body">
        <CoinBurst fireKey={burstKey} />
        <p className="instruction">{step.instruction}</p>
        <div className={isLocked ? 'boss-readonly' : ''}>
          <StepWidget
            step={step}
            state={states[index]}
            onStateChange={updateState}
            slotFeedback={currentCheck?.slotResults ?? null}
          />
        </div>

        {feedback && (
          <div
            className={`feedback ${
              isLocked ? (correct[index] ? 'feedback-success' : 'feedback-error') : 'feedback-neutral'
            }`}
            role="status"
          >
            {feedback}
          </div>
        )}
      </section>

      <footer className="lesson-footer">
        <span className="footer-spacer" aria-hidden="true" />
        {!isLocked ? (
          <button type="button" className="primary-button" onClick={lockIn}>
            Lock in answer
          </button>
        ) : (
          <button type="button" className="primary-button" onClick={next}>
            {isLastQuestion ? 'See results' : 'Next'}
          </button>
        )}
        <span className="footer-spacer" aria-hidden="true" />
      </footer>
    </div>
  )
}
