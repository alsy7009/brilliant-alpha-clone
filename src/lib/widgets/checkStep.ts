import type {
  ExpressionEvaluateConfig,
  GraphSelectState,
  LessonStep,
  LinearGraphState,
  PlotLineConfig,
  PlotLineState,
  SlotWidgetState,
  WidgetState,
} from '../../types/lesson'
import { isSlotValidationRules } from '../../types/lesson'
import { evaluateWidget } from './evaluateWidget'
import { getExplanation } from '../validation/scaleBalance'

export type CheckStatus = 'correct' | 'incomplete' | 'wrong'

export interface StepCheck {
  status: CheckStatus
  /** Per-slot correctness for filled slots (slot widgets only); null otherwise. */
  slotResults: Record<string, boolean> | null
}

const SLOT_TYPES = new Set(['expression-build', 'expression-evaluate', 'foil-multiply'])

export function isSlotStep(step: LessonStep): boolean {
  return SLOT_TYPES.has(step.type)
}

export function checkStep(step: LessonStep, state: WidgetState): StepCheck {
  const outcome = evaluateWidget(step, state)
  const status: CheckStatus =
    outcome === 'correct' ? 'correct' : outcome === 'incomplete' ? 'incomplete' : 'wrong'

  let slotResults: Record<string, boolean> | null = null
  const rules = step.validationRules
  if (isSlotStep(step) && rules && isSlotValidationRules(rules)) {
    const slots = (state as SlotWidgetState).slots
    slotResults = {}
    for (const [slotId, expected] of Object.entries(rules.expectedSlots)) {
      const val = slots[slotId]
      if (val != null && val !== '') slotResults[slotId] = val === expected
    }
  }
  return { status, slotResults }
}

// ---- Human labels & concept hints per slot ----

function slotLabel(step: LessonStep, slotId: string): string {
  switch (step.type) {
    case 'foil-multiply':
      if (slotId === 'a') return 'x² coefficient'
      if (slotId === 'b') return 'middle (x) coefficient'
      if (slotId === 'c') return 'constant'
      return slotId
    case 'expression-build':
      if (slotId === 'coef') return 'coefficient (number in front)'
      if (slotId === 'var') return 'variable'
      if (slotId === 'const') return 'constant'
      return slotId
    case 'expression-evaluate':
      if (slotId === 'sub') return 'substituted value'
      if (slotId === 'result') return 'final answer'
      return slotId
    default:
      return slotId
  }
}

function conceptHint(step: LessonStep, slotId: string): string {
  switch (step.type) {
    case 'foil-multiply':
      if (slotId === 'a') return 'Multiply the two x-terms (the "First" terms).'
      if (slotId === 'b') return 'Add the Outer and Inner products.'
      if (slotId === 'c') return 'Multiply the two constants (the "Last" terms).'
      return ''
    case 'expression-build':
      if (slotId === 'coef') return 'Count how many variable bars are shown.'
      if (slotId === 'var') return 'Use the letter printed on the bars.'
      if (slotId === 'const') return 'Count the small unit squares.'
      return ''
    case 'expression-evaluate': {
      const cfg = step.widgetConfig as ExpressionEvaluateConfig
      const v = cfg.substitute?.variable ?? 'the variable'
      if (slotId === 'sub') return `Plug in the number given for ${v} (it's in the question).`
      if (slotId === 'result') return `Multiply first, then add — work through ${cfg.expression}.`
      return ''
    }
    default:
      return ''
  }
}

