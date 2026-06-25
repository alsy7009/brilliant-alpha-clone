import { useGamification } from '../../context/GamificationContext'
import './GoalsCard.css'

export function GoalsCard() {
  const { goals } = useGamification()

  return (
    <section className="goals-card">
      <h3 className="goals-heading">★ Daily Goal</h3>
      <ul className="goals-list">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.progress / g.target) * 100))
          return (
            <li key={g.id} className={`goal-row ${g.claimed ? 'claimed' : ''}`}>
              <div className="goal-top">
                <span className="goal-label">{g.label}</span>
                <span className="goal-reward">{g.claimed ? '✓ +' + g.reward : '+' + g.reward + ' XP'}</span>
              </div>
              <div className="goal-track">
                <div className="goal-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="goal-progress">
                {Math.min(g.progress, g.target)} / {g.target}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
