export interface UserProfile {
  userId: string
  displayName: string
  email: string
  photoURL?: string
  authProvider: 'password' | 'google.com'
  createdAt: string
}

export interface UserProgress {
  userId_lessonId: string
  userId: string
  lessonId: string
  currentStepId: string
  isCompleted: boolean
  completedSteps: string[]
  streakCount: number
  lastActiveTimestamp: string
}

export type AppView =
  | 'login'
  | 'roadmap'
  | 'lesson'
  | 'profile'
  | 'friends'
  | 'practice'
  | 'boss'
