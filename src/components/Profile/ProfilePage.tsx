import { LESSONS } from '../../content/catalog'
import { useGamification } from '../../context/GamificationContext'
import type { UserProgress } from '../../types/progress'
import {
  baseHpForLevel,
  CAMO,
  camoColor,
  getTank,
  TANKS,
  type Loadout,
  type TankKind,
} from '../../lib/tank'
import { ATTACKS, BASE_CRIT } from '../../lib/battle'
import { PlayerTank, TankBadge } from '../Tank/TankSprite'
import { LevelBadge } from '../Gamification/LevelBadge'
import { StreakFlame } from '../Gamification/StreakFlame'
import { XpBar } from '../Gamification/XpBar'
import './ProfilePage.css'

interface ProfilePageProps {
  displayName?: string
  progressList: UserProgress[]
  loadout: Loadout
  onLoadoutChange: (next: Loadout) => void
}

export function ProfilePage({
  displayName,
  progressList,
  loadout,
  onLoadoutChange,
}: ProfilePageProps) {
  const {
    level,
    xpIntoLevel,
    xpForNext,
    totalXp,
    streak,
    decorations,
    unlockedIds,
    equippedId,
    equip,
  } = useGamification()

  const tank = getTank(loadout.tankId)

  const masteredCount = LESSONS.filter(
    (l) => progressList.find((p) => p.lessonId === l.lessonId)?.isCompleted,
  ).length

  const selectTank = (id: TankKind) => onLoadoutChange({ ...loadout, tankId: id })
  const selectCamo = (id: string) => onLoadoutChange({ ...loadout, camo: id })

  return (
    <div className="profile-page">
      <h1 className="profile-title">★ Command Center</h1>

      <div className="profile-grid">
        {/* Commander card */}
        <section className="profile-card">
          <div className="commander-tank">
            <PlayerTank kind={tank.id} color={camoColor(loadout.camo)} size={150} />
          </div>
          <h2 className="profile-name">{displayName ?? 'Commander'}</h2>
          <p className="commander-tankname">{tank.name} · {baseHpForLevel(tank, level)} HP</p>
          <div className="profile-badges">
            <span className="profile-badge">
              <LevelBadge level={level} size="sm" /> LVL {level}
            </span>
            <span className="profile-badge">
              <StreakFlame streak={streak} size={22} /> streak
            </span>
            <span className="profile-badge">{totalXp} XP</span>
          </div>
          <div className="profile-xp">
            <XpBar level={level} xpIntoLevel={xpIntoLevel} xpForNext={xpForNext} />
          </div>
        </section>

        {/* Tank hangar */}
        <section className="profile-character">
          <h3 className="section-heading">Tank Hangar</h3>
          <div className="tank-grid">
            {TANKS.map((t) => {
              const locked = level < t.unlockLevel
              const selected = loadout.tankId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`tank-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                  onClick={() => !locked && selectTank(t.id)}
                  disabled={locked}
                >
                  <div className="tank-card-art">
                    <PlayerTank kind={t.id} color={camoColor(loadout.camo)} size={84} />
                  </div>
                  <span className="tank-card-name">{t.name}</span>
                  <div className="tank-stats">
                    <span>{baseHpForLevel(t, level)} HP</span>
                    <span>{t.damageMult}× DMG</span>
                    <span>{Math.round((BASE_CRIT + t.critBonus) * 100)}% Crit</span>
                  </div>
                  <span className="tank-ability">{t.ability}</span>
                  {locked && <span className="tank-lock">🔒 Unlocks at LVL {t.unlockLevel}</span>}
                  {selected && !locked && <span className="tank-deployed">✓ Deployed</span>}
                </button>
              )
            })}
          </div>

          <p className="customizer-label">Camo</p>
          <div className="customizer-row">
            {CAMO.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`swatch ${loadout.camo === c.id ? 'selected' : ''}`}
                style={{ background: c.color }}
                onClick={() => selectCamo(c.id)}
                title={c.name}
                aria-label={c.name}
              />
            ))}
          </div>
        </section>

        {/* Arsenal */}
        <section className="profile-arsenal">
          <h3 className="section-heading">Arsenal</h3>
          <p className="arsenal-hint">Rank up to unlock heavier ordnance.</p>
          <div className="arsenal-list">
            {ATTACKS.map((a) => {
              const locked = level < a.unlockLevel
              return (
                <div key={a.id} className={`arsenal-item ${locked ? 'locked' : ''}`}>
                  <span className="arsenal-icon" style={{ background: locked ? '#b9bec7' : a.color }}>
                    {a.icon}
                  </span>
                  <span className="arsenal-info">
                    <span className="arsenal-name">{a.name}</span>
                    <span className="arsenal-blurb">{a.blurb}</span>
                  </span>
                  <span className="arsenal-status">
                    {locked ? `LVL ${a.unlockLevel}` : '✓'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Insignia (decorations) */}
        <section className="profile-decorations">
          <h3 className="section-heading">Insignia</h3>
          <div className="deco-grid">
            {decorations.map((d) => {
              const unlocked = unlockedIds.includes(d.id)
              const isEquipped = equippedId === d.id
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`deco-option ${isEquipped ? 'equipped' : ''} ${unlocked ? '' : 'locked'}`}
                  onClick={() => unlocked && equip(d.id)}
                  disabled={!unlocked}
                >
                  <TankBadge loadout={loadout} variant={d.variant} size={64} />
                  <span className="deco-name">{d.name}</span>
                  <span className="deco-status">
                    {isEquipped ? 'Equipped' : unlocked ? 'Tap to equip' : `🔒 LVL ${d.unlockLevel}`}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Medals (trophies) */}
        <section className="profile-history">
          <h3 className="section-heading">
            Medals <span className="history-count">{masteredCount}</span>
          </h3>
          {masteredCount === 0 ? (
            <p className="history-empty">No medals yet — clear a mission to earn one!</p>
          ) : (
            <ul className="history-feed">
              {LESSONS.filter(
                (l) => progressList.find((p) => p.lessonId === l.lessonId)?.isCompleted,
              ).map((lesson) => (
                <li key={lesson.lessonId} className="history-item done">
                  <span className="history-icon" aria-hidden="true">🎖️</span>
                  <span className="history-info">
                    <span className="history-name">{lesson.title}</span>
                    <span className="history-sub">CLEARED</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
