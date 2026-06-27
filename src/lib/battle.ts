/** Data + pure helpers for the math battle arena (Prodigy-style). */

export type Element = 'fire' | 'ice' | 'bolt' | 'heal'

export interface Spell {
  id: string
  name: string
  icon: string
  element: Element
  /** Base damage dealt on a correct cast (heal spells use `heal` instead). */
  damage: number
  /** HP restored (heal spell). */
  heal?: number
  /** Shield points that absorb the enemy's next hit (frost). */
  shield?: number
  /** Self-damage if the cast misses (high-risk spells). */
  backfire?: number
  color: string
  blurb: string
}

export const SPELLS: Spell[] = [
  {
    id: 'fireball',
    name: 'Fireball',
    icon: '🔥',
    element: 'fire',
    damage: 22,
    color: '#ff7a18',
    blurb: 'Reliable blast of flame.',
  },
  {
    id: 'frost',
    name: 'Frost Shield',
    icon: '❄️',
    element: 'ice',
    damage: 14,
    shield: 12,
    color: '#2bd9d2',
    blurb: 'Hits + blocks the next attack.',
  },
  {
    id: 'thunder',
    name: 'Thunderstrike',
    icon: '⚡',
    element: 'bolt',
    damage: 38,
    backfire: 16,
    color: '#ffd23f',
    blurb: 'Huge damage — but a miss shocks YOU.',
  },
  {
    id: 'mend',
    name: 'Mend',
    icon: '✨',
    element: 'heal',
    damage: 0,
    heal: 26,
    color: '#62d321',
    blurb: 'Restore your own HP.',
  },
]

export type MonsterKind = 'slime' | 'bat' | 'golem' | 'dragon'

export interface Enemy {
  id: string
  name: string
  kind: MonsterKind
  maxHp: number
  attack: number
  color: string
}

/** The wave of foes, escalating to a dragon boss. */
export const ENEMY_WAVE: Enemy[] = [
  { id: 'e1', name: 'Goo Slime', kind: 'slime', maxHp: 45, attack: 8, color: '#62d321' },
  { id: 'e2', name: 'Cave Bat', kind: 'bat', maxHp: 60, attack: 12, color: '#b15bff' },
  { id: 'e3', name: 'Stone Golem', kind: 'golem', maxHp: 85, attack: 16, color: '#9aa3b0' },
  { id: 'e4', name: 'Ember Dragon', kind: 'dragon', maxHp: 120, attack: 22, color: '#e23b3b' },
]

export const PLAYER_MAX_HP = 100

export interface CastResult {
  damage: number
  crit: boolean
}

/** Damage for a correct cast: base spell damage, with a chance to crit. */
export function rollDamage(spell: Spell): CastResult {
  const crit = Math.random() < 0.28
  const dmg = Math.round(spell.damage * (crit ? 1.7 : 1))
  return { damage: dmg, crit }
}
