/** Local battle win/loss record per user (mirrored to Firestore for friends + leaderboard). */

export interface BattleRecord {
  won: number
  lost: number
}

const KEY_PREFIX = 'algebraquest_battlerec_'

export function getBattleRecord(userId: string): BattleRecord {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    if (!raw) return { won: 0, lost: 0 }
    const parsed = JSON.parse(raw) as Partial<BattleRecord>
    return { won: parsed.won ?? 0, lost: parsed.lost ?? 0 }
  } catch {
    return { won: 0, lost: 0 }
  }
}

export function recordBattleResult(userId: string, won: boolean): BattleRecord {
  const current = getBattleRecord(userId)
  const next: BattleRecord = {
    won: current.won + (won ? 1 : 0),
    lost: current.lost + (won ? 0 : 1),
  }
  try {
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(next))
  } catch {
    // ignore storage errors
  }
  return next
}
