import type { Lesson, LessonStep } from '../types/lesson'
import { aiJson, isAiEnabled } from './ai'

/** A practice topic the learner can pick. Each maps to one generatable widget type. */
export interface PracticeTopic {
  id: TopicId
  label: string
  blurb: string
}

export type TopicId = 'expressions' | 'evaluate' | 'linear' | 'foil'

export const PRACTICE_TOPICS: PracticeTopic[] = [
  { id: 'expressions', label: 'Building Expressions', blurb: 'Write a·x + b from a picture' },
  { id: 'evaluate', label: 'Evaluating Expressions', blurb: 'Plug in a value and simplify' },
  { id: 'linear', label: 'Linear Intercepts', blurb: 'Find x- and y-intercepts' },
  { id: 'foil', label: 'FOIL / Expanding', blurb: 'Multiply two binomials' },
]

// ---------- small helpers ----------

const VAR_COLORS = ['#e67e22', '#1abc9c', '#9b59b6', '#3498db', '#e74c3c']
const VAR_LETTERS = ['a', 'b', 'n', 'k', 't', 'm', 'p']

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.round(n)))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Build a tile bank that always contains the answers, padded with unique distractors. */
function tileBank(answers: string[], distractors: string[], size: number): string[] {
  const seen = new Set(answers)
  const out = [...answers]
  for (const d of distractors) {
    if (out.length >= size) break
    if (!seen.has(d)) {
      seen.add(d)
      out.push(d)
    }
  }
  return shuffle(out)
}

/** Format "y = mx + b" with a proper minus sign for the constant. */
function lineLabel(slope: number, intercept: number): string {
  const m = slope === 1 ? 'x' : `${slope}x`
  if (intercept === 0) return `y = ${m}`
  return intercept > 0 ? `y = ${m} + ${intercept}` : `y = ${m} − ${Math.abs(intercept)}`
}

// ---------- per-topic step builders (answers computed here, never trusted to the AI) ----------

interface RawSpec {
  topic?: string
  variable?: string
  variableCount?: number
  constantCount?: number
  coef?: number
  constant?: number
  value?: number
  slope?: number
  intercept?: number
  mode?: string
  p?: number
  a?: number
  q?: number
  b?: number
}

function buildExpressionBuild(spec: RawSpec, idx: number): LessonStep {
  const variable = (spec.variable && /^[a-z]$/i.test(spec.variable) ? spec.variable : pick(VAR_LETTERS)).toLowerCase()
  const variableCount = clamp(spec.variableCount ?? randInt(2, 5), 2, 5)
  const constantCount = clamp(spec.constantCount ?? randInt(1, 5), 1, 5)
  const otherLetter = pick(VAR_LETTERS.filter((l) => l !== variable))

  const bank = tileBank(
    [String(variableCount), String(constantCount)],
    [String(variableCount + 1), String(constantCount + 1), String(randInt(2, 6))],
    4,
  ).concat(shuffle([variable, otherLetter]))

  return {
    stepId: `p${idx}_expr`,
    type: 'expression-build',
    instruction: 'Write an expression for this model.',
    widgetConfig: {
      visualModel: { variable, variableColor: pick(VAR_COLORS), variableCount, constantCount },
      slots: [
        { slotId: 'coef', accept: ['number'] },
        { slotId: 'var', accept: ['variable'] },
        { slotId: 'const', accept: ['number'] },
      ],
      slotLayout: ['coef', 'var', '+', 'const'],
      tileBank: bank,
    },
    validationRules: {
      expectedSlots: { coef: String(variableCount), var: variable, const: String(constantCount) },
      expectedExpression: `${variableCount}${variable} + ${constantCount}`,
    },
    explanations: {
      correct: `Yes! ${variableCount} ${variable} tiles and ${constantCount} unit squares make ${variableCount}${variable} + ${constantCount}.`,
      wrong_count: 'Count the colored bars and the gray squares again.',
      wrong_variable: `The tall bars are labeled ${variable} — use that variable.`,
      incomplete: 'Fill all three boxes using tiles from the bank.',
      generic_wrong: `How many ${variable}'s? How many ones?`,
    },
  }
}

