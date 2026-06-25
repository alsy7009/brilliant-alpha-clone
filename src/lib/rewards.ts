// Bonus XP (from goals + combos) and daily-goal tracking, persisted per user.

function todayStr(now = new Date()): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

const BONUS_PREFIX = 'activelearn_bonus_'
const DAILY_PREFIX = 'activelearn_daily_'

export function getBonusXp(uid: string): number {
  return Number(localStorage.getItem(BONUS_PREFIX + uid) ?? '0') || 0
}

export function setBonusXp(uid: string, value: number): void {
  localStorage.setItem(BONUS_PREFIX + uid, String(value))
}

export interface DailyState {
  date: string
  lessonsToday: number
  claimed: string[]
}

export function getDaily(uid: string): DailyState {
  try {
    const raw = localStorage.getItem(DAILY_PREFIX + uid)
    if (raw) {
      const parsed = JSON.parse(raw) as DailyState
      if (parsed.date === todayStr()) return parsed
    }
  } catch {
    // ignore
  }
  return { date: todayStr(), lessonsToday: 0, claimed: [] }
}

export function setDaily(uid: string, state: DailyState): void {
  localStorage.setItem(DAILY_PREFIX + uid, JSON.stringify(state))
}

export interface Goal {
  id: string
  label: string
  target: number
  reward: number
}

/**
 * The bank of possible daily goals (all measured by lessons completed today).
 * One is chosen each day and cycles through the bank.
 */
export const GOAL_BANK: Goal[] = [
  { id: 'lesson1', label: 'Complete 1 lesson today', target: 1, reward: 50 },
  { id: 'lesson2', label: 'Complete 2 lessons today', target: 2, reward: 120 },
  { id: 'lesson3', label: 'Complete 3 lessons today', target: 3, reward: 200 },
]

/** Deterministically pick today's goal so it's stable per day and cycles daily. */
export function getTodaysGoal(now = new Date()): Goal {
  const epochDays = Math.floor(now.getTime() / 86_400_000)
  return GOAL_BANK[epochDays % GOAL_BANK.length]
}

/** Combo: N first-try-correct answers in a row earns bonus XP. */
export const COMBO_TARGET = 5
export const COMBO_REWARD = 50
