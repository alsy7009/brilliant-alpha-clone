import { useGamification } from '../../context/GamificationContext'
import './ComboLayer.css'

/**
 * Renders floating "+XP Combo!" popups anchored near the top-center of the
 * active lesson area. Driven by the gamification combo queue.
 */
export function ComboLayer() {
  const { combos } = useGamification()

  return (
    <div className="combo-layer" aria-hidden="true">
      {combos.map((c) => (
        <div key={c.id} className="combo-popup">
          <span className="combo-xp">+{c.xp} XP</span>
          {c.combo > 1 && <span className="combo-multi">{c.combo}× Combo!</span>}
        </div>
      ))}
    </div>
  )
}
