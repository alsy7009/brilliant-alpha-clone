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
  COMBO_BONUS,
  DECORATIONS,
  XP_PER_STEP,
  getDecoration,
  levelInfoFromXp,
  totalXpFromProgress,
  unlockedDecorationIds,
  type Decoration,
  type LevelInfo,
} from '../lib/gamification'
import { persistDecoration } from '../lib/friends'

const EQUIP_KEY_PREFIX = 'activelearn_equipped_decoration_'

export interface ComboPopup {
  id: number
  xp: number
  combo: number
}

interface GamificationValue extends LevelInfo {
  streak: number
  decorations: Decoration[]
  unlockedIds: string[]
  equippedId: string
  equip: (id: string) => void
  comboCount: number
  combos: ComboPopup[]
  registerAnswer: (correct: boolean) => void
  markSession: () => void
  resetCombo: () => void
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
  const totalXp = useMemo(() => totalXpFromProgress(progressList), [progressList])
  const levelInfo = useMemo(() => levelInfoFromXp(totalXp), [totalXp])
  const unlockedIds = useMemo(() => unlockedDecorationIds(levelInfo.level), [levelInfo.level])

  const equipKey = EQUIP_KEY_PREFIX + userId
  const [equippedId, setEquippedId] = useState<string>(
    () => localStorage.getItem(equipKey) ?? 'none',
  )
  const [comboCount, setComboCount] = useState(0)
  const [combos, setCombos] = useState<ComboPopup[]>([])
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null)

  const comboIdRef = useRef(0)
  const prevLevelRef = useRef<number | null>(null)
  // Only celebrate level-ups that happen while the learner is actively answering
  // this session — never on login or initial data hydration.
  const sessionStartedRef = useRef(false)

  // Detect upward level changes (skip the first observation and any change that
  // is just data loading rather than an in-session action).
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

  // Mirror the current decoration to Firestore so friends can see it.
  useEffect(() => {
    void persistDecoration(userId, unlockedIds.includes(equippedId) ? equippedId : 'none')
  }, [userId, equippedId, unlockedIds])

  const resetCombo = useCallback(() => setComboCount(0), [])

  const markSession = useCallback(() => {
    sessionStartedRef.current = true
  }, [])

  const registerAnswer = useCallback((correct: boolean) => {
    sessionStartedRef.current = true
    if (!correct) {
      setComboCount(0)
      return
    }
    setComboCount((prev) => {
      const next = prev + 1
      const xp = XP_PER_STEP + COMBO_BONUS * (next - 1)
      const id = ++comboIdRef.current
      setCombos((list) => [...list, { id, xp, combo: next }])
      window.setTimeout(() => {
        setCombos((list) => list.filter((c) => c.id !== id))
      }, 1200)
      return next
    })
  }, [])

  const dismissLevelUp = useCallback(() => setPendingLevelUp(null), [])

  const value: GamificationValue = {
    ...levelInfo,
    streak,
    decorations: DECORATIONS,
    unlockedIds,
    equippedId: unlockedIds.includes(equippedId) ? equippedId : 'none',
    equip,
    comboCount,
    combos,
    registerAnswer,
    markSession,
    resetCombo,
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
