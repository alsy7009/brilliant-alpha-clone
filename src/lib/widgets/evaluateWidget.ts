import type {
  ExplanationSlideConfig,
  GraphSelectState,
  LessonStep,
  LinearGraphConfig,
  LinearGraphState,
  PlotLineConfig,
  PlotLineState,
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
    case 'plot-line':
      return evaluatePlotLine(state as PlotLineState, step)
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

  const raw = state.typedValue?.trim() ?? ''
  if (raw === '' || raw === '-') return 'incomplete'

  const value = Number(raw)
  if (!Number.isInteger(value)) return 'wrong_intercept'

  if (config.mode === 'find-y-intercept' && rules.expectedYIntercept !== undefined) {
    return value === rules.expectedYIntercept ? 'correct' : 'wrong_intercept'
  }

  if (config.mode === 'find-x-intercept' && rules.expectedXIntercept !== undefined) {
    return value === rules.expectedXIntercept ? 'correct' : 'wrong_intercept'
  }

  return 'generic_wrong'
}

function evaluatePlotLine(state: PlotLineState, step: LessonStep): ValidationOutcome {
  const config = step.widgetConfig as PlotLineConfig
  if (state.points.length < 2) return 'incomplete'

  const [a, b] = state.points
  if (a.x === b.x && a.y === b.y) return 'generic_wrong'

  const { slope, intercept } = config.equation
  const onLine = (p: { x: number; y: number }) => p.y === slope * p.x + intercept
  return onLine(a) && onLine(b) ? 'correct' : 'generic_wrong'
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
