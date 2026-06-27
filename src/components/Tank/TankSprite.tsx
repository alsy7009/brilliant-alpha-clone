import type { ReactNode } from 'react'
import type { EnemyKind } from '../../lib/battle'
import { camoColor, getTank, type Loadout, type TankKind } from '../../lib/tank'
import type { Decoration } from '../../lib/gamification'
import { AvatarDecoration } from '../Gamification/AvatarDecoration'

const INK = '#141026'
const TREAD = '#2b2f38'
const WHEEL = '#15171d'
const STEEL = '#3a4150'

interface TankProps {
  kind: TankKind
  color: string
  size?: number
  className?: string
}

function Treads() {
  return (
    <g>
      <rect x="10" y="50" width="78" height="16" rx="8" fill={TREAD} stroke={INK} strokeWidth="3" />
      {[20, 32, 44, 56, 68, 80].map((cx) => (
        <circle key={cx} cx={cx} cy="58" r="4.5" fill={WHEEL} stroke={INK} strokeWidth="2" />
      ))}
    </g>
  )
}

/** The player's tank, facing right toward the enemy. Hull is painted in the chosen camo. */
export function PlayerTank({ kind, color, size = 120, className }: TankProps) {
  return (
    <svg viewBox="0 0 104 72" width={size} height={size * 0.69} className={className} role="img" aria-label={`${kind} tank`}>
      {kind === 'scout' && (
        <g>
          <Treads />
          <path d="M22 50 L26 40 L74 40 L80 50 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="48" cy="38" r="11" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="56" y="35" width="40" height="5" rx="2.5" fill={STEEL} stroke={INK} strokeWidth="2" />
          <line x1="44" y1="30" x2="40" y2="20" stroke={INK} strokeWidth="2" />
          <circle cx="40" cy="19" r="2" fill="#ffd23f" />
        </g>
      )}
      {kind === 'ranger' && (
        <g>
          <Treads />
          <path d="M16 50 L20 38 L82 38 L86 50 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="36" y="24" width="30" height="16" rx="4" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="62" y="29" width="38" height="6" rx="3" fill={STEEL} stroke={INK} strokeWidth="2" />
          <rect x="42" y="28" width="8" height="5" rx="1.5" fill={STEEL} stroke={INK} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'juggernaut' && (
        <g>
          <rect x="6" y="48" width="88" height="18" rx="9" fill={TREAD} stroke={INK} strokeWidth="3" />
          {[16, 28, 40, 52, 64, 76, 86].map((cx) => (
            <circle key={cx} cx={cx} cy="57" r="5" fill={WHEEL} stroke={INK} strokeWidth="2" />
          ))}
          <path d="M10 48 L14 34 L90 34 L94 48 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="14" y="38" width="8" height="8" fill={STEEL} stroke={INK} strokeWidth="2" />
          <rect x="80" y="38" width="8" height="8" fill={STEEL} stroke={INK} strokeWidth="2" />
          <rect x="30" y="16" width="38" height="20" rx="4" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="62" y="20" width="40" height="8" rx="4" fill={STEEL} stroke={INK} strokeWidth="2.5" />
          <rect x="62" y="29" width="34" height="5" rx="2.5" fill={STEEL} stroke={INK} strokeWidth="2" />
        </g>
      )}
      {kind === 'vanguard' && (
        <g>
          <ellipse cx="50" cy="64" rx="36" ry="6" fill="#2bd9d2" opacity="0.35" />
          <rect x="18" y="56" width="64" height="6" rx="3" fill="#2bd9d2" stroke={INK} strokeWidth="2" />
          <path d="M20 52 L30 38 L74 38 L86 52 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M40 38 L46 26 L66 26 L70 38 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="64" y="29" width="38" height="6" rx="3" fill={STEEL} stroke={INK} strokeWidth="2" />
          <circle cx="53" cy="32" r="3" fill="#2bd9d2" stroke={INK} strokeWidth="1.5" />
        </g>
      )}
    </svg>
  )
}

interface EnemyProps {
  kind: EnemyKind
  color: string
  size?: number
  className?: string
}

/** Enemy units, facing left toward the player. */
export function EnemyUnit({ kind, color, size = 120, className }: EnemyProps) {
  return (
    <svg viewBox="0 0 104 80" width={size} height={size * 0.77} className={className} role="img" aria-label={`${kind} enemy`}>
      {kind === 'drone' && (
        <g>
          <line x1="30" y1="30" x2="74" y2="30" stroke={INK} strokeWidth="3" />
          <line x1="52" y1="22" x2="52" y2="40" stroke={INK} strokeWidth="3" />
          <ellipse cx="28" cy="28" rx="12" ry="4" fill={STEEL} stroke={INK} strokeWidth="2" />
          <ellipse cx="76" cy="28" rx="12" ry="4" fill={STEEL} stroke={INK} strokeWidth="2" />
          <rect x="40" y="34" width="24" height="16" rx="5" fill={color} stroke={INK} strokeWidth="3" />
          <circle cx="48" cy="42" r="3" fill="#e23b3b" stroke={INK} strokeWidth="1.5" />
          <rect x="30" y="48" width="10" height="4" rx="2" fill={STEEL} stroke={INK} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'jeep' && (
        <g>
          <circle cx="34" cy="62" r="9" fill={WHEEL} stroke={INK} strokeWidth="3" />
          <circle cx="72" cy="62" r="9" fill={WHEEL} stroke={INK} strokeWidth="3" />
          <path d="M20 56 L26 42 L82 42 L86 56 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="40" y="34" width="22" height="10" rx="2" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="6" y="36" width="34" height="5" rx="2.5" fill={STEEL} stroke={INK} strokeWidth="2" />
        </g>
      )}
      {kind === 'turret' && (
        <g>
          <path d="M28 68 L24 54 L80 54 L76 68 Z" fill={STEEL} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="52" cy="48" r="16" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="6" y="44" width="44" height="7" rx="3.5" fill={STEEL} stroke={INK} strokeWidth="2.5" />
          <circle cx="52" cy="48" r="5" fill="#e23b3b" stroke={INK} strokeWidth="2" />
        </g>
      )}
      {kind === 'tank' && (
        <g>
          <rect x="16" y="54" width="78" height="16" rx="8" fill={TREAD} stroke={INK} strokeWidth="3" />
          {[26, 38, 50, 62, 74, 86].map((cx) => (
            <circle key={cx} cx={cx} cy="62" r="4.5" fill={WHEEL} stroke={INK} strokeWidth="2" />
          ))}
          <path d="M24 54 L28 42 L90 42 L94 54 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="44" y="28" width="30" height="16" rx="4" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="6" y="33" width="40" height="6" rx="3" fill={STEEL} stroke={INK} strokeWidth="2" />
        </g>
      )}
      {kind === 'warmachine' && (
        <g>
          <rect x="10" y="56" width="88" height="18" rx="9" fill={TREAD} stroke={INK} strokeWidth="3" />
          {[20, 32, 44, 56, 68, 80, 90].map((cx) => (
            <circle key={cx} cx={cx} cy="65" r="5" fill={WHEEL} stroke={INK} strokeWidth="2" />
          ))}
          <path d="M16 56 L22 40 L92 40 L98 56 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="40" y="18" width="42" height="24" rx="5" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="4" y="22" width="44" height="7" rx="3.5" fill={STEEL} stroke={INK} strokeWidth="2.5" />
          <rect x="4" y="32" width="44" height="7" rx="3.5" fill={STEEL} stroke={INK} strokeWidth="2.5" />
          <circle cx="62" cy="29" r="5" fill="#ff3b3b" stroke={INK} strokeWidth="2" />
          <circle cx="74" cy="29" r="5" fill="#ff3b3b" stroke={INK} strokeWidth="2" />
          <path d="M44 18 L50 10 L56 18 Z" fill={STEEL} stroke={INK} strokeWidth="2" />
          <path d="M66 18 L72 10 L78 18 Z" fill={STEEL} stroke={INK} strokeWidth="2" />
        </g>
      )}
    </svg>
  )
}

/** A round avatar badge whose "face" is the player's selected tank (used in nav, profile, etc.). */
export function TankBadge({
  loadout,
  variant = 'none',
  size = 72,
}: {
  loadout: Loadout
  variant?: Decoration['variant']
  size?: number
}): ReactNode {
  const tank = getTank(loadout.tankId)
  return (
    <AvatarDecoration
      variant={variant}
      size={size}
      face={
        <span
          aria-hidden="true"
          style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}
        >
          <PlayerTank kind={tank.id} color={camoColor(loadout.camo)} size={Math.round(size * 0.82)} />
        </span>
      }
    />
  )
}
