const STORAGE_KEY = 'activelearn_progress'

function toDateKey(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return d.getTime()
}

export function computeStreak(
  streakCount: number,
  lastActiveTimestamp: string | null,
  now = new Date(),
): { streakCount: number; lastActiveTimestamp: string } {
  const today = toDateKey(now)

  if (!lastActiveTimestamp) {
    return { streakCount: 1, lastActiveTimestamp: now.toISOString() }
  }

  const lastDate = toDateKey(new Date(lastActiveTimestamp))

  if (lastDate === today) {
    return { streakCount, lastActiveTimestamp: now.toISOString() }
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toDateKey(yesterday)

  if (lastDate === yesterdayKey) {
    return { streakCount: streakCount + 1, lastActiveTimestamp: now.toISOString() }
  }

  return { streakCount: 1, lastActiveTimestamp: now.toISOString() }
}

const STREAK_KEY_PREFIX = 'activelearn_streak_'

interface StreakRecord {
  date: string
  streak: number
}

function readStreak(userId: string): StreakRecord | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY_PREFIX + userId)
    return raw ? (JSON.parse(raw) as StreakRecord) : null
  } catch {
    return null
  }
}

/**
 * Streak for display only — does NOT change anything.
 * 0 if the user has never completed a question, or if a day was missed.
 */
export function getDisplayStreak(userId: string, now = new Date()): number {
  const rec = readStreak(userId)
  if (!rec) return 0
  const today = toDateKey(now)
  const last = toDateKey(new Date(rec.date))
  if (last === today) return rec.streak

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (last === toDateKey(yesterday)) return rec.streak // still alive, continues today

  return 0 // a day was missed → broken
}

/**
 * Call when the learner completes a question. Bumps the daily streak:
 * 0 → 1 on first activity, +1 on a new consecutive day, resets to 1 after a gap.
 */
export function recordActivityStreak(userId: string, now = new Date()): number {
  const rec = readStreak(userId)
  const today = toDateKey(now)

  let streak = 1
  if (rec) {
    const last = toDateKey(new Date(rec.date))
    if (last === today) {
      streak = Math.max(1, rec.streak)
    } else {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      streak = last === toDateKey(yesterday) ? rec.streak + 1 : 1
    }
  }

  localStorage.setItem(STREAK_KEY_PREFIX + userId, JSON.stringify({ date: now.toISOString(), streak }))
  return streak
}

export function isLocalMode(): boolean {
  return !import.meta.env.VITE_FIREBASE_API_KEY
}

export function getLocalUserId(): string {
  const key = 'activelearn_local_uid'
  let uid = localStorage.getItem(key)
  if (!uid) {
    uid = `local_${crypto.randomUUID()}`
    localStorage.setItem(key, uid)
  }
  return uid
}

export { STORAGE_KEY }
