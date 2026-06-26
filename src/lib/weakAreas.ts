import { PRACTICE_TOPICS, type TopicId } from './practice'

/**
 * Tracks how much a learner struggles per practice topic so Bolt can recommend a
 * targeted review. Stored locally per user (lightweight, no Firestore needed).
 */

const KEY_PREFIX = 'algebraquest_weak_'

type WeakMap = Partial<Record<TopicId, number>>

const ALL_TOPIC_IDS = PRACTICE_TOPICS.map((t) => t.id)

/** Map a lesson step type to its practice topic (or null if it has no drill topic). */
export function topicForStepType(type: string): TopicId | null {
  switch (type) {
    case 'expression-build':
      return 'expressions'
    case 'expression-evaluate':
      return 'evaluate'
    case 'linear-graph':
    case 'plot-line':
      return 'linear'
    case 'foil-multiply':
      return 'foil'
    default:
      return null
  }
}

function read(userId: string): WeakMap {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    return raw ? (JSON.parse(raw) as WeakMap) : {}
  } catch {
    return {}
  }
}

function write(userId: string, map: WeakMap): void {
  try {
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

/** A wrong answer on this topic — bump its struggle score. */
export function recordStruggle(userId: string, topic: TopicId): void {
  const m = read(userId)
  m[topic] = (m[topic] ?? 0) + 1
  write(userId, m)
}

/** A clean first-try solve — slowly decay the struggle score so reviews stay current. */
export function recordMastery(userId: string, topic: TopicId): void {
  const m = read(userId)
  if (m[topic]) {
    m[topic] = Math.max(0, m[topic]! - 1)
    write(userId, m)
  }
}

export function hasWeakAreas(userId: string): boolean {
  const m = read(userId)
  return Object.values(m).some((c) => (c ?? 0) > 0)
}

/** Topic ids the learner has struggled with, most-struggled first. */
export function getWeakTopicLabels(userId: string): string[] {
  const m = read(userId)
  return (Object.entries(m) as [TopicId, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => PRACTICE_TOPICS.find((p) => p.id === t)?.label ?? t)
}

/**
 * Build a recommended review: the topics to draw from and a weight per topic
 * (higher = struggled more). Ensures at least two topics so the drill stays mixed.
 * Returns null if there's nothing to review yet.
 */
export function getRecommendation(
  userId: string,
): { topics: TopicId[]; weights: WeakMap } | null {
  const m = read(userId)
  const weak = (Object.entries(m) as [TopicId, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])

  if (weak.length === 0) return null

  const topics: TopicId[] = weak.map(([t]) => t)
  const weights: WeakMap = {}
  weak.forEach(([t, c]) => {
    weights[t] = c
  })

  // Guarantee variety so question types still interleave.
  if (topics.length < 2) {
    for (const t of ALL_TOPIC_IDS) {
      if (!topics.includes(t)) {
        topics.push(t)
        weights[t] = 1
      }
      if (topics.length >= 3) break
    }
  }

  return { topics, weights }
}
