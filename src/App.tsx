import { useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { getLessonById } from './content/catalog'
import { Header } from './components/Header/Header'
import { LessonPlayer } from './components/LessonPlayer/LessonPlayer'
import { LoginForm } from './components/Login/LoginForm'
import { Roadmap } from './components/Roadmap/Roadmap'
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
        setView('roadmap')
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

  const activeLesson = activeLessonId ? getLessonById(activeLessonId) : undefined

  if (!authReady) {
    return <div className="app-shell loading">Loading…</div>
  }

  return (
    <div className="app-shell">
      {view !== 'login' && (
        <Header
          streak={getGlobalStreak(progressList)}
          displayName={displayName}
          demoMode={demoUser || isDemoMode()}
          onSignOut={() => {
            setDemoUser(false)
            setView('login')
            setProgressList([])
          }}
        />
      )}

      <main className="app-main">
        {view === 'login' && (
          <LoginForm
            onDemoContinue={() => {
              setDemoUser(true)
              setView('roadmap')
            }}
          />
        )}

        {view === 'roadmap' && (
          <Roadmap
            progressList={progressList}
            onSelectLesson={openLesson}
          />
        )}

        {view === 'lesson' && activeLesson && (
          <LessonPlayer
            lesson={activeLesson}
            userId={userId}
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
      </main>
    </div>
  )
}

export default App
