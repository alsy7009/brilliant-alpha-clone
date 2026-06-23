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
