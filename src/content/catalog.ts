import type { Lesson } from '../types/lesson'
import lesson01 from './lessons/alg_expressions_01.json'
import lesson02 from './lessons/alg_evaluate_01.json'
import lesson03 from './lessons/alg_linear_01.json'
import lesson04 from './lessons/alg_foil_01.json'
import lesson05 from './lessons/alg_quadratics_01.json'

export const LESSONS: Lesson[] = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
].sort((a, b) => a.order - b.order) as Lesson[]

export function getLessonById(lessonId: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.lessonId === lessonId)
}

export function getNextLessonId(lessonId: string): string | null {
  const index = LESSONS.findIndex((lesson) => lesson.lessonId === lessonId)
  if (index < 0 || index >= LESSONS.length - 1) return null
  return LESSONS[index + 1].lessonId
}
