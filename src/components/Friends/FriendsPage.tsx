import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LESSONS } from '../../content/catalog'

const LESSON_IDS = new Set(LESSONS.map((l) => l.lessonId))
import { isDemoMode } from '../../lib/auth'
import { getDecoration } from '../../lib/gamification'
import {
  acceptFriendRequest,
  denyFriendRequest,
  getFriends,
  getIncomingRequests,
  sendFriendRequest,
  type FriendProfile,
  type FriendRequest,
} from '../../lib/friends'
import { AvatarDecoration } from '../Gamification/AvatarDecoration'
import { LevelBadge } from '../Gamification/LevelBadge'
import { StreakFlame } from '../Gamification/StreakFlame'
import './FriendsPage.css'

interface FriendsPageProps {
  me: { uid: string; name: string; email: string; photoURL?: string }
}

export function FriendsPage({ me }: FriendsPageProps) {
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FriendProfile | null>(null)

  const refresh = useCallback(async () => {
    const [f, inc] = await Promise.all([getFriends(me.uid), getIncomingRequests(me.uid)])
    setFriends(f)
    setIncoming(inc)
    setLoading(false)
  }, [me.uid])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (isDemoMode()) {
    return (
      <div className="friends-page">
        <h1 className="friends-title">★ Friends</h1>
        <p className="friends-demo">Sign in with an account to add friends and compare stats.</p>
      </div>
    )
  }

  if (selected) {
    const earned = new Set(selected.completedLessons.filter((id) => LESSON_IDS.has(id)))
    const deco = getDecoration(selected.equippedDecoration)
    return (
      <div className="friends-page">
        <button type="button" className="friend-back" onClick={() => setSelected(null)}>
          ← Back to friends
        </button>

        <section className="friends-card friend-detail-card">
          <AvatarDecoration
            name={selected.displayName}
            photoURL={selected.photoURL}
            variant={deco.variant}
            size={108}
          />
          <h2 className="friend-detail-name">{selected.displayName}</h2>
          <div className="friend-detail-badges">
            <span className="friend-badge">
              <LevelBadge level={selected.level} size="sm" /> Lv {selected.level}
            </span>
            <span className="friend-badge">
              <StreakFlame streak={selected.streak} size={20} /> streak
            </span>
            <span className="friend-badge">{selected.totalXp} XP</span>
          </div>
        </section>

        <section className="friends-card">
          <h3 className="friends-heading">
            Trophies <span className="friends-count">{earned.size}</span>
          </h3>
          {earned.size === 0 ? (
            <p className="friends-demo">No trophies earned yet.</p>
          ) : (
            <div className="trophy-scroll">
              {LESSONS.filter((lesson) => earned.has(lesson.lessonId)).map((lesson) => (
                <div key={lesson.lessonId} className="trophy-card earned">
                  <span className="trophy-emblem" aria-hidden="true">🏆</span>
                  <span className="trophy-name">{lesson.title}</span>
                  <span className="trophy-state">Earned</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  const handleSend = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setBusy(true)
    try {
      const res = await sendFriendRequest(me, email)
      if (res.ok) {
        setMessage(res.message)
        setEmail('')
      } else {
        setError(res.message)
      }
    } catch {
      setError('Could not send request. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleAccept = async (req: FriendRequest) => {
    setBusy(true)
    try {
      await acceptFriendRequest(req, me.uid)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleDeny = async (req: FriendRequest) => {
    setBusy(true)
    try {
      await denyFriendRequest(req)
      setIncoming((prev) => prev.filter((r) => r.id !== req.id))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="friends-page">
      <h1 className="friends-title">★ Friends</h1>

      {/* Add a friend */}
      <section className="friends-card">
        <h3 className="friends-heading">Add a friend</h3>
        <form onSubmit={handleSend} className="friends-add">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend's email"
            autoComplete="off"
            required
          />
          <button type="submit" className="friends-send" disabled={busy}>
            Send request
          </button>
        </form>
        {message && <p className="friends-ok">{message}</p>}
        {error && <p className="friends-err">{error}</p>}
      </section>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section className="friends-card">
          <h3 className="friends-heading">
            Friend requests <span className="friends-count">{incoming.length}</span>
          </h3>
          <ul className="friends-list">
            {incoming.map((req) => (
              <li key={req.id} className="friend-row">
                <AvatarDecoration name={req.fromName} photoURL={req.fromPhotoURL} variant="none" size={44} />
                <div className="friend-info">
                  <span className="friend-name">{req.fromName}</span>
                  <span className="friend-sub">{req.fromEmail}</span>
                </div>
                <div className="friend-actions">
                  <button type="button" className="req-accept" onClick={() => handleAccept(req)} disabled={busy}>
                    Accept
                  </button>
                  <button type="button" className="req-deny" onClick={() => handleDeny(req)} disabled={busy}>
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Friends list */}
      <section className="friends-card">
        <h3 className="friends-heading">
          Your friends <span className="friends-count">{friends.length}</span>
        </h3>
        {loading ? (
          <p className="friends-demo">Loading…</p>
        ) : friends.length === 0 ? (
          <p className="friends-demo">No friends yet — add one by email above!</p>
        ) : (
          <ul className="friends-list">
            {friends.map((f) => (
              <li key={f.userId}>
                <button
                  type="button"
                  className="friend-row friend-row-button"
                  onClick={() => setSelected(f)}
                >
                  <AvatarDecoration
                    name={f.displayName}
                    photoURL={f.photoURL}
                    variant={getDecoration(f.equippedDecoration).variant}
                    size={52}
                  />
                  <div className="friend-info">
                    <span className="friend-name">{f.displayName}</span>
                    <span className="friend-stats">
                      <LevelBadge level={f.level} size="sm" /> Lv {f.level}
                      <StreakFlame streak={f.streak} size={18} />
                      <span className="friend-xp">{f.totalXp} XP</span>
                    </span>
                    <span className="friend-sub">
                      {f.completedLessons.filter((id) => LESSON_IDS.has(id)).length} missions cleared
                    </span>
                  </div>
                  <span className="friend-chevron" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