function buildEvaluate(spec: RawSpec, idx: number): LessonStep {
  const variable = (spec.variable && /^[a-z]$/i.test(spec.variable) ? spec.variable : pick(VAR_LETTERS)).toLowerCase()
  const coef = clamp(spec.coef ?? randInt(2, 5), 2, 6)
  const constant = clamp(spec.constant ?? randInt(1, 9), 1, 9)
  const value = clamp(spec.value ?? randInt(2, 9), 2, 9)
  const result = coef * value + constant

  const bank = tileBank(
    [String(value), String(result)],
    [String(constant), String(coef * value), String(result + 1), String(result - 1), String(coef + value)],
    5,
  )

  return {
    stepId: `p${idx}_eval`,
    type: 'expression-evaluate',
    instruction: `Evaluate ${coef}${variable} + ${constant} for ${variable} = ${value}.`,
    widgetConfig: {
      expression: `${coef}${variable} + ${constant}`,
      substitute: { variable, value },
      visualModel: { variable, variableColor: pick(VAR_COLORS), variableCount: coef, constantCount: constant },
      slotIds: ['sub', 'result'],
      slotLabels: [`${coef} · □ + ${constant}`, '= □'],
      tileBank: bank,
    },
    validationRules: {
      expectedSlots: { sub: String(value), result: String(result) },
    },
    explanations: {
      correct: `${coef}(${value}) + ${constant} = ${coef * value} + ${constant} = ${result}.`,
      wrong_substitution: `Plug in ${variable} = ${value} where ${variable} appears.`,
      wrong_arithmetic: `Multiply ${coef} × ${value} first, then add ${constant}.`,
      incomplete: 'Fill both boxes using the number tiles.',
      generic_wrong: `Replace ${variable} with ${value} and simplify.`,
    },
  }
}

function buildLinear(spec: RawSpec, idx: number): LessonStep {
  const slope = clamp(spec.slope ?? randInt(1, 4), 1, 4)
  const findX = (spec.mode ?? (idx % 2 === 0 ? 'y' : 'x')).toString().toLowerCase().startsWith('x')

  let intercept: number
  let expected: number
  if (findX) {
    // Choose an integer x-intercept r, then intercept = -slope*r so the root is whole.
    const r = (() => {
      let v = clamp(spec.intercept ?? randInt(-4, 4), -5, 5)
      if (v === 0) v = 2
      return v
    })()
    intercept = -slope * r
    expected = r
  } else {
    intercept = clamp(spec.intercept ?? randInt(-6, 8), -6, 8)
    expected = intercept
  }

  const label = lineLabel(slope, intercept)

  return {
    stepId: `p${idx}_lin`,
    type: 'linear-graph',
    instruction: findX
      ? `For ${label}, find the x-intercept (where the line crosses the x-axis).`
      : `For ${label}, find the y-intercept (where the line crosses the y-axis).`,
    widgetConfig: {
      equation: { slope, intercept },
      grid: { xMin: -6, xMax: 6, yMin: -8, yMax: 8 },
      mode: findX ? 'find-x-intercept' : 'find-y-intercept',
      showGraph: false,
      equationLabel: label,
    },
    validationRules: findX ? { expectedXIntercept: expected } : { expectedYIntercept: expected },
    explanations: findX
      ? {
          correct: `Set y = 0: 0 = ${slope}x ${intercept >= 0 ? '+ ' + intercept : '− ' + Math.abs(intercept)} → x = ${expected}.`,
          wrong_intercept: 'The x-intercept is the x-value where y = 0. Set y = 0 and solve for x.',
          incomplete: 'Type a whole number for the x-intercept.',
          generic_wrong: 'To find the x-intercept, set y = 0 and solve for x.',
        }
      : {
          correct: `Set x = 0: y = ${slope}(0) ${intercept >= 0 ? '+ ' + intercept : '− ' + Math.abs(intercept)} = ${expected}. The y-intercept is b = ${expected}.`,
          wrong_intercept: 'The y-intercept is the y-value where x = 0 — the number b in y = mx + b.',
          incomplete: 'Type a whole number for the y-intercept.',
          generic_wrong: 'The y-intercept is the b in y = mx + b.',
        },
  }
}

function buildFoil(spec: RawSpec, idx: number): LessonStep {
  const p = clamp(spec.p ?? pick([1, 1, 2, 3]), 1, 3)
  const q = clamp(spec.q ?? pick([1, 1, 2]), 1, 3)
  const a = clamp(spec.a ?? randInt(1, 4), 1, 5)
  const b = clamp(spec.b ?? randInt(1, 4), 1, 5)

  const A = p * q
  const B = p * b + q * a
  const C = a * b

  const pf = p === 1 ? 'x' : `${p}x`
  const qf = q === 1 ? 'x' : `${q}x`
  const factors = `(${pf} + ${a})(${qf} + ${b})`

  const bank = tileBank(
    [String(A), String(B), String(C)],
    [String(a + b), String(p + q), String(C + 1), String(B + 1), String(B - 1), String(a * q)],
    6,
  )

  return {
    stepId: `p${idx}_foil`,
    type: 'foil-multiply',
    instruction: `Expand ${factors}. Drag coefficients into the polynomial.`,
    widgetConfig: {
      factors,
      layout: ['{a}', 'x²', '+', '{b}', 'x', '+', '{c}'],
      slotIds: ['a', 'b', 'c'],
      tileBank: bank,
    },
    validationRules: {
      expectedSlots: { a: String(A), b: String(B), c: String(C) },
    },
    explanations: {
      correct: `Yes! ${A === 1 ? '' : A}x² + ${B}x + ${C}. First: ${pf}·${qf} = ${A}x², middle = ${p * b} + ${q * a} = ${B}x, last: ${a}·${b} = ${C}.`,
      incomplete: 'Fill all three boxes: x², x, and the constant.',
      generic_wrong: `FOIL: First terms give the x² coefficient, Outer + Inner give the middle, Last terms give the constant.`,
    },
  }
}

