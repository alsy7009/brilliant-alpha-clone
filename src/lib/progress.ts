import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import type { Lesson } from '../types/lesson'
import type { UserProgress } from '../types/progress'
import { db, isFirebaseConfigured } from './firebase'
import { computeStreak, STORAGE_KEY } from './streak'

function progressDocId(userId: string, lessonId: string): string {
  return `${userId}_${lessonId}`
}

function emptyProgress(userId: string, lesson: Lesson): UserProgress {
  return {
    userId_lessonId: progressDocId(userId, lesson.lessonId),
    userId,
    lessonId: lesson.lessonId,
    currentStepId: lesson.steps[0].stepId,
    isCompleted: false,
    completedSteps: [],
    streakCount: 0,
    lastActiveTimestamp: new Date().toISOString(),
  }
}

function readLocalProgress(): Record<string, UserProgress> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, UserProgress>
  } catch {
    return {}
  }
}

function writeLocalProgress(all: Record<string, UserProgress>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export async function fetchAllProgress(userId: string): Promise<UserProgress[]> {
  if (!isFirebaseConfigured) {
    const all = readLocalProgress()
    return Object.values(all).filter((p) => p.userId === userId)
  }

  const q = query(collection(db, 'user_progress'), where('userId', '==', userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => d.data() as UserProgress)
}

export async function fetchLessonProgress(
  userId: string,
  lesson: Lesson,
): Promise<UserProgress> {
  const docId = progressDocId(userId, lesson.lessonId)

  if (!isFirebaseConfigured) {
    const all = readLocalProgress()
    return all[docId] ?? emptyProgress(userId, lesson)
  }

  const ref = doc(db, 'user_progress', docId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    return emptyProgress(userId, lesson)
  }
  return snapshot.data() as UserProgress
}

export async function saveLessonProgress(progress: UserProgress): Promise<void> {
  if (!isFirebaseConfigured) {
    const all = readLocalProgress()
    all[progress.userId_lessonId] = progress
    writeLocalProgress(all)
    return
  }

  await setDoc(doc(db, 'user_progress', progress.userId_lessonId), progress, {
    merge: true,
  })
}

export async function completeStep(
  userId: string,
  lesson: Lesson,
  stepId: string,
): Promise<UserProgress> {
  const current = await fetchLessonProgress(userId, lesson)
  const stepIndex = lesson.steps.findIndex((s) => s.stepId === stepId)
  const isLastStep = stepIndex === lesson.steps.length - 1
  const completedSteps = current.completedSteps.includes(stepId)
    ? current.completedSteps
    : [...current.completedSteps, stepId]

  const streak = computeStreak(current.streakCount, current.lastActiveTimestamp)
  const nextStep = lesson.steps[stepIndex + 1]

  // Once a lesson is completed it stays completed, even if the learner replays
  // an earlier step after quitting mid-review.
  const isCompleted = current.isCompleted || isLastStep

  const updated: UserProgress = {
    ...current,
    completedSteps,
    streakCount: streak.streakCount,
    lastActiveTimestamp: streak.lastActiveTimestamp,
    isCompleted,
    currentStepId: isLastStep ? stepId : (nextStep?.stepId ?? stepId),
  }

  await saveLessonProgress(updated)
  return updated
}

export function isLessonUnlocked(
  lessonOrder: number,
  allProgress: UserProgress[],
  lessons: Lesson[],
): boolean {
  if (lessonOrder === 1) return true
  const previous = lessons.find((l) => l.order === lessonOrder - 1)
  if (!previous) return true
  const prevProgress = allProgress.find((p) => p.lessonId === previous.lessonId)
  return prevProgress?.isCompleted === true
}

export function getGlobalStreak(allProgress: UserProgress[]): number {
  return allProgress.reduce((max, p) => Math.max(max, p.streakCount), 0)
}
