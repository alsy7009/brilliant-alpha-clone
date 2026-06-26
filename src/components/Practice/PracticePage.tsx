import { useState } from 'react'
import type { Lesson } from '../../types/lesson'
import { isAiEnabled } from '../../lib/ai'
import {
  generatePracticeLesson,
  PRACTICE_TOPICS,
  type GenerateOptions,
  type TopicId,
} from '../../lib/practice'
import { getRecommendation, getWeakTopicLabels, hasWeakAreas } from '../../lib/weakAreas'
import './PracticePage.css'

interface PracticePageProps {
  userId: string
  onStart: (lesson: Lesson) => void
}

const MIN_COUNT = 5
const MAX_COUNT = 20

export function PracticePage({ userId, onStart }: PracticePageProps) {
  const [selected, setSelected] = useState<Set<TopicId>>(new Set())
  const [count, setCount] = useState('8')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hasWeak] = useState(() => hasWeakAreas(userId))
  const [weakLabels] = useState(() => getWeakTopicLabels(userId))

  const parsedCount = Number(count)
  const countValid =
    Number.isInteger(parsedCount) && parsedCount >= MIN_COUNT && parsedCount <= MAX_COUNT

  const toggle = (id: TopicId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const run = async (opts: GenerateOptions) => {
    if (busy || !countValid) return
    setBusy(true)
    setError(null)
    try {
      const lesson = await generatePracticeLesson(opts)
      onStart(lesson)
    } catch {
      setError('Bolt could not draw up the drills. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const runCustom = () => {
    if (selected.size === 0) return
    void run({ topics: [...selected], count: parsedCount })
  }

  const runRecommended = () => {
    const rec = getRecommendation(userId)
    if (!rec) return
    void run({
      topics: rec.topics,
      weights: rec.weights,
      count: parsedCount,
      title: 'Recommended Review',
    })
  }

  return (
    <div className="practice-page">
      <header className="practice-head">
        <h1 className="practice-title">⚡ Bolt's Mixed Drills</h1>
        <p className="practice-sub">
          Pick your targets and Bolt, your mission leader, will generate a fresh, shuffled
          set of problems. Topics are mixed (interleaved) on purpose — switching between
          skills helps them stick.
        </p>
      </header>

      <section className="practice-card">
        <h2 className="practice-heading">How many problems?</h2>
        <div className="count-row">
          <input
            type="number"
            className="count-input"
            min={MIN_COUNT}
            max={MAX_COUNT}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            aria-label="Number of problems"
          />
          <span className="count-help">
            questions ({MIN_COUNT}–{MAX_COUNT})
          </span>
        </div>
        {!countValid && (
          <p className="practice-hint">
            Enter a number from {MIN_COUNT} to {MAX_COUNT}.
          </p>
        )}
      </section>

      <section className="practice-card recommended">
        <h2 className="practice-heading">⭐ Recommended review</h2>
        {hasWeak ? (
          <>
            <p className="rec-line">
              Bolt noticed you had trouble with <b>{weakLabels.join(', ')}</b>. This review
              focuses on those — mixed in with the rest so the skills interleave.
            </p>
            <button
              type="button"
              className="practice-generate rec-btn"
              onClick={runRecommended}
              disabled={busy || !countValid}
            >
              {busy ? 'Bolt is drawing up your review…' : '⭐ Start recommended review'}
            </button>
          </>
        ) : (
          <p className="practice-note">
            Play some lessons first — once Bolt spots the spots you find tricky, a
            personalized review will appear here.
          </p>
        )}
      </section>

      <section className="practice-card">
        <h2 className="practice-heading">Or build your own</h2>
        <div className="topic-grid">
          {PRACTICE_TOPICS.map((t) => {
            const on = selected.has(t.id)
            return (
              <button
                key={t.id}
                type="button"
                className={`topic-chip ${on ? 'on' : ''}`}
                onClick={() => toggle(t.id)}
                aria-pressed={on}
              >
                <span className="topic-check">{on ? '✓' : '+'}</span>
                <span className="topic-text">
                  <span className="topic-label">{t.label}</span>
                  <span className="topic-blurb">{t.blurb}</span>
                </span>
              </button>
            )
          })}
        </div>

        {error && <p className="practice-error">{error}</p>}
        {!isAiEnabled() && (
          <p className="practice-note">
            Bolt's AI is offline, so drills will be generated locally — still fresh and mixed!
          </p>
        )}

        <button
          type="button"
          className="practice-generate"
          onClick={runCustom}
          disabled={selected.size === 0 || busy || !countValid}
        >
          {busy
            ? 'Bolt is drawing up your drills…'
            : `⚡ Generate ${countValid ? parsedCount : ''} drills`}
        </button>
        {selected.size === 0 && (
          <p className="practice-hint">Select at least one topic to deploy.</p>
        )}
      </section>
    </div>
  )
}
