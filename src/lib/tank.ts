/** Player tank classes, camo, and loadout (the military replacement for the avatar). */

export type TankKind = 'scout' | 'ranger' | 'juggernaut' | 'vanguard'

export interface TankClass {
  id: TankKind
  name: string
  blurb: string
  /** Base hull HP at level 1 (further boosted by level). */
  baseHp: number
  /** Multiplier applied to every attack's damage. */
  damageMult: number
  /** Added to the base critical-hit chance. */
  critBonus: number
  /** Flat damage absorbed from every incoming hit. */
  armor: number
  /** HP regenerated automatically at the end of each turn. */
  regen: number
  unlockLevel: number
  ability: string
  icon: string
}

export const TANKS: TankClass[] = [
  {
    id: 'ranger',
    name: 'Ranger',
    blurb: 'Balanced all-rounder. Reliable in any firefight.',
    baseHp: 100,
    damageMult: 1.0,
    critBonus: 0.05,
    armor: 1,
    regen: 0,
    unlockLevel: 1,
    ability: 'Field Kit — balanced stats with light armor.',
    icon: '🚙',
  },
  {
    id: 'scout',
    name: 'Scout',
    blurb: 'Fast with deadly aim, but lightly armored.',
    baseHp: 80,
    damageMult: 0.95,
    critBonus: 0.22,
    armor: 0,
    regen: 0,
    unlockLevel: 2,
    ability: 'Recon Optics — +22% critical-hit chance.',
    icon: '🛻',
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    blurb: 'Heavy hitter wrapped in thick plating.',
    baseHp: 150,
    damageMult: 1.25,
    critBonus: 0,
    armor: 5,
    regen: 0,
    unlockLevel: 4,
    ability: 'Armor Plating — blocks 5 damage from every hit.',
    icon: '🚜',
  },
  {
    id: 'vanguard',
    name: 'Vanguard',
    blurb: 'Elite hover-tank that repairs itself mid-battle.',
    baseHp: 120,
    damageMult: 1.15,
    critBonus: 0.1,
    armor: 2,
    regen: 5,
    unlockLevel: 6,
    ability: 'Nanorepair — regenerates 5 HP every turn.',
    icon: '🛸',
  },
]

export interface ColorOption {
  id: string
  name: string
  color: string
}

export const CAMO: ColorOption[] = [
  { id: 'army', name: 'Army Green', color: '#4b5a23' },
  { id: 'desert', name: 'Desert Tan', color: '#c2a878' },
  { id: 'steel', name: 'Steel Gray', color: '#566170' },
  { id: 'navy', name: 'Navy Blue', color: '#23476b' },
  { id: 'crimson', name: 'Crimson', color: '#8a2433' },
  { id: 'arctic', name: 'Arctic', color: '#c4d0dd' },
]

export interface Loadout {
  tankId: TankKind
  camo: string
}

export const DEFAULT_LOADOUT: Loadout = { tankId: 'ranger', camo: 'army' }

/** Hull HP gained per level on top of the tank's base. */
export const HP_PER_LEVEL = 8

export function getTank(id: string): TankClass {
  return TANKS.find((t) => t.id === id) ?? TANKS[0]
}

export function camoColor(id: string): string {
  return CAMO.find((c) => c.id === id)?.color ?? CAMO[0].color
}

export function baseHpForLevel(tank: TankClass, level: number): number {
  return tank.baseHp + Math.max(0, level - 1) * HP_PER_LEVEL
}

const KEY_PREFIX = 'algebraquest_loadout_'

export function getLoadout(userId: string): Loadout {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    if (!raw) return { ...DEFAULT_LOADOUT }
    const parsed = JSON.parse(raw) as Partial<Loadout>
    return {
      tankId: TANKS.some((t) => t.id === parsed.tankId) ? (parsed.tankId as TankKind) : DEFAULT_LOADOUT.tankId,
      camo: CAMO.some((c) => c.id === parsed.camo) ? (parsed.camo as string) : DEFAULT_LOADOUT.camo,
    }
  } catch {
    return { ...DEFAULT_LOADOUT }
  }
}

export function setLoadout(userId: string, loadout: Loadout): void {
  try {
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(loadout))
  } catch {
    // ignore storage errors
  }
}
