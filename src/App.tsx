import { useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { getLessonById } from './content/catalog'
import { LessonPlayer } from './components/LessonPlayer/LessonPlayer'
import { LoginForm } from './components/Login/LoginForm'
import { Roadmap } from './components/Roadmap/Roadmap'
import { MainLayout, type NavKey } from './components/Layout/MainLayout'
import { ProfilePage } from './components/Profile/ProfilePage'
import { LevelUpModal } from './components/Gamification/LevelUpModal'
import { ComboLayer } from './components/Gamification/ComboLayer'
import { GamificationProvider } from './context/GamificationContext'
import {
  initAuthRedirect,
  isDemoMode,
  resolveUserId,
  subscribeToAuth,
} from './lib/auth'
import { fetchAllProgress, getGlobalStreak } from './lib/progress'
import type { AppView, UserProgress } from './types/progress'
import './App.css'

function App() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [demoUser, setDemoUser] = useState(false)
  const [view, setView] = useState<AppView>('login')
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [progressList, setProgressList] = useState<UserProgress[]>([])

  const userId = demoUser ? resolveUserId(null) : resolveUserId(authUser)
  const displayName = authUser?.displayName ?? (demoUser ? 'Demo Learner' : undefined)
  const photoURL = authUser?.photoURL ?? undefined

  const refreshProgress = useCallback(async () => {
    const list = await fetchAllProgress(userId)
    setProgressList(list)
  }, [userId])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    void initAuthRedirect().then(() => {
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

  const handleSignOut = () => {
    setDemoUser(false)
    setView('login')
    setProgressList([])
  }

  const handleNavigate = (key: NavKey) => {
    setActiveLessonId(null)
    setView(key === 'profile' ? 'profile' : 'roadmap')
  }

  const activeLesson = activeLessonId ? getLessonById(activeLessonId) : undefined

  if (!authReady) {
    return <div className="auth-screen">Loading…</div>
  }

  if (view === 'login') {
    return (
      <div className="auth-screen">
        <LoginForm
          onDemoContinue={() => {
            setDemoUser(true)
            setView('roadmap')
          }}
        />
      </div>
    )
  }

  const activeNav: NavKey = view === 'profile' ? 'profile' : 'dashboard'

  return (
    <GamificationProvider progressList={progressList} streak={getGlobalStreak(progressList)}>
      <MainLayout
        active={activeNav}
        onNavigate={handleNavigate}
        displayName={displayName}
        photoURL={photoURL}
        demoMode={demoUser || isDemoMode()}
        onSignOut={handleSignOut}
        immersive={view === 'lesson'}
      >
        {view === 'roadmap' && (
          <Roadmap progressList={progressList} onSelectLesson={openLesson} />
        )}

        {view === 'profile' && (
          <ProfilePage
            displayName={displayName}
            photoURL={photoURL}
            progressList={progressList}
          />
        )}

        {view === 'lesson' && activeLesson && (
          <LessonPlayer
            lesson={activeLesson}
            userId={userId}
            onStepComplete={() => void refreshProgress()}
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
