import type { UserProgress } from '../types/progress'

/** XP awarded per completed lesson step. */
export const XP_PER_STEP = 20

/** Bonus XP per consecutive correct answer in a session combo (combo of n → +COMBO_BONUS*(n-1)). */
export const COMBO_BONUS = 5

export interface LevelInfo {
  level: number
  totalXp: number
  xpIntoLevel: number
  xpForNext: number
}

export interface Decoration {
  id: string
  name: string
  /** Visual style key used by AvatarDecoration. */
  variant: 'none' | 'neon-ring' | 'cyber-frame' | 'golden-crown'
  unlockLevel: number
  blurb: string
}

export const DECORATIONS: Decoration[] = [
  { id: 'none', name: 'Classic', variant: 'none', unlockLevel: 1, blurb: 'A clean, simple look.' },
  { id: 'neon-ring', name: 'Neon Ring', variant: 'neon-ring', unlockLevel: 2, blurb: 'A glowing electric halo.' },
  { id: 'cyber-frame', name: 'Cyber Frame', variant: 'cyber-frame', unlockLevel: 3, blurb: 'Futuristic tech corners.' },
  { id: 'golden-crown', name: 'Golden Crown', variant: 'golden-crown', unlockLevel: 4, blurb: 'Royalty for top learners.' },
]

/** XP needed to advance FROM the given level to the next one. Grows each level. */
function bandForLevel(level: number): number {
  return level * 50
}

export function totalXpFromProgress(progressList: UserProgress[]): number {
  const steps = progressList.reduce((sum, p) => sum + p.completedSteps.length, 0)
  return steps * XP_PER_STEP
}

export function levelInfoFromXp(totalXp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, totalXp)
  let band = bandForLevel(level)
  while (remaining >= band) {
    remaining -= band
    level += 1
    band = bandForLevel(level)
  }
  return { level, totalXp, xpIntoLevel: remaining, xpForNext: band }
}

export function unlockedDecorationIds(level: number): string[] {
  return DECORATIONS.filter((d) => d.unlockLevel <= level).map((d) => d.id)
}

export function getDecoration(id: string): Decoration {
  return DECORATIONS.find((d) => d.id === id) ?? DECORATIONS[0]
}

/** Decorations newly unlocked exactly at this level (for the level-up reward picker). */
export function rewardsForLevel(level: number): Decoration[] {
  const unlocked = DECORATIONS.filter((d) => d.unlockLevel <= level && d.id !== 'none')
  // Show up to 3 most recent unlocks as the prize choices.
  return unlocked.slice(-3)
}
