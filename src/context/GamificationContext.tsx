import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { UserProgress } from '../types/progress'
import {
  DECORATIONS,
  getDecoration,
  levelInfoFromXp,
  totalXpFromProgress,
  unlockedDecorationIds,
  XP_PER_DRILL,
  BOSS_XP_PER_CORRECT,
  type Decoration,
  type LevelInfo,
} from '../lib/gamification'
import { persistDecoration } from '../lib/friends'
import {
  COMBO_REWARD,
  COMBO_TARGET,
  getBonusXp,
  getDaily,
  getTodaysGoal,
  setBonusXp,
  setDaily,
  type DailyState,
} from '../lib/rewards'

const EQUIP_KEY_PREFIX = 'activelearn_equipped_decoration_'

export interface RewardPopup {
  id: number
  title: string
  subtitle?: string
}

export interface GoalView {
  id: string
  label: string
  target: number
  reward: number
  progress: number
  claimed: boolean
}

interface GamificationValue extends LevelInfo {
  streak: number
  decorations: Decoration[]
  unlockedIds: string[]
  equippedId: string
  equip: (id: string) => void
  comboCount: number
  combos: RewardPopup[]
  goals: GoalView[]
  /** Report an answer. firstTry = no wrong attempts on this question yet. */
  registerAnswer: (correct: boolean, firstTry: boolean) => void
  /** Call when a lesson is fully completed for the first time. */
  registerLessonComplete: () => void
  /** Call when an ephemeral practice drill is finished — awards a small flat XP. */
  registerDrillComplete: () => void
  /** Call when the Boss Level quiz ends — awards XP proportional to correct answers. */
  registerQuizComplete: (correct: number) => void
  /** Call when a battle is won — awards a flat XP amount with a popup. */
  registerBattleWin: (xp: number) => void
  markSession: () => void
  pendingLevelUp: number | null
  dismissLevelUp: () => void
}

const GamificationContext = createContext<GamificationValue | null>(null)

interface ProviderProps {
  userId: string
  progressList: UserProgress[]
  streak: number
  children: ReactNode
}

