/**
 * Asynchronous PvP duel system (Prodigy-style, not real-time).
 *
 * Both players answer the SAME seeded questions under a per-question timer. Each round you
 * "fire" if you answered correctly in time; the opponent fires if THEY got that round right.
 * Opponents are matched by time control + level via a Firestore queue; if no human is waiting,
 * a skill-matched bot stands in so a match is always available.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'

export type TimeControl = 1 | 2 | 3
export const TIME_CONTROLS: TimeControl[] = [1, 2, 3]

export const ROUNDS = 7
export const START_HP = 100
export const HIT_DAMAGE = 20
/** Win XP is higher for shorter time controls (more pressure, more reward). */
export const WIN_XP: Record<TimeControl, number> = { 1: 60, 2: 40, 3: 25 }
export const DRAW_XP = 12
export const LOSS_XP = 5

/** Only match players within this many levels of each other. */
const LEVEL_BRACKET = 3
/** Stop waiting for a human and fall back to a bot after this long. */
export const SEARCH_TIMEOUT_MS = 8000

export interface Opponent {
  uid: string
  name: string
  level: number
  isBot: boolean
}

export interface MatchInfo {
  matchId: string
  seed: string
  opponent: Opponent
  timeControl: TimeControl
}

export interface RoundResult {
  correct: boolean
  ms: number
}

// ---------- small deterministic RNG (for bot/opponent simulation) ----------

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BOT_NAMES = [
  'Vex',
  'Nova',
  'Razor',
  'Cypher',
  'Echo',
  'Talon',
  'Blaze',
  'Rook',
  'Drift',
  'Sable',
]

export function makeBot(level: number, seedKey: string): Opponent {
  const rng = mulberry32(hash('bot' + seedKey))
  const name = BOT_NAMES[Math.floor(rng() * BOT_NAMES.length)]
  const jitter = Math.floor(rng() * 3) - 1
  return { uid: `bot_${seedKey}`, name: `${name} [BOT]`, level: Math.max(1, level + jitter), isBot: true }
}

/**
 * Simulate whether the opponent answered round `i` correctly. Used for bots and as a fallback
 * for a human opponent whose result for that round hasn't synced yet. Deterministic per match.
 */
export function simulateOpponentRound(
  opponent: Opponent,
  matchId: string,
  round: number,
): boolean {
  const accuracy = Math.min(0.85, Math.max(0.45, 0.55 + (opponent.level - 5) * 0.02))
  const rng = mulberry32(hash(`${matchId}:${opponent.uid}:${round}`))
  return rng() < accuracy
}

/** Play out the duel from both players' per-round correctness; returns the winner. */
export function resolveDuel(
  mine: boolean[],
  theirs: boolean[],
): { outcome: 'win' | 'loss' | 'draw'; myHp: number; oppHp: number } {
  let myHp = START_HP
  let oppHp = START_HP
  for (let i = 0; i < ROUNDS; i++) {
    if (mine[i]) oppHp = Math.max(0, oppHp - HIT_DAMAGE)
    if (theirs[i]) myHp = Math.max(0, myHp - HIT_DAMAGE)
    if (myHp === 0 || oppHp === 0) break
  }
  const outcome = oppHp === myHp ? 'draw' : oppHp < myHp ? 'win' : 'loss'
  return { outcome, myHp, oppHp }
}

// ---------- matchmaking (Firestore) ----------

function pairId(a: string, b: string): string {
  return [a, b].sort().join('__')
}

export interface QueueMe {
  uid: string
  name: string
  level: number
}

interface QueueDoc {
  uid: string
  name: string
  level: number
  timeControl: TimeControl
  status: 'waiting' | 'matched'
  matchId: string | null
  oppUid?: string
  oppName?: string
  oppLevel?: number
}

/** Join the matchmaking queue for a time control. */
export async function joinQueue(me: QueueMe, tc: TimeControl): Promise<void> {
  if (!isFirebaseConfigured) return
  await setDoc(doc(db, 'pvp_queue', me.uid), {
    uid: me.uid,
    name: me.name,
    level: me.level,
    timeControl: tc,
    status: 'waiting',
    matchId: null,
    createdAt: serverTimestamp(),
  })
}

