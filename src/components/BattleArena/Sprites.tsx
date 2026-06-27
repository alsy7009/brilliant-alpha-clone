import type { MonsterKind } from '../../lib/battle'

interface MonsterProps {
  kind: MonsterKind
  color: string
  className?: string
}

/** Chunky, friendly-but-tough SVG monsters with simple pixel-ish shapes. */
export function MonsterSprite({ kind, color, className }: MonsterProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={`${kind} monster`}>
      {kind === 'slime' && (
        <g>
          <path d="M18 92 Q14 50 60 46 Q106 50 102 92 Z" fill={color} stroke="#141026" strokeWidth="4" />
          <rect x="18" y="88" width="84" height="8" fill="#141026" opacity="0.15" />
          <circle cx="46" cy="70" r="8" fill="#fff" stroke="#141026" strokeWidth="3" />
          <circle cx="74" cy="70" r="8" fill="#fff" stroke="#141026" strokeWidth="3" />
          <circle cx="46" cy="72" r="3" fill="#141026" />
          <circle cx="74" cy="72" r="3" fill="#141026" />
          <path d="M50 84 Q60 90 70 84" fill="none" stroke="#141026" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {kind === 'bat' && (
        <g>
          <path d="M60 50 L18 34 Q26 56 40 60 Q24 70 30 84 L60 70 L90 84 Q96 70 80 60 Q94 56 102 34 L60 50 Z" fill={color} stroke="#141026" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="60" cy="62" r="20" fill={color} stroke="#141026" strokeWidth="4" />
          <circle cx="53" cy="60" r="5" fill="#fff" stroke="#141026" strokeWidth="2" />
          <circle cx="67" cy="60" r="5" fill="#fff" stroke="#141026" strokeWidth="2" />
          <circle cx="53" cy="61" r="2" fill="#141026" />
          <circle cx="67" cy="61" r="2" fill="#141026" />
          <path d="M54 70 L58 74 L62 70 L66 74" fill="none" stroke="#141026" strokeWidth="2" />
        </g>
      )}
      {kind === 'golem' && (
        <g>
          <rect x="30" y="34" width="60" height="56" rx="8" fill={color} stroke="#141026" strokeWidth="4" />
          <rect x="20" y="48" width="12" height="30" rx="4" fill={color} stroke="#141026" strokeWidth="4" />
          <rect x="88" y="48" width="12" height="30" rx="4" fill={color} stroke="#141026" strokeWidth="4" />
          <rect x="42" y="52" width="14" height="10" fill="#ffd23f" stroke="#141026" strokeWidth="3" />
          <rect x="64" y="52" width="14" height="10" fill="#ffd23f" stroke="#141026" strokeWidth="3" />
          <rect x="44" y="74" width="32" height="6" fill="#141026" />
          <path d="M40 30 L48 38 M60 28 L60 38 M80 30 L72 38" stroke="#141026" strokeWidth="3" />
        </g>
      )}
      {kind === 'dragon' && (
        <g>
          <path d="M30 40 Q10 30 16 58 Q22 50 32 54 Z" fill={color} stroke="#141026" strokeWidth="4" />
          <path d="M90 40 Q110 30 104 58 Q98 50 88 54 Z" fill={color} stroke="#141026" strokeWidth="4" />
          <ellipse cx="60" cy="66" rx="34" ry="30" fill={color} stroke="#141026" strokeWidth="4" />
          <path d="M44 40 Q60 22 76 40 Z" fill={color} stroke="#141026" strokeWidth="4" />
          <circle cx="50" cy="62" r="7" fill="#ffd23f" stroke="#141026" strokeWidth="3" />
          <circle cx="70" cy="62" r="7" fill="#ffd23f" stroke="#141026" strokeWidth="3" />
          <circle cx="50" cy="63" r="3" fill="#141026" />
          <circle cx="70" cy="63" r="3" fill="#141026" />
          <path d="M48 80 L54 74 L60 80 L66 74 L72 80" fill="none" stroke="#141026" strokeWidth="3" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  )
}

/** The player's wizard hero. */
export function HeroSprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Your wizard">
      <path d="M60 14 L86 64 L34 64 Z" fill="#2f6bff" stroke="#141026" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="60" cy="12" r="6" fill="#ffd23f" stroke="#141026" strokeWidth="3" />
      <rect x="40" y="64" width="40" height="34" rx="6" fill="#b15bff" stroke="#141026" strokeWidth="4" />
      <circle cx="60" cy="78" r="13" fill="#ffe0bd" stroke="#141026" strokeWidth="3" />
      <circle cx="55" cy="77" r="2.5" fill="#141026" />
      <circle cx="65" cy="77" r="2.5" fill="#141026" />
      <path d="M54 84 Q60 88 66 84" fill="none" stroke="#141026" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="86" y="44" width="6" height="58" rx="3" fill="#8b5a2b" stroke="#141026" strokeWidth="3" />
      <circle cx="89" cy="42" r="8" fill="#2bd9d2" stroke="#141026" strokeWidth="3" />
    </svg>
  )
}
