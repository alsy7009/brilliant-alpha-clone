import { useState } from 'react'
import type { Lesson } from '../../types/lesson'
import { isAiEnabled } from '../../lib/ai'
import {
  generatePracticeLesson,
  PRACTICE_TOPICS,
  type TopicId,
} from '../../lib/practice'
import './PracticePage.css'

interface PracticePageProps {
  onStart: (lesson: Lesson) => void
}

const COUNT_OPTIONS = [6, 9, 12]

export function PracticePage({ onStart }: PracticePageProps) {
  const [selected, setSelected] = useState<Set<TopicId>>(new Set())
  const [count, setCount] = useState(6)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: TopicId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const generate = async () => {
    if (selected.size === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const lesson = await generatePracticeLesson({
        topics: [...selected],
        count,
      })
      onStart(lesson)
    } catch {
      setError('Bolt could not draw up the drills. Try again in a moment.')
    } finally {
      setBusy(false)
    }
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
        <h2 className="practice-heading">Choose your topics</h2>
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

        <h2 className="practice-heading">How many problems?</h2>
        <div className="count-row">
          {COUNT_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={`count-chip ${count === c ? 'on' : ''}`}
              onClick={() => setCount(c)}
            >
              {c}
            </button>
          ))}
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
          onClick={() => void generate()}
          disabled={selected.size === 0 || busy}
        >
          {busy ? 'Bolt is drawing up your drills…' : `⚡ Generate ${count} drills`}
        </button>
        {selected.size === 0 && (
          <p className="practice-hint">Select at least one topic to deploy.</p>
        )}
      </section>
    </div>
  )
}
