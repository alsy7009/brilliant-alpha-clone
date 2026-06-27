import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lesson, LessonStep, WidgetState } from '../../types/lesson'
import { generatePracticeLesson, PRACTICE_TOPICS, type TopicId } from '../../lib/practice'
import { initWidgetState } from '../../lib/widgets/widgetState'
import { checkStep, revealAnswer } from '../../lib/widgets/checkStep'
import { recordMastery, recordStruggle, topicForStepType } from '../../lib/weakAreas'
import {
  availableAttacks,
  buildWave,
  enemyMisses,
  rollDamage,
  type Attack,
  type Enemy,
} from '../../lib/battle'
import { baseHpForLevel, camoColor, getTank, type Loadout } from '../../lib/tank'
import { XP_PER_ENEMY } from '../../lib/gamification'
import { useGamification } from '../../context/GamificationContext'
import { StepWidget } from '../StepWidget/StepWidget'
import { EnemyUnit, PlayerTank } from '../Tank/TankSprite'
import './BattleArena.css'

const ALL_TOPIC_IDS = PRACTICE_TOPICS.map((t) => t.id) as TopicId[]
const FULL_CLEAR_BONUS = 25

type Phase = 'loading' | 'choose' | 'cast' | 'resolve' | 'victory' | 'defeat'

interface DamagePopup {
  id: number
  side: 'enemy' | 'player'
  text: string
  crit: boolean
  heal?: boolean
}

interface BattleArenaProps {
  userId: string
  loadout: Loadout
  onExit: () => void
}

