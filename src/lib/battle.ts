/** Data + pure helpers for the military math battle (tanks vs. enemy units). */

export type AttackKind = 'damage' | 'heal' | 'shield'

export interface Attack {
  id: string
  name: string
  icon: string
  kind: AttackKind
  /** Base damage before the tank's damage multiplier (damage attacks). */
  damage: number
  /** HP restored (heal attacks). */
  heal?: number
  /** Shield points that absorb the enemy's next hit (shield attacks). */
  shield?: number
  /** Self-damage if the attack misses (overheat on risky ordnance). */
  backfire?: number
  /** If set, a hit makes the enemy skip its next counterattack (stun turns). */
  stun?: number
  /** Turns this attack is locked after use (0 = always ready). */
  cooldown: number
  /** Commander level required to unlock this attack. */
  unlockLevel: number
  color: string
  blurb: string
}

export const ATTACKS: Attack[] = [
  {
    id: 'cannon',
    name: 'Cannon Shot',
    icon: '💥',
    kind: 'damage',
    damage: 22,
    cooldown: 0,
    unlockLevel: 1,
    color: '#ff7a18',
    blurb: 'Reliable main-gun round. Always ready.',
  },
  {
    id: 'smoke',
    name: 'Smoke Screen',
    icon: '🛡️',
    kind: 'shield',
    damage: 0,
    shield: 16,
    cooldown: 2,
    unlockLevel: 1,
    color: '#8a93a3',
    blurb: 'Deploy cover — absorbs the next enemy hit.',
  },
  {
    id: 'drone',
    name: 'Drone Strike',
    icon: '🛩️',
    kind: 'damage',
    damage: 34,
    cooldown: 2,
    unlockLevel: 2,
    color: '#2bd9d2',
    blurb: 'Call in a UAV for heavy precision damage.',
  },
  {
    id: 'repair',
    name: 'Field Repair',
    icon: '🔧',
    kind: 'heal',
    damage: 0,
    heal: 30,
    cooldown: 3,
    unlockLevel: 3,
    color: '#62d321',
    blurb: 'Patch your hull and restore HP.',
  },
  {
    id: 'artillery',
    name: 'Artillery Barrage',
    icon: '🎯',
    kind: 'damage',
    damage: 32,
    backfire: 14,
    cooldown: 3,
    unlockLevel: 4,
    color: '#ffd23f',
    blurb: 'Massive shelling — but a miss overheats YOU.',
  },
  {
    id: 'emp',
    name: 'EMP Blast',
    icon: '⚡',
    kind: 'damage',
    damage: 20,
    stun: 1,
    cooldown: 4,
    unlockLevel: 6,
    color: '#b15bff',
    blurb: 'Fries circuits — enemy skips its next attack.',
  },
  {
    id: 'airstrike',
    name: 'Airstrike',
    icon: '✈️',
    kind: 'damage',
    damage: 55,
    cooldown: 5,
    unlockLevel: 8,
    color: '#e23b3b',
    blurb: 'Devastating bombing run. Late-game finisher.',
  },
]

/** Attacks the commander has unlocked at the given level. */
export function availableAttacks(level: number): Attack[] {
  return ATTACKS.filter((a) => a.unlockLevel <= level)
}

export type EnemyKind = 'drone' | 'jeep' | 'turret' | 'tank' | 'warmachine'

export interface Enemy {
  id: string
  name: string
  kind: EnemyKind
  maxHp: number
  attack: number
  color: string
}

/** Base enemy templates, escalating to a War Machine boss. The actual wave is scaled to
 * the player's level by `buildWave` (fewer, weaker foes early; tougher later). */
export const ENEMY_WAVE: Enemy[] = [
  { id: 'e1', name: 'Recon Drone', kind: 'drone', maxHp: 30, attack: 7, color: '#9aa3b0' },
  { id: 'e2', name: 'Armored Jeep', kind: 'jeep', maxHp: 42, attack: 10, color: '#6b7a3a' },
  { id: 'e3', name: 'Gun Turret', kind: 'turret', maxHp: 55, attack: 13, color: '#7d6b53' },
  { id: 'e4', name: 'Enemy Tank', kind: 'tank', maxHp: 72, attack: 17, color: '#7a2230' },
  { id: 'e5', name: 'War Machine', kind: 'warmachine', maxHp: 95, attack: 22, color: '#3a2550' },
]

/** Chance the enemy whiffs its counterattack entirely (keeps fights survivable). */
export const ENEMY_MISS_CHANCE = 0.28

export function enemyMisses(): boolean {
  return Math.random() < ENEMY_MISS_CHANCE
}

/**
 * Build the wave for a given commander level: 3 foes early, scaling up to a max of 5,
 * with HP/attack ramping gently so it stays winnable but challenging.
 */
export function buildWave(level: number): Enemy[] {
  const count = Math.min(5, Math.max(3, 2 + Math.ceil(level / 2)))
  const hpScale = 1 + Math.max(0, level - 1) * 0.08
  const atkScale = 1 + Math.max(0, level - 1) * 0.06
  return ENEMY_WAVE.slice(0, count).map((e) => ({
    ...e,
    maxHp: Math.round(e.maxHp * hpScale),
    attack: Math.round(e.attack * atkScale),
  }))
}

/** Base critical-hit chance before the tank's bonus. */
export const BASE_CRIT = 0.18

export interface DamageResult {
  damage: number
  crit: boolean
}

/** Roll damage for a hit: base × tank multiplier, with a chance to crit (1.7×). */
export function rollDamage(base: number, damageMult: number, critBonus: number): DamageResult {
  const crit = Math.random() < BASE_CRIT + critBonus
  const dmg = Math.round(base * damageMult * (crit ? 1.7 : 1))
  return { damage: dmg, crit }
}