export async function leaveQueue(uid: string): Promise<void> {
  if (!isFirebaseConfigured) return
  try {
    await deleteDoc(doc(db, 'pvp_queue', uid))
  } catch {
    // ignore
  }
}

/**
 * Try to claim a waiting opponent (same time control, near level). Returns the MatchInfo if a
 * match was created, else null (keep waiting / fall back to a bot).
 */
export async function tryMatch(me: QueueMe, tc: TimeControl): Promise<MatchInfo | null> {
  if (!isFirebaseConfigured) return null
  let candidates
  try {
    candidates = await getDocs(
      query(
        collection(db, 'pvp_queue'),
        where('timeControl', '==', tc),
        where('status', '==', 'waiting'),
        orderBy('createdAt', 'asc'),
        limit(10),
      ),
    )
  } catch {
    return null
  }

  const opp = candidates.docs
    .map((d) => d.data() as QueueDoc)
    .find((d) => d.uid !== me.uid && Math.abs((d.level ?? 1) - me.level) <= LEVEL_BRACKET)
  if (!opp) return null

  const matchId = pairId(me.uid, opp.uid)
  try {
    const claimed = await runTransaction(db, async (tx) => {
      const myRef = doc(db, 'pvp_queue', me.uid)
      const oppRef = doc(db, 'pvp_queue', opp.uid)
      const oppSnap = await tx.get(oppRef)
      if (!oppSnap.exists() || (oppSnap.data() as QueueDoc).status !== 'waiting') return false
      tx.set(doc(db, 'pvp_matches', matchId), {
        players: [me.uid, opp.uid],
        timeControl: tc,
        createdAt: serverTimestamp(),
      })
      tx.update(oppRef, { status: 'matched', matchId, oppUid: me.uid, oppName: me.name, oppLevel: me.level })
      tx.set(
        myRef,
        { status: 'matched', matchId, oppUid: opp.uid, oppName: opp.name, oppLevel: opp.level },
        { merge: true },
      )
      return true
    })
    if (!claimed) return null
  } catch {
    return null
  }

  return {
    matchId,
    seed: matchId,
    timeControl: tc,
    opponent: { uid: opp.uid, name: opp.name, level: opp.level ?? 1, isBot: false },
  }
}

/** Listen for someone else matching with me while I wait. Returns an unsubscribe fn. */
export function listenForMatch(
  uid: string,
  tc: TimeControl,
  onMatched: (info: MatchInfo) => void,
): () => void {
  if (!isFirebaseConfigured) return () => {}
  return onSnapshot(doc(db, 'pvp_queue', uid), (snap) => {
    const data = snap.data() as QueueDoc | undefined
    if (data?.status === 'matched' && data.matchId && data.oppUid) {
      onMatched({
        matchId: data.matchId,
        seed: data.matchId,
        timeControl: tc,
        opponent: {
          uid: data.oppUid,
          name: data.oppName ?? 'Challenger',
          level: data.oppLevel ?? 1,
          isBot: false,
        },
      })
    }
  })
}

/** Record my per-round result so a human opponent can read it (best-effort). */
export async function recordRound(
  matchId: string,
  uid: string,
  round: number,
  result: RoundResult,
): Promise<void> {
  if (!isFirebaseConfigured || matchId.startsWith('bot_')) return
  try {
    await setDoc(
      doc(db, 'pvp_matches', matchId),
      { [`r_${uid}_${round}`]: result },
      { merge: true },
    )
  } catch {
    // ignore
  }
}

/**
 * Watch a human opponent's recorded per-round results. Calls back with a map of
 * round → correct as they arrive. Returns an unsubscribe fn.
 */
export function listenOpponentResults(
  matchId: string,
  oppUid: string,
  onUpdate: (correctByRound: Record<number, boolean>) => void,
): () => void {
  if (!isFirebaseConfigured || matchId.startsWith('bot_')) return () => {}
  return onSnapshot(doc(db, 'pvp_matches', matchId), (snap) => {
    const data = snap.data()
    if (!data) return
    const out: Record<number, boolean> = {}
    for (let r = 0; r < ROUNDS; r++) {
      const cell = data[`r_${oppUid}_${r}`] as RoundResult | undefined
      if (cell) out[r] = cell.correct
    }
    onUpdate(out)
  })
}
