import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WidgetState } from '../../types/lesson'
import { initWidgetState } from '../../lib/widgets/widgetState'
import { checkStep } from '../../lib/widgets/checkStep'
import { seededQuestions } from '../../lib/seededQuestions'
import {
  HIT_DAMAGE,
  listenOpponentResults,
  recordRound,
  ROUNDS,
  simulateOpponentRound,
  START_HP,
  WIN_XP,
  DRAW_XP,
  LOSS_XP,
  type MatchInfo,
} from '../../lib/pvp'
import { applyRankResult, type MatchOutcome } from '../../lib/rank'
import { camoColor, getTank, type Loadout } from '../../lib/tank'
import { useGamification } from '../../context/GamificationContext'
import { StepWidget } from '../StepWidget/StepWidget'
import { PlayerTank } from '../Tank/TankSprite'
import './PvpBattle.css'

type Phase = 'intro' | 'answer' | 'reveal' | 'done'

interface PvpBattleProps {
  me: { uid: string; name: string; level: number }
  loadout: Loadout
  match: MatchInfo
  onFinish: (outcome: MatchOutcome, newRp: number) => void
  onExit: () => void
}

export function PvpBattle({ me, loadout, match, onFinish, onExit }: PvpBattleProps) {
  const { registerBattleWin } = useGamification()
  const tank = getTank(loadout.tankId)
  const tankColor = camoColor(loadout.camo)
  const limitSec = match.timeControl * 60

  const questions = useMemo(() => seededQuestions(match.seed, ROUNDS), [match.seed])

  const [phase, setPhase] = useState<Phase>('intro')
  const [round, setRound] = useState(0)
  const [myHp, setMyHp] = useState(START_HP)
  const [oppHp, setOppHp] = useState(START_HP)
  const [secs, setSecs] = useState(limitSec)
  const [widgetState, setWidgetState] = useState<WidgetState>(() => initWidgetState(questions[0]))
  const [log, setLog] = useState('Round 1 — solve to fire!')
  const [myFx, setMyFx] = useState(false)
  const [oppFx, setOppFx] = useState(false)
  const [lastRound, setLastRound] = useState<{ me: boolean; opp: boolean } | null>(null)

  const oppLiveRef = useRef<Record<number, boolean>>({})
  const rewardedRef = useRef(false)
  const myResultsRef = useRef<boolean[]>([])
  const tickRef = useRef<number | null>(null)
  const resolvedRoundRef = useRef(-1)

  const step = questions[round]

  // Subscribe to a human opponent's live results (bot matches no-op).
  useEffect(() => {
    const unsub = listenOpponentResults(match.matchId, match.opponent.uid, (map) => {
      oppLiveRef.current = map
    })
    return unsub
  }, [match.matchId, match.opponent.uid])

  const clearTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }
  useEffect(() => clearTick, [])

  const resolveRound = useCallback(
    (myCorrect: boolean) => {
      if (resolvedRoundRef.current === round) return // guard against double-resolve
      resolvedRoundRef.current = round
      clearTick()
      // Opponent's result: prefer their recorded answer, else simulate.
      const oppCorrect =
        oppLiveRef.current[round] ?? simulateOpponentRound(match.opponent, match.matchId, round)

      void recordRound(match.matchId, me.uid, round, { correct: myCorrect, ms: 0 })
      myResultsRef.current[round] = myCorrect

      const nextMyHp = Math.max(0, myHp - (oppCorrect ? HIT_DAMAGE : 0))
      const nextOppHp = Math.max(0, oppHp - (myCorrect ? HIT_DAMAGE : 0))

      if (myCorrect) {
        setOppFx(true)
        window.setTimeout(() => setOppFx(false), 600)
      }
      if (oppCorrect) {
        setMyFx(true)
        window.setTimeout(() => setMyFx(false), 600)
      }

      setLastRound({ me: myCorrect, opp: oppCorrect })
      setLog(
        `${myCorrect ? 'You fired a direct hit!' : 'You missed!'} ${match.opponent.name} ${
          oppCorrect ? 'fired back!' : 'missed!'
        }`,
      )
      setMyHp(nextMyHp)
      setOppHp(nextOppHp)
      setPhase('reveal')

      const ended = nextMyHp <= 0 || nextOppHp <= 0 || round >= ROUNDS - 1
      window.setTimeout(() => {
        if (ended) {
          setPhase('done')
        } else {
          const nr = round + 1
          setRound(nr)
          setWidgetState(initWidgetState(questions[nr]))
          setSecs(limitSec)
          setLog(`Round ${nr + 1} — solve to fire!`)
          setPhase('answer')
        }
      }, 1500)
    },
    [round, myHp, oppHp, match, me.uid, questions, limitSec],
  )

  // Countdown timer while answering (decrement only).
  useEffect(() => {
    if (phase !== 'answer') return
    clearTick()
    tickRef.current = window.setInterval(() => {
      setSecs((s) => Math.max(0, s - 1))
    }, 1000)
    return clearTick
  }, [phase, round])

  // Time's up → count this round as a miss.
  useEffect(() => {
    if (phase === 'answer' && secs === 0) resolveRound(false)
  }, [phase, secs, resolveRound])

  // Apply rewards once when the duel ends.
  useEffect(() => {
    if (phase !== 'done' || rewardedRef.current) return
    rewardedRef.current = true
    const outcome: MatchOutcome =
      myHp <= 0 && oppHp <= 0 ? 'draw' : oppHp <= 0 ? 'win' : myHp <= 0 ? 'loss' : oppHp < myHp ? 'win' : oppHp > myHp ? 'loss' : 'draw'
    const xp = outcome === 'win' ? WIN_XP[match.timeControl] : outcome === 'draw' ? DRAW_XP : LOSS_XP
    registerBattleWin(xp)
    const newRp = applyRankResult(me.uid, outcome, match.timeControl)
    onFinish(outcome, newRp)
  }, [phase, myHp, oppHp, match.timeControl, me.uid, onFinish, registerBattleWin])

  const fire = () => {
    if (phase !== 'answer') return
    const check = checkStep(step, widgetState)
    if (check.status === 'incomplete') {
      setLog('Fill in every box, then fire!')
      return
    }
    resolveRound(check.status === 'correct')
  }

  const myPct = Math.round((myHp / START_HP) * 100)
  const oppPct = Math.round((oppHp / START_HP) * 100)
  const timePct = Math.round((secs / limitSec) * 100)
  const mm = Math.floor(secs / 60)
  const ss = String(secs % 60).padStart(2, '0')

  // ---------- Intro ----------
  if (phase === 'intro') {
    return (
      <div className="pvp-battle">
        <div className="pvp-vs">
          <div className="vs-side">
            <PlayerTank kind={tank.id} color={tankColor} size={120} />
            <span className="vs-name">{me.name}</span>
            <span className="vs-lvl">LV {me.level}</span>
          </div>
          <span className="vs-badge">VS</span>
          <div className="vs-side">
            <span className="vs-flip">
              <PlayerTank kind="juggernaut" color="#7a2230" size={120} />
            </span>
            <span className="vs-name">{match.opponent.name}</span>
            <span className="vs-lvl">LV {match.opponent.level}</span>
          </div>
        </div>
        <p className="pvp-intro-note">
          {match.timeControl} min per question · {ROUNDS} rounds · best fighter wins!
        </p>
        <button type="button" className="primary-button" onClick={() => setPhase('answer')}>
          ⚔️ Begin duel
        </button>
        <button type="button" className="text-button" onClick={onExit}>
          ← Forfeit
        </button>
      </div>
    )
  }

  // ---------- Done ----------
  if (phase === 'done') {
    const win = oppHp <= 0 || (myHp > 0 && oppHp < myHp)
    const draw = myHp === oppHp || (myHp <= 0 && oppHp <= 0)
    return (
      <div className="pvp-battle">
        <div className={`pvp-end ${win ? 'win' : draw ? 'draw' : 'lose'}`}>
          <h1>{draw ? '🤝 DRAW' : win ? '🏆 VICTORY!' : '💥 DEFEAT'}</h1>
          <p className="pvp-end-sub">
            {me.name} {myHp} HP — {oppHp} HP {match.opponent.name}
          </p>
          <div className="pvp-end-actions">
            <button type="button" className="primary-button" onClick={onExit}>
              Back to arena
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Answer / Reveal ----------
  return (
    <div className={`pvp-battle ${myFx ? 'fx-shake' : ''}`}>
      <div className="pvp-hud">
        <div className="pvp-fighter">
          <PlayerTank kind={tank.id} color={tankColor} size={56} className={oppFx ? '' : ''} />
          <div className="pvp-fighter-bars">
            <span className="pvp-fname">{me.name}</span>
            <div className="hp-track"><div className="hp-fill hero-hp" style={{ width: `${myPct}%` }} /></div>
          </div>
        </div>
        <div className="pvp-round">R{round + 1}/{ROUNDS}</div>
        <div className="pvp-fighter opp">
          <div className="pvp-fighter-bars">
            <span className="pvp-fname">{match.opponent.name}</span>
            <div className="hp-track"><div className="hp-fill enemy-hp" style={{ width: `${oppPct}%` }} /></div>
          </div>
          <span className={`vs-flip ${oppFx ? 'fx-hit' : ''}`}>
            <PlayerTank kind="juggernaut" color="#7a2230" size={56} />
          </span>
        </div>
      </div>

      {/* Timer */}
      <div className="pvp-timer">
        <div className="pvp-timer-bar" style={{ width: `${timePct}%`, background: secs <= 10 ? 'var(--c-red)' : 'var(--c-lime)' }} />
        <span className="pvp-timer-text">{mm}:{ss}</span>
      </div>

      <p className="pvp-log">{log}</p>

      <section className="pvp-question">
        <p className="cast-instruction">{step.instruction}</p>
        <div className={phase === 'reveal' ? 'pvp-readonly' : ''}>
          <StepWidget
            step={step}
            state={widgetState}
            onStateChange={setWidgetState}
            slotFeedback={phase === 'reveal' ? checkStep(step, widgetState).slotResults : null}
          />
        </div>
      </section>

      {phase === 'answer' ? (
        <button type="button" className="primary-button pvp-fire" onClick={fire}>
          🎯 Fire!
        </button>
      ) : (
        <div className="pvp-reveal-row">
          <span className={`reveal-chip ${lastRound?.me ? 'good' : 'bad'}`}>
            You {lastRound?.me ? 'HIT' : 'missed'}
          </span>
          <span className={`reveal-chip ${lastRound?.opp ? 'bad' : 'good'}`}>
            {match.opponent.name} {lastRound?.opp ? 'HIT' : 'missed'}
          </span>
        </div>
      )}
    </div>
  )
}
