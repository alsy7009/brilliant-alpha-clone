import { useEffect, useRef, useState } from 'react'
import { askTutor, tutorOpener, TUTOR_NAME, type ChatMsg, type TutorContext } from '../../lib/ai'
import './TutorChat.css'

interface TutorChatProps {
  context: TutorContext
  onClose: () => void
  /** Stable id for this chat (e.g. the step id) so the session survives closing. */
  sessionId: string
}

const SESSION_PREFIX = 'bolt-chat:'

function loadSession(id: string): ChatMsg[] {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + id)
    return raw ? (JSON.parse(raw) as ChatMsg[]) : []
  } catch {
    return []
  }
}

function saveSession(id: string, messages: ChatMsg[]) {
  try {
    sessionStorage.setItem(SESSION_PREFIX + id, JSON.stringify(messages))
  } catch {
    // storage full or unavailable — chat just won't persist, no big deal
  }
}

function BoltFace() {
  return (
    <svg viewBox="0 0 24 24" className="bolt-face" aria-hidden="true">
      <rect x="4" y="6" width="16" height="13" rx="2" fill="#2bd9d2" stroke="#141026" strokeWidth="2" />
      <rect x="9" y="1" width="2" height="4" fill="#141026" />
      <rect x="13" y="1" width="2" height="4" fill="#141026" />
      <rect x="7.5" y="10" width="3.5" height="3.5" fill="#141026" />
      <rect x="13" y="10" width="3.5" height="3.5" fill="#141026" />
      <rect x="9" y="15.5" width="6" height="1.6" fill="#141026" />
    </svg>
  )
}

export function TutorChat({ context, onClose, sessionId }: TutorChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>(() => loadSession(sessionId))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const openedRef = useRef(false)

  useEffect(() => {
    if (openedRef.current) return
    openedRef.current = true
    // Resume a saved session instead of greeting again.
    if (messages.length > 0) return
    setBusy(true)
    tutorOpener(context)
      .then((reply) => setMessages([{ role: 'assistant', content: reply }]))
      .catch(() =>
        setMessages([
          {
            role: 'assistant',
            content: `${TUTOR_NAME} here, mission leader on comms ⚡ Tell me where you're stuck, recruit, and we'll clear this objective together.`,
          },
        ]),
      )
      .finally(() => setBusy(false))
  }, [context, messages.length])

  useEffect(() => {
    if (messages.length > 0) saveSession(sessionId, messages)
  }, [sessionId, messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, busy])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const history = messages
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setBusy(true)
    try {
      const reply = await askTutor(history, context, text)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oops, my circuits glitched! Try asking me again. ⚡' },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tutor-overlay" role="dialog" aria-modal="true" aria-label={`Chat with ${TUTOR_NAME}`}>
      <div className="tutor-modal">
        <div className="tutor-header">
          <span className="tutor-avatar">
            <BoltFace />
          </span>
          <div className="tutor-id">
            <span className="tutor-title">{TUTOR_NAME}</span>
            <span className="tutor-tag">mission leader</span>
          </div>
          <button type="button" className="tutor-close" onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        </div>

        <div className="tutor-messages" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`tutor-msg tutor-${m.role}`}>
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="tutor-msg tutor-assistant tutor-typing">{TUTOR_NAME} is reading the mission…</div>
          )}
        </div>

        <form
          className="tutor-input-row"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${TUTOR_NAME}…`}
            disabled={busy}
            autoComplete="off"
          />
          <button type="submit" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
