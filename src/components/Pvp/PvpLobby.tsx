import { useEffect, useRef, useState } from 'react'
import { getRankInfo } from '../../lib/rank'
import {
  joinQueue,
  leaveQueue,
  listenForMatch,
  makeBot,
  SEARCH_TIMEOUT_MS,
  TIME_CONTROLS,
  tryMatch,
  WIN_XP,
  type MatchInfo,
  type TimeControl,
} from '../../lib/pvp'
import { isDemoMode } from '../../lib/auth'
import './PvpLobby.css'

interface PvpLobbyProps {
  me: { uid: string; name: string; level: number }
  rp: number
  onStart: (match: MatchInfo) => void
  onExit: () => void
}

export function PvpLobby({ me, rp, onStart, onExit }: PvpLobbyProps) {
  const [tc, setTc] = useState<TimeControl>(2)
  const [searching, setSearching] = useState(false)
  const [statusText, setStatusText] = useState('')
  const cleanupRef = useRef<(() => void) | null>(null)

  const rank = getRankInfo(rp)
  const pct = rank.next ? Math.round((rank.intoTier / rank.tierSpan) * 100) : 100

  const stopSearch = () => {
    cleanupRef.current?.()
    cleanupRef.current = null
    void leaveQueue(me.uid)
    setSearching(false)
    setStatusText('')
  }

  useEffect(() => () => cleanupRef.current?.(), [])

  const startSearch = async () => {
    if (searching) return
    setSearching(true)
    setStatusText('Scanning for a challenger…')

    const begin = (info: MatchInfo) => {
      cleanupRef.current?.()
      cleanupRef.current = null
      setSearching(false)
      setStatusText('')
      onStart(info)
    }

    const fallbackToBot = () => {
      cleanupRef.current?.()
      cleanupRef.current = null
      void leaveQueue(me.uid)
      const seed = `bot_${me.uid}_${Date.now()}`
      begin({
        matchId: seed,
        seed,
        timeControl: tc,
        opponent: makeBot(me.level, seed),
      })
    }

    // Demo / no Firebase → straight to a bot duel.
    if (isDemoMode()) {
      const t = window.setTimeout(fallbackToBot, 1200)
      cleanupRef.current = () => window.clearTimeout(t)
      return
    }

    let matched = false
    try {
      await joinQueue(me, tc)
    } catch {
      fallbackToBot()
      return
    }

    const unsub = listenForMatch(me.uid, tc, (info) => {
      if (matched) return
      matched = true
      begin(info)
    })

    const poll = window.setInterval(async () => {
      if (matched) return
      const info = await tryMatch(me, tc)
      if (info && !matched) {
        matched = true
        begin(info)
      }
    }, 1600)

    const timeout = window.setTimeout(() => {
      if (!matched) {
        matched = true
        setStatusText('No challengers online — deploying a trainer bot…')
        fallbackToBot()
      }
    }, SEARCH_TIMEOUT_MS)

    cleanupRef.current = () => {
      unsub()
      window.clearInterval(poll)
      window.clearTimeout(timeout)
    }
  }

  return (
    <div className="pvp-lobby">
      <button type="button" className="text-button pvp-back" onClick={onExit}>
        ← Back
      </button>

      <h1 className="pvp-title">⚔️ PvP Arena</h1>

      {/* Rank card */}
      <section className="rank-card" style={{ borderColor: rank.tier.color }}>
        <div className="rank-emblem" style={{ background: rank.tier.color }}>
          {rank.tier.name[0]}
        </div>
        <div className="rank-info">
          <span className="rank-tier" style={{ color: rank.tier.color }}>{rank.tier.name}</span>
          <span className="rank-rp">{rp} RP</span>
          <div className="rank-bar">
            <div className="rank-bar-fill" style={{ width: `${pct}%`, background: rank.tier.color }} />
          </div>
          <span className="rank-next">
            {rank.next ? `${rank.tierSpan - rank.intoTier} RP to ${rank.next.name}` : 'Max tier — Radiant!'}
          </span>
        </div>
      </section>

      {searching ? (
        <section className="pvp-searching">
          <div className="radar" aria-hidden="true">
            <span className="radar-sweep" />
          </div>
          <p className="searching-text">{statusText}</p>
          <button type="button" className="secondary-button" onClick={stopSearch}>
            Cancel
          </button>
        </section>
      ) : (
        <>
          <section className="pvp-card">
            <h2 className="pvp-heading">Question timer</h2>
            <p className="pvp-sub">Less time = more XP &amp; RP. Choose your challenge.</p>
            <div className="tc-row">
              {TIME_CONTROLS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tc-chip ${tc === t ? 'on' : ''}`}
                  onClick={() => setTc(t)}
                >
                  <span className="tc-min">{t} min</span>
                  <span className="tc-xp">+{WIN_XP[t]} XP</span>
                </button>
              ))}
            </div>
          </section>

          <button type="button" className="pvp-find" onClick={() => void startSearch()}>
            🎯 Find Match
          </button>
          <p className="pvp-note">
            You'll be matched with a player near your level. Each duel is {`7`} rounds — solve fast to fire first!
          </p>
        </>
      )}
    </div>
  )
}