export function BattleArena({ userId, loadout, onExit }: BattleArenaProps) {
  const { registerBattleWin, markSession, level } = useGamification()

  const tank = getTank(loadout.tankId)
  const tankColor = camoColor(loadout.camo)
  const maxHp = baseHpForLevel(tank, level)
  const unlocked = availableAttacks(level)

  const [pool, setPool] = useState<LessonStep[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')

  const [wave, setWave] = useState<Enemy[]>(() => buildWave(level))
  const [enemyIndex, setEnemyIndex] = useState(0)
  const [enemyHp, setEnemyHp] = useState(wave[0].maxHp)
  const [playerHp, setPlayerHp] = useState(maxHp)
  const [shield, setShield] = useState(0)
  const [enemyStunned, setEnemyStunned] = useState(false)
  const [defeatedCount, setDefeatedCount] = useState(0)

  const [attack, setAttack] = useState<Attack | null>(null)
  const [widgetState, setWidgetState] = useState<WidgetState | null>(null)
  const [castError, setCastError] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const [enemyDown, setEnemyDown] = useState(false)

  // Cosmetic FX
  const [enemyFx, setEnemyFx] = useState<'hit' | 'crit' | 'attack' | null>(null)
  const [playerFx, setPlayerFx] = useState<'fire' | 'flinch' | null>(null)
  const [shake, setShake] = useState(false)
  const [projectile, setProjectile] = useState<{ dir: 'out' | 'in'; color: string } | null>(null)
  const [popups, setPopups] = useState<DamagePopup[]>([])

  const awardedRef = useRef(false)
  const popupId = useRef(0)
  const timers = useRef<number[]>([])

  const enemy = wave[Math.min(enemyIndex, wave.length - 1)]
  const step = pool.length ? pool[qIndex % pool.length] : null

  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const pushPopup = useCallback((side: 'enemy' | 'player', text: string, crit = false, heal = false) => {
    const id = ++popupId.current
    setPopups((list) => [...list, { id, side, text, crit, heal }])
    after(950, () => setPopups((list) => list.filter((p) => p.id !== id)))
  }, [])

  const loadArena = useCallback(() => {
    setPhase('loading')
    awardedRef.current = false
    const freshWave = buildWave(level)
    setWave(freshWave)
    setEnemyIndex(0)
    setEnemyHp(freshWave[0].maxHp)
    setPlayerHp(maxHp)
    setShield(0)
    setEnemyStunned(false)
    setDefeatedCount(0)
    setAttack(null)
    setCooldowns({})
    setEnemyFx(null)
    setPlayerFx(null)
    setProjectile(null)
    setPopups([])
    setLog([`Enemy contact: ${freshWave[0].name} inbound! (${freshWave.length} hostiles)`])
    return generatePracticeLesson({ topics: ALL_TOPIC_IDS, count: 28, title: 'Battle' }).then(
      (l: Lesson) => {
        setPool(l.steps)
        setQIndex(0)
        setPhase('choose')
      },
    )
  }, [maxHp, level])

  useEffect(() => {
    void loadArena()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Award XP once the battle ends.
  useEffect(() => {
    if ((phase === 'victory' || phase === 'defeat') && !awardedRef.current) {
      awardedRef.current = true
      const bonus = phase === 'victory' ? FULL_CLEAR_BONUS : 0
      registerBattleWin(defeatedCount * XP_PER_ENEMY + bonus)
    }
  }, [phase, defeatedCount, registerBattleWin])

  const waveSize = wave.length

  const pickAttack = (a: Attack) => {
    if ((cooldowns[a.id] ?? 0) > 0) return
    setAttack(a)
    setCastError(null)
    setWidgetState(step ? initWidgetState(step) : null)
    setPhase('cast')
  }

  const fire = () => {
    if (!attack || !step || !widgetState) return
    const check = checkStep(step, widgetState)
    if (check.status === 'incomplete') {
      setCastError('Lock in every value before you fire!')
      return
    }
    const correct = check.status === 'correct'
    const topic = topicForStepType(step.type)
    if (topic) {
      if (correct) recordMastery(userId, topic)
      else recordStruggle(userId, topic)
    }
    markSession()

    // Tick cooldowns, then lock the attack just used.
    setCooldowns((prev) => {
      const next: Record<string, number> = {}
      for (const [id, turns] of Object.entries(prev)) next[id] = Math.max(0, turns - 1)
      if (attack.cooldown > 0) next[attack.id] = attack.cooldown
      return next
    })

    const lines: string[] = []
    let nextEnemyHp = enemyHp
    let nextPlayerHp = playerHp
    let nextShield = shield
    let stunEnemy = false

    // Player fires.
    setPlayerFx('fire')
    after(380, () => setPlayerFx(null))

    if (attack.kind === 'heal') {
      if (correct) {
        const healed = Math.min(maxHp, nextPlayerHp + (attack.heal ?? 0)) - nextPlayerHp
        nextPlayerHp += healed
        lines.push(`🔧 Field Repair restores ${healed} HP!`)
        pushPopup('player', `+${healed}`, false, true)
      } else {
        lines.push('🔧 Repair failed — hull untouched.')
        lines.push(`Correct answer: ${revealAnswer(step)}.`)
      }
    } else if (attack.kind === 'shield') {
      if (correct) {
        nextShield += attack.shield ?? 0
        lines.push(`🛡️ ${attack.name} deployed — absorbs ${attack.shield} damage.`)
      } else {
        lines.push(`🛡️ ${attack.name} misfired — no cover.`)
        lines.push(`Correct answer: ${revealAnswer(step)}.`)
      }
    } else if (correct) {
      const { damage, crit } = rollDamage(attack.damage, tank.damageMult, tank.critBonus)
      nextEnemyHp = Math.max(0, nextEnemyHp - damage)
      lines.push(`${attack.icon} ${attack.name} hits ${enemy.name} for ${damage}!${crit ? ' 💥 CRIT!' : ''}`)
      if (attack.stun) {
        stunEnemy = true
        lines.push('⚡ Enemy systems scrambled — it loses its next turn!')
      }
      setProjectile({ dir: 'out', color: attack.color })
      after(420, () => setProjectile(null))
      after(360, () => {
        setEnemyFx(crit ? 'crit' : 'hit')
        pushPopup('enemy', `-${damage}`, crit)
      })
      after(820, () => setEnemyFx(null))
    } else {
      lines.push(`${attack.icon} ${attack.name} missed the target!`)
      if (attack.backfire) {
        nextPlayerHp = Math.max(0, nextPlayerHp - attack.backfire)
        lines.push(`🔥 Overheat! You take ${attack.backfire} damage.`)
        pushPopup('player', `-${attack.backfire}`)
      }
      lines.push(`Correct answer: ${revealAnswer(step)}.`)
    }

    const killed = nextEnemyHp <= 0

    // Enemy counterattack (if alive and not stunned).
    if (!killed) {
      if (enemyStunned) {
        lines.push(`${enemy.name} is stunned and can't fire!`)
      } else if (enemyMisses()) {
        lines.push(`${enemy.name} fires… and misses!`)
        after(620, () => {
          setEnemyFx('attack')
          setProjectile({ dir: 'in', color: '#8a93a3' })
        })
        after(900, () => pushPopup('player', 'MISS'))
        after(1050, () => setProjectile(null))
        after(1250, () => setEnemyFx(null))
      } else {
        let incoming = enemy.attack
        if (nextShield > 0) {
          const absorbed = Math.min(nextShield, incoming)
          incoming -= absorbed
          nextShield -= absorbed
          if (absorbed > 0) lines.push(`🛡️ Cover absorbs ${absorbed} damage.`)
        }
        if (tank.armor > 0 && incoming > 0) {
          const blocked = Math.min(tank.armor, incoming)
          incoming -= blocked
          if (blocked > 0) lines.push(`🛡️ Armor plating blocks ${blocked}.`)
        }
        if (incoming > 0) {
          nextPlayerHp = Math.max(0, nextPlayerHp - incoming)
          lines.push(`${enemy.name} returns fire for ${incoming}!`)
          const dmg = incoming
          after(620, () => {
            setEnemyFx('attack')
            setProjectile({ dir: 'in', color: '#ff5b5b' })
          })
          after(900, () => {
            setPlayerFx('flinch')
            setShake(true)
            pushPopup('player', `-${dmg}`)
          })
          after(1050, () => setProjectile(null))
          after(1250, () => {
            setEnemyFx(null)
            setPlayerFx(null)
            setShake(false)
          })
        }
      }
    }

    // End-of-turn regen (Vanguard ability).
    if (!killed && tank.regen > 0 && nextPlayerHp > 0 && nextPlayerHp < maxHp) {
      const healed = Math.min(maxHp, nextPlayerHp + tank.regen) - nextPlayerHp
      if (healed > 0) {
        nextPlayerHp += healed
        lines.push(`🔩 Nanorepair regenerates ${healed} HP.`)
      }
    }

    if (killed) {
      lines.push(`💥 ${enemy.name} destroyed!`)
    }

    setEnemyHp(nextEnemyHp)
    setPlayerHp(nextPlayerHp)
    setShield(nextShield)
    setEnemyStunned(stunEnemy)
    setQIndex((i) => i + 1)
    setLog(lines)
    setEnemyDown(killed)
    if (killed) setDefeatedCount((c) => c + 1)

    if (nextPlayerHp <= 0) {
      after(1100, () => setPhase('defeat'))
      setPhase('resolve')
      // brief resolve→defeat so the final hit animation plays
    } else {
      setPhase('resolve')
    }
  }

  const continueAfterResolve = () => {
    if (playerHp <= 0) {
      setPhase('defeat')
      return
    }
    if (enemyDown) {
      if (enemyIndex >= wave.length - 1) {
        setPhase('victory')
        return
      }
      const nextIdx = enemyIndex + 1
      setEnemyIndex(nextIdx)
      setEnemyHp(wave[nextIdx].maxHp)
      setEnemyStunned(false)
      setLog([`Enemy contact: ${wave[nextIdx].name} inbound!`])
    }
    setAttack(null)
    setEnemyDown(false)
    setPhase('choose')
  }

  // ---------- Render ----------
  if (phase === 'loading') {
    return <div className="battle-arena loading">◤ DEPLOYING TO THE FRONT… ◢</div>
  }

  const enemyPct = Math.round((enemyHp / enemy.maxHp) * 100)
  const playerPct = Math.round((playerHp / maxHp) * 100)

  if (phase === 'victory' || phase === 'defeat') {
    const won = phase === 'victory'
    const xp = defeatedCount * XP_PER_ENEMY + (won ? FULL_CLEAR_BONUS : 0)
    return (
      <div className="battle-arena">
        <div className={`battle-end ${won ? 'win' : 'lose'}`}>
          <h1>{won ? '🎖️ MISSION COMPLETE' : '💀 TANK DESTROYED'}</h1>
          <p className="end-sub">
            {won
              ? 'You wiped out the entire enemy convoy!'
              : `You destroyed ${defeatedCount} of ${waveSize} enemy units.`}
          </p>
          <div className="end-xp">+{xp} XP</div>
          <div className="battle-end-actions">
            <button type="button" className="secondary-button" onClick={() => void loadArena()}>
              {won ? 'New mission' : 'Redeploy'}
            </button>
            <button type="button" className="primary-button" onClick={onExit}>
              Return to base
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`battle-arena ${shake ? 'fx-shake' : ''}`}>
      <button type="button" className="text-button battle-quit" onClick={onExit}>
        ← Retreat
      </button>

      {/* Battlefield */}
      <div className="battlefield">
        {projectile && (
          <span
            className={`projectile projectile-${projectile.dir}`}
            style={{ background: projectile.color }}
            aria-hidden="true"
          />
        )}

        {/* Enemy */}
        <div className="combatant enemy-row">
          <div className="combat-info">
            <span className="combat-name">{enemy.name}{enemyStunned && ' ⚡'}</span>
            <div className="hp-track">
              <div className="hp-fill enemy-hp" style={{ width: `${enemyPct}%` }} />
            </div>
            <span className="hp-num">{enemyHp} / {enemy.maxHp}</span>
          </div>
          <div className="sprite-wrap">
            {popups
              .filter((p) => p.side === 'enemy')
              .map((p) => (
                <span key={p.id} className={`dmg-popup ${p.crit ? 'crit' : ''}`}>{p.text}</span>
              ))}
            <EnemyUnit
              kind={enemy.kind}
              color={enemy.color}
              size={130}
              className={`sprite enemy-sprite ${enemyFx === 'hit' ? 'fx-hit' : ''} ${
                enemyFx === 'crit' ? 'fx-crit' : ''
              } ${enemyFx === 'attack' ? 'fx-attack-enemy' : ''}`}
            />
          </div>
        </div>

        {/* Player */}
        <div className="combatant hero-row">
          <div className="sprite-wrap">
            {popups
              .filter((p) => p.side === 'player')
              .map((p) => (
                <span key={p.id} className={`dmg-popup ${p.heal ? 'heal' : ''}`}>{p.text}</span>
              ))}
            <PlayerTank
              kind={tank.id}
              color={tankColor}
              size={130}
              className={`sprite hero-sprite ${playerFx === 'fire' ? 'fx-fire' : ''} ${
                playerFx === 'flinch' ? 'fx-flinch' : ''
              }`}
            />
            {playerFx === 'fire' && <span className="muzzle-flash" aria-hidden="true" />}
          </div>
          <div className="combat-info">
            <span className="combat-name">
              {tank.name} <span className="lvl-tag">LV{level}</span>
              {shield > 0 && <span className="shield-badge">🛡️{shield}</span>}
            </span>
            <div className="hp-track">
              <div className="hp-fill hero-hp" style={{ width: `${playerPct}%` }} />
            </div>
            <span className="hp-num">{playerHp} / {maxHp}</span>
          </div>
        </div>
      </div>

      {/* Battle log */}
      <div className="battle-log">
        {log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {phase === 'choose' && <p className="log-prompt">Choose your attack, Commander!</p>}
      </div>

      {/* Action area */}
      {phase === 'choose' && (
        <div className="arsenal">
          {unlocked.map((a) => {
            const cd = cooldowns[a.id] ?? 0
            const locked = cd > 0
            return (
              <button
                key={a.id}
                type="button"
                className={`attack-btn ${locked ? 'on-cooldown' : ''}`}
                style={{ borderColor: a.color }}
                onClick={() => pickAttack(a)}
                disabled={locked}
              >
                <span className="attack-icon" style={{ background: a.color }}>{a.icon}</span>
                <span className="attack-text">
                  <span className="attack-name">{a.name}</span>
                  <span className="attack-blurb">{a.blurb}</span>
                </span>
                <span className="attack-power">
                  {a.kind === 'heal' ? `+${a.heal}` : a.kind === 'shield' ? `🛡${a.shield}` : a.damage}
                </span>
                {locked && <span className="cooldown-overlay">⏳ {cd}</span>}
              </button>
            )
          })}
          <p className="arena-note">Solve a problem to fire — destroy all {waveSize} units!</p>
        </div>
      )}

      {phase === 'cast' && step && widgetState && attack && (
        <div className="cast-panel">
          <p className="cast-banner" style={{ background: attack.color }}>
            Targeting with {attack.icon} {attack.name} — solve to fire!
          </p>
          <p className="cast-instruction">{step.instruction}</p>
          <StepWidget
            step={step}
            state={widgetState}
            onStateChange={(s) => {
              setWidgetState(s)
              setCastError(null)
            }}
            slotFeedback={null}
          />
          {castError && <p className="cast-error">{castError}</p>}
          <div className="cast-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setAttack(null)
                setPhase('choose')
              }}
            >
              Change attack
            </button>
            <button type="button" className="primary-button" onClick={fire}>
              🎯 Fire!
            </button>
          </div>
        </div>
      )}

      {phase === 'resolve' && (
        <div className="cast-panel">
          <button type="button" className="primary-button wide" onClick={continueAfterResolve}>
            {enemyDown
              ? enemyIndex >= wave.length - 1
                ? 'Claim victory →'
                : 'Next target →'
              : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  )
}