function joinLabels(labels: string[]): string {
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

function direction(step: LessonStep, slotId: string, state: WidgetState): string {
  const rules = step.validationRules
  if (!rules || !isSlotValidationRules(rules)) return ''
  const actual = Number((state as SlotWidgetState).slots[slotId])
  const expected = Number(rules.expectedSlots[slotId])
  if (Number.isNaN(actual) || Number.isNaN(expected)) return ''
  return actual > expected ? 'too high' : 'too low'
}

// ---- Full-answer reveal (attempt 3) ----

function revealSlotAnswer(step: LessonStep): string {
  const rules = step.validationRules
  if (!rules || !isSlotValidationRules(rules)) return ''
  const parts = Object.keys(rules.expectedSlots).map(
    (slotId) => `${slotLabel(step, slotId)} = ${rules.expectedSlots[slotId]}`,
  )
  return parts.join(', ')
}

function revealNonSlotAnswer(step: LessonStep): string {
  const rules = step.validationRules
  switch (step.type) {
    case 'linear-graph': {
      if (rules && 'expectedYIntercept' in rules && rules.expectedYIntercept !== undefined) {
        return `the y-intercept is ${rules.expectedYIntercept}`
      }
      if (rules && 'expectedXIntercept' in rules && rules.expectedXIntercept !== undefined) {
        return `the x-intercept is ${rules.expectedXIntercept}`
      }
      return ''
    }
    case 'plot-line': {
      const cfg = step.widgetConfig as PlotLineConfig
      const { slope, intercept } = cfg.equation
      const y1 = intercept
      const y2 = slope + intercept
      return `two points on the line are (0, ${y1}) and (1, ${y2})`
    }
    case 'graph-select': {
      if (rules && 'correctOptionId' in rules) {
        return `the correct graph is ${rules.correctOptionId.toUpperCase()}`
      }
      return ''
    }
    default:
      return ''
  }
}

/** Human-readable correct answer for any step (used by Boss Level review). */
export function revealAnswer(step: LessonStep): string {
  return isSlotStep(step) ? revealSlotAnswer(step) : revealNonSlotAnswer(step)
}

/**
 * Escalating feedback:
 *  - attempt 1: name the wrong part(s) + a concept nudge
 *  - attempt 2: add direction (too high / too low)
 *  - attempt 3+: reveal the full answer + explanation (learner still types it in)
 */
export function buildFeedback(
  step: LessonStep,
  state: WidgetState,
  wrongAttempts: number,
): { message: string; revealed: boolean } {
  const check = checkStep(step, state)
  const explanations = step.explanations ?? {}

  if (check.status === 'incomplete') {
    return { message: explanations.incomplete ?? 'Fill in every box before checking.', revealed: false }
  }
  if (check.status === 'correct') {
    return { message: explanations.correct ?? 'Correct! ✓', revealed: false }
  }

  // Wrong answer.
  if (wrongAttempts >= 3) {
    const answer = isSlotStep(step) ? revealSlotAnswer(step) : revealNonSlotAnswer(step)
    const why = explanations.correct ? ` ${explanations.correct}` : ''
    const ans = answer ? `Here's the answer: ${answer}.${why} Enter it to finish.` : explanations.generic_wrong
    return { message: ans ?? 'Enter the correct answer to finish.', revealed: true }
  }

  // Slot widgets: target the specific wrong slot(s).
  if (isSlotStep(step) && check.slotResults) {
    const wrong = Object.keys(check.slotResults).filter((k) => !check.slotResults![k])
    if (wrong.length > 0) {
      const labels = joinLabels(wrong.map((s) => slotLabel(step, s)))
      if (wrongAttempts <= 1) {
        return {
          message: `Not quite — check the ${labels}. ${conceptHint(step, wrong[0])}`.trim(),
          revealed: false,
        }
      }
      // attempt 2: add direction for the first wrong (numeric) slot
      const dir = direction(step, wrong[0], state)
      const dirText = dir ? `Your ${slotLabel(step, wrong[0])} is ${dir}. ` : ''
      return {
        message: `Closer! ${dirText}${conceptHint(step, wrong[0])}`.trim(),
        revealed: false,
      }
    }
  }

  // Non-slot widgets: use authored outcome explanations for the early attempts.
  const outcome = evaluateWidget(step, state)
  return { message: getExplanation(step, outcome), revealed: false }
}

/** Plain-language summary of what the learner entered and what's wrong — for the AI tutor. */
export function summarizeAttempt(
  step: LessonStep,
  state: WidgetState,
): { answer: string; wrong: string } {
  const check = checkStep(step, state)

  if (isSlotStep(step) && check.slotResults) {
    const slots = (state as SlotWidgetState).slots
    const answer = Object.keys(check.slotResults)
      .map((k) => `${slotLabel(step, k)} = ${slots[k] ?? 'blank'}`)
      .join(', ')
    const wrongIds = Object.keys(check.slotResults).filter((k) => !check.slotResults![k])
    const wrong = wrongIds.length
      ? `The ${joinLabels(wrongIds.map((k) => slotLabel(step, k)))} is wrong.`
      : 'Some boxes are still empty.'
    return { answer: answer || 'nothing yet', wrong }
  }

  switch (step.type) {
    case 'linear-graph': {
      const typed = (state as LinearGraphState).typedValue
      return {
        answer: typed ? `they entered ${typed}` : 'nothing yet',
        wrong: check.status === 'correct' ? 'nothing' : 'That intercept value is not correct.',
      }
    }
    case 'plot-line': {
      const pts = (state as PlotLineState).points
      return {
        answer: pts.length ? pts.map((p) => `(${p.x}, ${p.y})`).join(' and ') : 'no points placed',
        wrong:
          check.status === 'correct'
            ? 'nothing'
            : 'At least one point is not on the line for the equation.',
      }
    }
    case 'graph-select': {
      const sel = (state as GraphSelectState).selectedOptionId
      return {
        answer: sel ? `they chose graph ${sel.toUpperCase()}` : 'no graph selected',
        wrong:
          check.status === 'correct' ? 'nothing' : "That graph's roots/opening don't match.",
      }
    }
    default:
      return { answer: 'their current attempt', wrong: 'It is not correct yet.' }
  }
}
