import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lesson, LessonStep, WidgetState } from '../../types/lesson'
import { generatePracticeLesson, PRACTICE_TOPICS, type TopicId } from '../../lib/practice'
import { initWidgetState } from '../../lib/widgets/widgetState'
import { checkStep, revealAnswer } from '../../lib/widgets/checkStep'
import { recordMastery, recordStruggle, topicForStepType } from '../../lib/weakAreas'
import { ENEMY_WAVE, PLAYER_MAX_HP, rollDamage, SPELLS, type Spell } from '../../lib/battle'
import { XP_PER_ENEMY } from '../../lib/gamification'
import { useGamification } from '../../context/GamificationContext'
import { StepWidget } from '../StepWidget/StepWidget'
import { HeroSprite, MonsterSprite } from './Sprites'
import './BattleArena.css'

const ALL_TOPIC_IDS = PRACTICE_TOPICS.map((t) => t.id) as TopicId[]

type Phase = 'loading' | 'choose' | 'cast' | 'resolve' | 'victory' | 'defeat'

interface BattleArenaProps {
  userId: string
  onExit: () => void
}

export function BattleArena({ userId, onExit }: BattleArenaProps) {
  const { registerBattleWin, markSession } = useGamification()

  const [pool, setPool] = useState<LessonStep[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')

  const [enemyIndex, setEnemyIndex] = useState(0)
  const [enemyHp, setEnemyHp] = useState(ENEMY_WAVE[0].maxHp)
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP)
  const [shield, setShield] = useState(0)
  const [defeatedCount, setDefeatedCount] = useState(0)

  const [spell, setSpell] = useState<Spell | null>(null)
  const [widgetState, setWidgetState] = useState<WidgetState | null>(null)
  const [castError, setCastError] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [fx, setFx] = useState<'enemy' | 'enemy-crit' | 'player' | null>(null)
  const [enemyDown, setEnemyDown] = useState(false)

  const awardedRef = useRef(false)

  const enemy = ENEMY_WAVE[enemyIndex]
  const step = pool.length ? pool[qIndex % pool.length] : null

  const loadArena = useCallback(() => {
    setPhase('loading')
    awardedRef.current = false
    setEnemyIndex(0)
    setEnemyHp(ENEMY_WAVE[0].maxHp)
    setPlayerHp(PLAYER_MAX_HP)
    setShield(0)
    setDefeatedCount(0)
    setSpell(null)
    setLog([`A wild ${ENEMY_WAVE[0].name} appears!`])
    return generatePracticeLesson({ topics: ALL_TOPIC_IDS, count: 24, title: 'Battle' }).then(
      (l: Lesson) => {
        setPool(l.steps)
        setQIndex(0)
        setPhase('choose')
      },
    )
  }, [])

  useEffect(() => {
    void loadArena()
  }, [loadArena])

  // Award XP once when the battle ends.
  useEffect(() => {
    if ((phase === 'victory' || phase === 'defeat') && !awardedRef.current) {
      awardedRef.current = true
      registerBattleWin(defeatedCount * XP_PER_ENEMY)
    }
  }, [phase, defeatedCount, registerBattleWin])

  const flash = (kind: 'enemy' | 'enemy-crit' | 'player') => {
    setFx(kind)
    window.setTimeout(() => setFx(null), 500)
  }

  const pickSpell = (s: Spell) => {
    setSpell(s)
    setCastError(null)
    setWidgetState(step ? initWidgetState(step) : null)
    setPhase('cast')
  }

  const cast = () => {
    if (!spell || !step || !widgetState) return
    const check = checkStep(step, widgetState)
    if (check.status === 'incomplete') {
      setCastError('Finish your spell — fill in every box!')
      return
    }
    const correct = check.status === 'correct'
    const topic = topicForStepType(step.type)
    if (topic) {
      if (correct) recordMastery(userId, topic)
      else recordStruggle(userId, topic)
    }
    markSession()

    const lines: string[] = []
    let nextEnemyHp = enemyHp
    let nextPlayerHp = playerHp
    let nextShield = shield

    if (spell.element === 'heal') {
      if (correct) {
        const healed = Math.min(PLAYER_MAX_HP, nextPlayerHp + (spell.heal ?? 0)) - nextPlayerHp
        nextPlayerHp += healed
        lines.push(`✨ Mend restores ${healed} HP!`)
      } else {
        lines.push('✨ Mend fizzled — no healing.')
        lines.push(`The answer was ${revealAnswer(step)}.`)
      }
    } else if (correct) {
      const { damage, crit } = rollDamage(spell)
      nextEnemyHp = Math.max(0, nextEnemyHp - damage)
      lines.push(`${spell.icon} ${spell.name} hits ${enemy.name} for ${damage}!${crit ? ' 💥 CRIT!' : ''}`)
      if (spell.shield) {
        nextShield += spell.shield
        lines.push(`🛡️ Frost shield up (+${spell.shield}).`)
      }
      flash(crit ? 'enemy-crit' : 'enemy')
    } else {
      lines.push(`${spell.icon} ${spell.name} fizzled!`)
      if (spell.backfire) {
        nextPlayerHp = Math.max(0, nextPlayerHp - spell.backfire)
        lines.push(`⚡ The miss shocks you for ${spell.backfire}!`)
        flash('player')
      }
      lines.push(`The answer was ${revealAnswer(step)}.`)
    }

    const killed = nextEnemyHp <= 0
    if (killed) {
      lines.push(`💀 ${enemy.name} is defeated!`)
    } else {
      // Enemy counterattacks (heal/miss/normal hit all provoke it).
      let incoming = enemy.attack
      if (nextShield > 0) {
        const absorbed = Math.min(nextShield, incoming)
        incoming -= absorbed
        nextShield -= absorbed
        if (absorbed > 0) lines.push(`🛡️ Shield blocks ${absorbed}.`)
      }
      if (incoming > 0) {
        nextPlayerHp = Math.max(0, nextPlayerHp - incoming)
        lines.push(`${enemy.name} strikes back for ${incoming}!`)
        flash('player')
      }
    }

    setEnemyHp(nextEnemyHp)
    setPlayerHp(nextPlayerHp)
    setShield(nextShield)
    setQIndex((i) => i + 1)
    setLog(lines)
    setEnemyDown(killed)
    if (killed) setDefeatedCount((c) => c + 1)

    if (nextPlayerHp <= 0) {
      setPhase('defeat')
    } else {
      setPhase('resolve')
    }
  }

  const continueAfterResolve = () => {
    if (enemyDown) {
      if (enemyIndex >= ENEMY_WAVE.length - 1) {
        setPhase('victory')
        return
      }
      const nextIdx = enemyIndex + 1
      setEnemyIndex(nextIdx)
      setEnemyHp(ENEMY_WAVE[nextIdx].maxHp)
      setLog([`A wild ${ENEMY_WAVE[nextIdx].name} appears!`])
    }
    setSpell(null)
    setEnemyDown(false)
    setPhase('choose')
  }

  // ---------- Render ----------
  if (phase === 'loading') {
    return <div className="battle-arena loading">⚔️ ENTERING THE ARENA…</div>
  }

  const enemyPct = Math.round((enemyHp / enemy.maxHp) * 100)
  const playerPct = Math.round((playerHp / PLAYER_MAX_HP) * 100)

  if (phase === 'victory' || phase === 'defeat') {
    const won = phase === 'victory'
    return (
      <div className="battle-arena">
        <div className={`battle-end ${won ? 'win' : 'lose'}`}>
          <h1>{won ? '🏆 VICTORY!' : '☠️ DEFEATED'}</h1>
          <p className="end-sub">
            {won
              ? 'You cleared the whole arena!'
              : `You took down ${defeatedCount} of ${ENEMY_WAVE.length} foes.`}
          </p>
          <div className="end-xp">+{defeatedCount * XP_PER_ENEMY} XP</div>
          <div className="battle-end-actions">
            <button type="button" className="secondary-button" onClick={() => void loadArena()}>
              {won ? 'Battle again' : 'Try again'}
            </button>
            <button type="button" className="primary-button" onClick={onExit}>
              Leave arena
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`battle-arena ${fx === 'player' ? 'fx-hurt' : ''}`}>
      <button type="button" className="text-button battle-quit" onClick={onExit}>
        ← Flee
      </button>

      {/* Enemy */}
      <div className="combatant enemy-row">
        <div className="combat-info">
          <span className="combat-name">{enemy.name}</span>
          <div className="hp-track">
            <div className="hp-fill enemy-hp" style={{ width: `${enemyPct}%` }} />
          </div>
          <span className="hp-num">{enemyHp} / {enemy.maxHp}</span>
        </div>
        <MonsterSprite
          kind={enemy.kind}
          color={enemy.color}
          className={`sprite enemy-sprite ${fx === 'enemy' ? 'fx-hit' : ''} ${
            fx === 'enemy-crit' ? 'fx-crit' : ''
          }`}
        />
      </div>

      {/* Battle log */}
      <div className="battle-log">
        {log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {phase === 'choose' && <p className="log-prompt">Choose your spell, hero!</p>}
      </div>

      {/* Player */}
      <div className="combatant hero-row">
        <HeroSprite className="sprite hero-sprite" />
        <div className="combat-info">
          <span className="combat-name">
            You {shield > 0 && <span className="shield-badge">🛡️{shield}</span>}
          </span>
          <div className="hp-track">
            <div className="hp-fill hero-hp" style={{ width: `${playerPct}%` }} />
          </div>
          <span className="hp-num">{playerHp} / {PLAYER_MAX_HP}</span>
        </div>
      </div>

      {/* Action area */}
      {phase === 'choose' && (
        <div className="spellbook">
          {SPELLS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="spell-btn"
              style={{ borderColor: s.color }}
              onClick={() => pickSpell(s)}
            >
              <span className="spell-icon" style={{ background: s.color }}>{s.icon}</span>
              <span className="spell-text">
                <span className="spell-name">{s.name}</span>
                <span className="spell-blurb">{s.blurb}</span>
              </span>
              <span className="spell-power">
                {s.element === 'heal' ? `+${s.heal}` : s.damage}
              </span>
            </button>
          ))}
          <p className="arena-note">Solve to cast — defeat all {ENEMY_WAVE.length} foes to win XP!</p>
        </div>
      )}

      {phase === 'cast' && step && widgetState && spell && (
        <div className="cast-panel">
          <p className="cast-banner" style={{ background: spell.color }}>
            Casting {spell.icon} {spell.name} — solve to unleash it!
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
                setSpell(null)
                setPhase('choose')
              }}
            >
              Change spell
            </button>
            <button type="button" className="primary-button" onClick={cast}>
              ⚔️ Cast!
            </button>
          </div>
        </div>
      )}

      {phase === 'resolve' && (
        <div className="cast-panel">
          <button type="button" className="primary-button wide" onClick={continueAfterResolve}>
            {enemyDown
              ? enemyIndex >= ENEMY_WAVE.length - 1
                ? 'Claim victory →'
                : 'Next foe →'
              : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  )
}
