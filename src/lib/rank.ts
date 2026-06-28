/** Competitive rank (Valorant/LoL-style tiers) driven by Rank Points (RP). */
import { doc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { TimeControl } from './pvp'

export interface Tier {
  name: string
  min: number
  color: string
}

export const TIERS: Tier[] = [
  { name: 'Iron', min: 0, color: '#7d7d7d' },
  { name: 'Bronze', min: 200, color: '#cd7f32' },
  { name: 'Silver', min: 500, color: '#c0c7d0' },
  { name: 'Gold', min: 900, color: '#ffd23f' },
  { name: 'Platinum', min: 1400, color: '#2bd9d2' },
  { name: 'Diamond', min: 2000, color: '#b15bff' },
  { name: 'Ascendant', min: 2700, color: '#62d321' },
  { name: 'Immortal', min: 3500, color: '#e23b3b' },
  { name: 'Radiant', min: 4500, color: '#fff3b0' },
]

export interface RankInfo {
  rp: number
  tier: Tier
  next: Tier | null
  /** RP earned within the current tier. */
  intoTier: number
  /** RP span of the current tier (Infinity for the top tier). */
  tierSpan: number
}

export function getRankInfo(rp: number): RankInfo {
  let idx = 0
  for (let i = 0; i < TIERS.length; i++) {
    if (rp >= TIERS[i].min) idx = i
  }
  const tier = TIERS[idx]
  const next = idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  return {
    rp,
    tier,
    next,
    intoTier: rp - tier.min,
    tierSpan: next ? next.min - tier.min : Infinity,
  }
}

/** RP gained on a win (more for shorter time controls) and lost on a defeat. */
export function rpForWin(tc: TimeControl): number {
  return 20 + (3 - tc) * 3 // 1min:26, 2min:23, 3min:20
}
export const RP_LOSS = 15
export const RP_DRAW = 3

const KEY_PREFIX = 'algebraquest_rp_'

export function getRp(userId: string): number {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0
  } catch {
    return 0
  }
}

function setRp(userId: string, rp: number): void {
  try {
    localStorage.setItem(KEY_PREFIX + userId, String(rp))
  } catch {
    // ignore
  }
  // Best-effort mirror to the user doc so rank can surface elsewhere later.
  if (isFirebaseConfigured && !userId.startsWith('demo')) {
    void setDoc(doc(db, 'users', userId), { rp, rankUpdatedAt: new Date().toISOString() }, { merge: true }).catch(
      () => {},
    )
  }
}

export type MatchOutcome = 'win' | 'loss' | 'draw'

/** Apply a match result to the player's RP; returns the new total (floored at 0). */
export function applyRankResult(userId: string, outcome: MatchOutcome, tc: TimeControl): number {
  const current = getRp(userId)
  const delta = outcome === 'win' ? rpForWin(tc) : outcome === 'draw' ? RP_DRAW : -RP_LOSS
  const next = Math.max(0, current + delta)
  setRp(userId, next)
  return next
}
