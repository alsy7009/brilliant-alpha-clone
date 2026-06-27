/** Persisted Boss Level state (per user, local). Cleared once the learner scores >= 60%. */

const KEY_PREFIX = 'algebraquest_boss_cleared_'

/** Fraction of correct answers needed to clear the Boss Level. */
export const BOSS_PASS_RATIO = 0.6

export function getBossCleared(userId: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + userId) === '1'
  } catch {
    return false
  }
}

export function setBossCleared(userId: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + userId, '1')
  } catch {
    // ignore storage errors
  }
}
