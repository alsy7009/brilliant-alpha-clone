import { useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { getLessonById, LESSONS } from './content/catalog'
import { LessonPlayer } from './components/LessonPlayer/LessonPlayer'
import { LoginForm } from './components/Login/LoginForm'
import { Roadmap } from './components/Roadmap/Roadmap'
import { MainLayout, type NavKey } from './components/Layout/MainLayout'
import { ProfilePage } from './components/Profile/ProfilePage'
import { FriendsPage } from './components/Friends/FriendsPage'
import { PracticePage } from './components/Practice/PracticePage'
import { BossLevel } from './components/BossLevel/BossLevel'
import { LevelUpModal } from './components/Gamification/LevelUpModal'
import { ComboLayer } from './components/Gamification/ComboLayer'
import { GamificationProvider } from './context/GamificationContext'
import {
  getCurrentUser,
  initAuthRedirect,
  isDemoMode,
  logOut,
  resolveUserId,
  subscribeToAuth,
} from './lib/auth'
import { fetchAllProgress } from './lib/progress'
import { getDisplayStreak, recordActivityStreak } from './lib/streak'
import { updateUserStats } from './lib/friends'
import { getBonusXp } from './lib/rewards'
import { levelInfoFromXp, totalXpFromProgress } from './lib/gamification'
import { fileToResizedDataUrl, getAvatarOverride, setAvatarOverride } from './lib/avatar'
import type { Lesson } from './types/lesson'
import type { AppView, UserProgress } from './types/progress'
import './App.css'

function App() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [demoUser, setDemoUser] = useState(false)
  const [view, setView] = useState<AppView>('login')
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [practiceLesson, setPracticeLesson] = useState<Lesson | null>(null)
  const [progressList, setProgressList] = useState<UserProgress[]>([])
  const [avatarOverride, setAvatarOverrideState] = useState<string | null>(null)
  const [displayNameState, setDisplayNameState] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [confirmLinkEmail, setConfirmLinkEmail] = useState<string | null>(null)

  const userId = demoUser ? resolveUserId(null) : resolveUserId(authUser)
  const displayName =
    displayNameState ?? authUser?.displayName ?? (demoUser ? 'Demo Learner' : undefined)
  const photoURL = avatarOverride ?? authUser?.photoURL ?? undefined

  const refreshProgress = useCallback(async () => {
    const list = await fetchAllProgress(userId)
    setProgressList(list)
  }, [userId])

  useEffect(() => {
    setAvatarOverrideState(getAvatarOverride(userId))
  }, [userId])

  // Display the saved streak on login (starts at 0; only a completed question bumps it).
  useEffect(() => {
    if (!authReady) return
    if (!authUser && !demoUser) return
    setStreak(getDisplayStreak(userId))
  }, [authReady, authUser, demoUser, userId])

  const handleStepComplete = useCallback(() => {
    setStreak(recordActivityStreak(userId))
    void refreshProgress()
  }, [userId, refreshProgress])

  // Mirror the player's stats onto their user doc so friends can see them.
  useEffect(() => {
    if (isDemoMode() || !authUser) return
    const totalXp = totalXpFromProgress(progressList) + getBonusXp(authUser.uid)
    const { level } = levelInfoFromXp(totalXp)
    const validLessonIds = new Set(LESSONS.map((l) => l.lessonId))
    const completed = progressList.filter(
      (p) => p.isCompleted && validLessonIds.has(p.lessonId),
    )
    void updateUserStats(authUser.uid, {
      totalXp,
      level,
      streak,
      lessonsCompleted: completed.length,
      completedLessons: completed.map((p) => p.lessonId),
    })
  }, [authUser, progressList, streak])

  // Keep the display name in sync once the auth profile carries it.
  useEffect(() => {
    if (authUser?.displayName) setDisplayNameState(authUser.displayName)
  }, [authUser])

  const syncDisplayName = useCallback(() => {
    const current = getCurrentUser()
    if (current?.displayName) setDisplayNameState(current.displayName)
  }, [])

  const handleAvatarFile = useCallback(
    async (file: File) => {
      const dataUrl = await fileToResizedDataUrl(file)
      setAvatarOverride(userId, dataUrl)
      setAvatarOverrideState(dataUrl)
    },
    [userId],
  )

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    void initAuthRedirect().then((res) => {
      if (res.confirmLink) {
        setConfirmLinkEmail(res.confirmLink.email)
      }
      if (isDemoMode()) {
        setAuthReady(true)
        return
      }
      unsubscribe = subscribeToAuth((user) => {
        setAuthUser(user)
        setAuthReady(true)
      })
    })

    return () => unsubscribe?.()
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (isDemoMode()) {
      if (demoUser) {
        setView((current) => (current === 'login' ? 'roadmap' : current))
        void refreshProgress()
      } else {
        setView('login')
      }
      return
    }
    if (authUser) {
      setView((current) => (current === 'login' ? 'roadmap' : current))
      void refreshProgress()
    } else {
      setView('login')
      setActiveLessonId(null)
    }
  }, [authReady, authUser, demoUser, refreshProgress])

  const openLesson = (lessonId: string) => {
    setActiveLessonId(lessonId)
    setView('lesson')
  }

  const handleSignOut = async () => {
    await logOut()
    setDemoUser(false)
    setAuthUser(null)
    setView('login')
    setProgressList([])
    setDisplayNameState(null)
    setStreak(0)
  }

  const handleNavigate = (key: NavKey) => {
    setActiveLessonId(null)
    setPracticeLesson(null)
    setView(
      key === 'profile'
        ? 'profile'
        : key === 'friends'
          ? 'friends'
          : key === 'practice'
            ? 'practice'
            : 'roadmap',
    )
  }

  const activeLesson = activeLessonId ? getLessonById(activeLessonId) : undefined

  if (!authReady) {
    return <div className="auth-screen">Loading…</div>
  }

  if (view === 'login') {
    return (
      <div className="auth-screen">
        <LoginForm
          onAuthed={syncDisplayName}
          initialConfirmEmail={confirmLinkEmail}
          onDemoContinue={() => {
            setDemoUser(true)
            setView('roadmap')
          }}
        />
      </div>
    )
  }

  const activeNav: NavKey =
    view === 'profile'
      ? 'profile'
      : view === 'friends'
        ? 'friends'
        : view === 'practice'
          ? 'practice'
          : 'dashboard'

  const inPracticeDrill = view === 'practice' && practiceLesson !== null
  const immersive = view === 'lesson' || view === 'boss' || inPracticeDrill

  return (
    <GamificationProvider
      key={userId}
      userId={userId}
      progressList={progressList}
      streak={streak}
    >
      <MainLayout
        active={activeNav}
        onNavigate={handleNavigate}
        displayName={displayName}
        photoURL={photoURL}
        demoMode={demoUser || isDemoMode()}
        onSignOut={() => void handleSignOut()}
        immersive={immersive}
      >
        {view === 'roadmap' && (
          <Roadmap
            progressList={progressList}
            userId={userId}
            onSelectLesson={openLesson}
            onStartBoss={() => {
              setActiveLessonId(null)
              setPracticeLesson(null)
              setView('boss')
            }}
          />
        )}

        {view === 'boss' && (
          <BossLevel
            userId={userId}
            onExit={() => {
              setView('roadmap')
              void refreshProgress()
            }}
            onGoToPractice={() => setView('practice')}
          />
        )}

        {view === 'profile' && (
          <ProfilePage
            displayName={displayName}
            photoURL={photoURL}
            progressList={progressList}
            onAvatarFile={handleAvatarFile}
          />
        )}

        {view === 'friends' && (
          <FriendsPage
            me={{
              uid: userId,
              name: displayName ?? 'Learner',
              email: authUser?.email ?? '',
              photoURL,
            }}
          />
        )}

        {view === 'practice' && !practiceLesson && (
          <PracticePage userId={userId} onStart={(lesson) => setPracticeLesson(lesson)} />
        )}

        {view === 'practice' && practiceLesson && (
          <LessonPlayer
            key={practiceLesson.lessonId}
            lesson={practiceLesson}
            userId={userId}
            ephemeral
            onStepComplete={handleStepComplete}
            onExit={() => setPracticeLesson(null)}
            onComplete={() => setPracticeLesson(null)}
          />
        )}

        {view === 'lesson' && activeLesson && (
          <LessonPlayer
            lesson={activeLesson}
            userId={userId}
            onStepComplete={handleStepComplete}
            onExit={() => {
              setView('roadmap')
              void refreshProgress()
            }}
            onComplete={() => {
              void refreshProgress()
              setView('roadmap')
            }}
          />
        )}
      </MainLayout>

      <ComboLayer />
      <LevelUpModal displayName={displayName} photoURL={photoURL} />
    </GamificationProvider>
  )
}

export default App