export function GamificationProvider({ userId, progressList, streak, children }: ProviderProps) {
  const derivedXp = useMemo(() => totalXpFromProgress(progressList), [progressList])

  const [bonusXp, setBonusXpState] = useState<number>(() => getBonusXp(userId))
  const [daily, setDailyState] = useState<DailyState>(() => getDaily(userId))

  const totalXp = derivedXp + bonusXp
  const levelInfo = useMemo(() => levelInfoFromXp(totalXp), [totalXp])
  const unlockedIds = useMemo(() => unlockedDecorationIds(levelInfo.level), [levelInfo.level])

  const equipKey = EQUIP_KEY_PREFIX + userId
  const [equippedId, setEquippedId] = useState<string>(
    () => localStorage.getItem(equipKey) ?? 'none',
  )
  const [comboCount, setComboCount] = useState(0)
  const [combos, setCombos] = useState<RewardPopup[]>([])
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null)

  const popupIdRef = useRef(0)
  const prevLevelRef = useRef<number | null>(null)
  const sessionStartedRef = useRef(false)

  // Reload per-user reward state when the user changes.
  useEffect(() => {
    setBonusXpState(getBonusXp(userId))
    setDailyState(getDaily(userId))
  }, [userId])

  // Detect upward level changes (skip first observation + non-session changes).
  useEffect(() => {
    if (prevLevelRef.current === null) {
      prevLevelRef.current = levelInfo.level
      return
    }
    if (levelInfo.level > prevLevelRef.current && sessionStartedRef.current) {
      setPendingLevelUp(levelInfo.level)
    }
    prevLevelRef.current = levelInfo.level
  }, [levelInfo.level])

  const equip = useCallback(
    (id: string) => {
      setEquippedId(id)
      localStorage.setItem(equipKey, id)
      void persistDecoration(userId, id)
    },
    [equipKey, userId],
  )

  useEffect(() => {
    void persistDecoration(userId, unlockedIds.includes(equippedId) ? equippedId : 'none')
  }, [userId, equippedId, unlockedIds])

  const pushReward = useCallback((title: string, subtitle?: string) => {
    const id = ++popupIdRef.current
    setCombos((list) => [...list, { id, title, subtitle }])
    window.setTimeout(() => {
      setCombos((list) => list.filter((c) => c.id !== id))
    }, 1600)
  }, [])

  const addBonus = useCallback(
    (amount: number) => {
      setBonusXpState((prev) => {
        const next = prev + amount
        setBonusXp(userId, next)
        return next
      })
    },
    [userId],
  )

  const markSession = useCallback(() => {
    sessionStartedRef.current = true
  }, [])

  // Combo: only first-try-correct answers count; reward at every COMBO_TARGET in a row.
  const registerAnswer = useCallback(
    (correct: boolean, firstTry: boolean) => {
      sessionStartedRef.current = true
      if (!correct || !firstTry) {
        setComboCount(0)
        return
      }
      setComboCount((prev) => {
        const next = prev + 1
        if (next > 0 && next % COMBO_TARGET === 0) {
          addBonus(COMBO_REWARD)
          pushReward(`+${COMBO_REWARD} XP`, `${next} in a row! 🔥`)
          return 0
        }
        return next
      })
    },
    [addBonus, pushReward],
  )

  const registerLessonComplete = useCallback(() => {
    sessionStartedRef.current = true
    const goal = getTodaysGoal()
    setDailyState((prev) => {
      const lessonsToday = prev.lessonsToday + 1
      const claimed = [...prev.claimed]
      if (!claimed.includes(goal.id) && lessonsToday >= goal.target) {
        claimed.push(goal.id)
        addBonus(goal.reward)
        pushReward(`Goal complete! +${goal.reward} XP`, goal.label)
      }
      const nextDaily = { ...prev, lessonsToday, claimed }
      setDaily(userId, nextDaily)
      return nextDaily
    })
  }, [addBonus, pushReward, userId])

  const registerDrillComplete = useCallback(() => {
    sessionStartedRef.current = true
    addBonus(XP_PER_DRILL)
    pushReward(`+${XP_PER_DRILL} XP`, 'Drill cleared! ⚡')
  }, [addBonus, pushReward])

  const registerQuizComplete = useCallback(
    (correct: number) => {
      sessionStartedRef.current = true
      const xp = Math.max(0, correct) * BOSS_XP_PER_CORRECT
      if (xp > 0) {
        addBonus(xp)
        pushReward(`+${xp} XP`, 'Boss defeated! 👑')
      }
    },
    [addBonus, pushReward],
  )

  const registerBattleWin = useCallback(
    (xp: number) => {
      sessionStartedRef.current = true
      if (xp > 0) {
        addBonus(xp)
        pushReward(`+${xp} XP`, 'Victory! ⚔️')
      }
    },
    [addBonus, pushReward],
  )

  const dismissLevelUp = useCallback(() => setPendingLevelUp(null), [])

  const todaysGoal = getTodaysGoal()
  const goals: GoalView[] = [
    {
      ...todaysGoal,
      progress: daily.lessonsToday,
      claimed: daily.claimed.includes(todaysGoal.id),
    },
  ]

  const value: GamificationValue = {
    ...levelInfo,
    streak,
    decorations: DECORATIONS,
    unlockedIds,
    equippedId: unlockedIds.includes(equippedId) ? equippedId : 'none',
    equip,
    comboCount,
    combos,
    goals,
    registerAnswer,
    registerLessonComplete,
    registerDrillComplete,
    registerQuizComplete,
    registerBattleWin,
    markSession,
    pendingLevelUp,
    dismissLevelUp,
  }

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>
}

export function useGamification(): GamificationValue {
  const ctx = useContext(GamificationContext)
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider')
  return ctx
}

export { getDecoration }
