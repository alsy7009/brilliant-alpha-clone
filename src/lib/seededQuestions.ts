/**
 * Deterministic, seeded math-question generator for PvP. Both players derive the SAME
 * questions from the shared match id (no AI, no network), so a duel is perfectly fair.
 * Output steps reuse the exact widget shapes used by StepWidget + checkStep.
 */
import type { LessonStep } from '../types/lesson'

type Rng = () => number

function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, deterministic PRNG. */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function ri(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function pick<T>(rng: Rng, arr: T[]): T {
  return arr[ri(rng, 0, arr.length - 1)]
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(rng, 0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function tileBank(answers: string[], distractors: string[], size: number, rng: Rng): string[] {
  const seen = new Set(answers)
  const out = [...answers]
  for (const d of distractors) {
    if (out.length >= size) break
    if (!seen.has(d)) {
      seen.add(d)
      out.push(d)
    }
  }
  return shuffle(rng, out)
}

const VARS = ['a', 'b', 'n', 'k', 't', 'm', 'p']
const COLORS = ['#e67e22', '#1abc9c', '#9b59b6', '#3498db', '#e74c3c']

type Topic = 'evaluate' | 'expressions' | 'foil' | 'linear'
const TOPICS: Topic[] = ['evaluate', 'foil', 'linear', 'expressions']

function buildEvaluate(rng: Rng, i: number): LessonStep {
  const variable = pick(rng, VARS)
  const coef = ri(rng, 2, 6)
  const constant = ri(rng, 1, 9)
  const value = ri(rng, 2, 9)
  const result = coef * value + constant
  return {
    stepId: `pvp${i}_eval`,
    type: 'expression-evaluate',
    instruction: `Evaluate ${coef}${variable} + ${constant} for ${variable} = ${value}.`,
    widgetConfig: {
      expression: `${coef}${variable} + ${constant}`,
      substitute: { variable, value },
      visualModel: { variable, variableColor: pick(rng, COLORS), variableCount: coef, constantCount: constant },
      slotIds: ['sub', 'result'],
      slotLabels: [`${coef} · □ + ${constant}`, '= □'],
      tileBank: tileBank(
        [String(value), String(result)],
        [String(constant), String(coef * value), String(result + 1), String(result - 1)],
        5,
        rng,
      ),
    },
    validationRules: { expectedSlots: { sub: String(value), result: String(result) } },
    explanations: {
      correct: `${coef}(${value}) + ${constant} = ${result}.`,
      incomplete: 'Fill both boxes.',
      generic_wrong: `Replace ${variable} with ${value} and simplify.`,
    },
  }
}

function buildExpressions(rng: Rng, i: number): LessonStep {
  const variable = pick(rng, VARS)
  const variableCount = ri(rng, 2, 5)
  const constantCount = ri(rng, 1, 5)
  const other = pick(rng, VARS.filter((v) => v !== variable))
  const bank = tileBank(
    [String(variableCount), String(constantCount)],
    [String(variableCount + 1), String(constantCount + 1), String(ri(rng, 2, 6))],
    4,
    rng,
  ).concat(shuffle(rng, [variable, other]))
  return {
    stepId: `pvp${i}_expr`,
    type: 'expression-build',
    instruction: 'Write an expression for this model.',
    widgetConfig: {
      visualModel: { variable, variableColor: pick(rng, COLORS), variableCount, constantCount },
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
      correct: `${variableCount}${variable} + ${constantCount}.`,
      incomplete: 'Fill all three boxes.',
      generic_wrong: `How many ${variable}'s? How many ones?`,
    },
  }
}

function buildFoil(rng: Rng, i: number): LessonStep {
  const p = pick(rng, [1, 1, 2, 3])
  const q = pick(rng, [1, 1, 2])
  const a = ri(rng, 1, 4)
  const b = ri(rng, 1, 4)
  const A = p * q
  const B = p * b + q * a
  const C = a * b
  const pf = p === 1 ? 'x' : `${p}x`
  const qf = q === 1 ? 'x' : `${q}x`
  return {
    stepId: `pvp${i}_foil`,
    type: 'foil-multiply',
    instruction: `Expand (${pf} + ${a})(${qf} + ${b}).`,
    widgetConfig: {
      factors: `(${pf} + ${a})(${qf} + ${b})`,
      layout: ['{a}', 'x²', '+', '{b}', 'x', '+', '{c}'],
      slotIds: ['a', 'b', 'c'],
      tileBank: tileBank(
        [String(A), String(B), String(C)],
        [String(a + b), String(p + q), String(C + 1), String(B + 1), String(B - 1)],
        6,
        rng,
      ),
    },
    validationRules: { expectedSlots: { a: String(A), b: String(B), c: String(C) } },
    explanations: {
      correct: `${A === 1 ? '' : A}x² + ${B}x + ${C}.`,
      incomplete: 'Fill all three boxes.',
      generic_wrong: 'First × First, Outer + Inner, Last × Last.',
    },
  }
}

function buildLinear(rng: Rng, i: number): LessonStep {
  const slope = ri(rng, 1, 4)
  const findX = i % 2 === 0
  let intercept: number
  let expected: number
  if (findX) {
    let r = ri(rng, -4, 4)
    if (r === 0) r = 2
    intercept = -slope * r
    expected = r
  } else {
    intercept = ri(rng, -6, 8)
    expected = intercept
  }
  const m = slope === 1 ? 'x' : `${slope}x`
  const label = intercept >= 0 ? `y = ${m} + ${intercept}` : `y = ${m} − ${Math.abs(intercept)}`
  return {
    stepId: `pvp${i}_lin`,
    type: 'linear-graph',
    instruction: findX
      ? `For ${label}, find the x-intercept (where y = 0).`
      : `For ${label}, find the y-intercept (where x = 0).`,
    widgetConfig: {
      equation: { slope, intercept },
      grid: { xMin: -6, xMax: 6, yMin: -8, yMax: 8 },
      mode: findX ? 'find-x-intercept' : 'find-y-intercept',
      showGraph: false,
      equationLabel: label,
    },
    validationRules: findX ? { expectedXIntercept: expected } : { expectedYIntercept: expected },
    explanations: {
      correct: findX ? `x-intercept is ${expected}.` : `y-intercept is ${expected}.`,
      incomplete: 'Type a whole number.',
      generic_wrong: findX ? 'Set y = 0 and solve for x.' : 'The y-intercept is b in y = mx + b.',
    },
  }
}

function build(topic: Topic, rng: Rng, i: number): LessonStep {
  switch (topic) {
    case 'evaluate':
      return buildEvaluate(rng, i)
    case 'expressions':
      return buildExpressions(rng, i)
    case 'foil':
      return buildFoil(rng, i)
    case 'linear':
      return buildLinear(rng, i)
  }
}

/** Deterministic interleaved question set for a given seed (e.g. the match id). */
export function seededQuestions(seed: string, count: number): LessonStep[] {
  const rng = mulberry32(hashString(seed))
  const steps: LessonStep[] = []
  for (let i = 0; i < count; i++) {
    steps.push(build(TOPICS[i % TOPICS.length], rng, i))
  }
  return steps
}