function buildStep(topic: TopicId, spec: RawSpec, idx: number): LessonStep {
  switch (topic) {
    case 'expressions':
      return buildExpressionBuild(spec, idx)
    case 'evaluate':
      return buildEvaluate(spec, idx)
    case 'linear':
      return buildLinear(spec, idx)
    case 'foil':
      return buildFoil(spec, idx)
  }
}

// ---------- interleaving ----------

/** Reorder so the same topic is never back-to-back when avoidable (interleaving aids learning). */
function interleave(items: { topic: TopicId; spec: RawSpec }[]): { topic: TopicId; spec: RawSpec }[] {
  const buckets = new Map<TopicId, RawSpec[]>()
  for (const it of items) {
    const list = buckets.get(it.topic) ?? []
    list.push(it.spec)
    buckets.set(it.topic, list)
  }

  const out: { topic: TopicId; spec: RawSpec }[] = []
  let lastTopic: TopicId | null = null

  while (out.length < items.length) {
    // Pick the topic with the most remaining that isn't the one we just used.
    const candidates = [...buckets.entries()].filter(([, v]) => v.length > 0)
    candidates.sort((x, y) => y[1].length - x[1].length)
    let choice = candidates.find(([t]) => t !== lastTopic) ?? candidates[0]
    const [topic, specs] = choice
    out.push({ topic, spec: specs.shift()! })
    lastTopic = topic
  }
  return out
}

// ---------- public API ----------

export interface GenerateOptions {
  topics: TopicId[]
  count: number
}

/**
 * Generate a fresh, ephemeral practice "lesson" across the chosen topics.
 * Bolt (the AI) proposes the numbers for variety; answers are computed here so the
 * problems are always valid and checkable. Falls back to local random generation
 * if AI is unavailable or returns nothing usable.
 */
export async function generatePracticeLesson(opts: GenerateOptions): Promise<Lesson> {
  const topics = opts.topics.length ? opts.topics : (['evaluate'] as TopicId[])
  const count = clamp(opts.count, 3, 16)

  let specs: { topic: TopicId; spec: RawSpec }[] = []

  if (isAiEnabled()) {
    specs = await requestAiSpecs(topics, count)
  }
  // Top up (or fully fill) with locally generated specs if AI gave too few.
  while (specs.length < count) {
    const topic = topics[specs.length % topics.length]
    specs.push({ topic, spec: {} })
  }
  specs = specs.slice(0, count)

  const ordered = interleave(specs)
  const steps = ordered.map((o, i) => buildStep(o.topic, o.spec, i))

  return {
    lessonId: `practice_${Date.now()}`,
    title: 'Mixed Drills',
    subject: 'algebra',
    order: 999,
    steps,
  }
}

async function requestAiSpecs(topics: TopicId[], count: number): Promise<{ topic: TopicId; spec: RawSpec }[]> {
  const system =
    'You generate practice math problems for a middle-school algebra game. ' +
    'Return ONLY JSON of the form {"problems":[ ... ]}. Each problem is an object with a "topic" ' +
    'field (one of the allowed topics) plus number fields for that topic. Keep numbers small and ' +
    'middle-school friendly (positive integers, single-letter variables). Vary the problems. ' +
    'MIX the topics so the same topic is not repeated back-to-back. ' +
    'Topic fields:\n' +
    '- expressions: {variable: letter, variableCount: 2-5, constantCount: 1-5}\n' +
    '- evaluate: {coef: 2-6, variable: letter, constant: 1-9, value: 2-9}\n' +
    '- linear: {slope: 1-4, intercept: -6..8, mode: "y" or "x"}\n' +
    '- foil: {p: 1-3, a: 1-4, q: 1-3, b: 1-4} for (p·x + a)(q·x + b)'

  const user = `Generate exactly ${count} problems using only these topics: ${topics.join(', ')}. Interleave them.`

  const data = await aiJson(system, user)
  if (!data || typeof data !== 'object') return []
  const arr = (data as { problems?: unknown }).problems
  if (!Array.isArray(arr)) return []

  const allowed = new Set(topics)
  const out: { topic: TopicId; spec: RawSpec }[] = []
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') continue
    const spec = raw as RawSpec
    const topic = spec.topic as TopicId | undefined
    if (topic && allowed.has(topic)) {
      out.push({ topic, spec })
    }
  }
  return out
}
