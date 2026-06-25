import { useGamification } from '../../context/GamificationContext'
import './ComboLayer.css'

/**
 * Floating reward popups near the top-center of the screen — combos and goal
 * rewards both surface here.
 */
export function ComboLayer() {
  const { combos } = useGamification()

  return (
    <div className="combo-layer" aria-hidden="true">
      {combos.map((c) => (
        <div key={c.id} className="combo-popup">
          <span className="combo-xp">{c.title}</span>
          {c.subtitle && <span className="combo-multi">{c.subtitle}</span>}
        </div>
      ))}
    </div>
  )
}
