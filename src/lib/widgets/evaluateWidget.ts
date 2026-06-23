import type {
  ExplanationSlideConfig,
  GraphSelectState,
  LessonStep,
  LinearGraphConfig,
  LinearGraphState,
  SlotWidgetState,
  ValidationOutcome,
  WidgetState,
} from '../../types/lesson'
import {
  isGraphSelectValidationRules,
  isLinearGraphValidationRules,
} from '../../types/lesson'
import { evaluateExpressionBuild } from '../validation/expressionBuild'
import { evaluateSlots } from '../validation/slots'
import {
  evaluateScaleBalance,
  evaluateVisualIntro,
  getExplanation,
} from '../validation/scaleBalance'
import { isExplanationComplete } from './widgetState'

export function evaluateWidget(step: LessonStep, state: WidgetState): ValidationOutcome {
  switch (step.type) {
    case 'visual-intro':
      return evaluateVisualIntro(state as { leftWeight: number; rightWeight: number })
    case 'scale-balance':
      return evaluateScaleBalance(
        state as { leftExpression: string; rightExpression: string },
        step,
      )
    case 'expression-build':
      return evaluateExpressionBuild(state as SlotWidgetState, step)
    case 'expression-evaluate':
      return evaluateSlots(state as SlotWidgetState, step)
    case 'foil-multiply':
      return evaluateSlots(state as SlotWidgetState, step)
    case 'linear-graph':
      return evaluateLinearGraph(state as LinearGraphState, step)
    case 'graph-select':
      return evaluateGraphSelect(state as GraphSelectState, step)
    case 'explanation-slide':
      return isExplanationComplete(step, state) ? 'correct' : 'incomplete'
    default:
      return 'generic_wrong'
  }
}

function evaluateLinearGraph(state: LinearGraphState, step: LessonStep): ValidationOutcome {
  const rules = step.validationRules
  const config = step.widgetConfig as LinearGraphConfig
  if (!rules || !isLinearGraphValidationRules(rules)) return 'generic_wrong'
  if (!state.placedPoint) return 'incomplete'

  const tol = rules.tolerance ?? config.tolerance ?? 0.75
  const { x, y } = state.placedPoint

  if (config.mode === 'find-y-intercept' && rules.expectedYIntercept !== undefined) {
    const dist = Math.hypot(x - 0, y - rules.expectedYIntercept)
    return dist <= tol ? 'correct' : 'wrong_intercept'
  }

  if (config.mode === 'find-x-intercept' && rules.expectedXIntercept !== undefined) {
    const dist = Math.hypot(x - rules.expectedXIntercept, y - 0)
    return dist <= tol ? 'correct' : 'wrong_intercept'
  }

  return 'generic_wrong'
}

function evaluateGraphSelect(state: GraphSelectState, step: LessonStep): ValidationOutcome {
  const rules = step.validationRules
  if (!rules || !isGraphSelectValidationRules(rules)) return 'generic_wrong'
  if (!state.selectedOptionId) return 'incomplete'
  return state.selectedOptionId === rules.correctOptionId ? 'correct' : 'generic_wrong'
}

export function getStepExplanation(step: LessonStep, outcome: ValidationOutcome): string {
  if (step.type === 'explanation-slide' && outcome === 'incomplete') {
    const cfg = step.widgetConfig as ExplanationSlideConfig
    return `Tap Continue to read all ${cfg.slides.length} slides, then press Check.`
  }
  return getExplanation(step, outcome)
}

export { getExplanation }
