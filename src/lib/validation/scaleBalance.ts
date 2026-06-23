import type {
  LessonStep,
  ScaleBalanceConfig,
  ScaleBalanceState,
  ValidationOutcome,
  VisualIntroConfig,
  VisualIntroState,
} from '../../types/lesson'
import { isScaleValidationRules } from '../../types/lesson'

function normalize(expression: string): string {
  return expression.replace(/\s+/g, '').toUpperCase()
}

function parseConstant(equation: string): number | null {
  const match = equation.match(/\+\s*(\d+)/)
  return match ? Number(match[1]) : null
}

export function evaluateScaleBalance(
  state: ScaleBalanceState,
  step: LessonStep,
): ValidationOutcome {
  const rules = step.validationRules
  const config = step.widgetConfig as ScaleBalanceConfig
  if (!rules || !isScaleValidationRules(rules)) return 'generic_wrong'

  const left = normalize(state.leftExpression)
  const right = normalize(state.rightExpression)
  const expectedLeft = normalize(rules.expectedLeft)
  const expectedRight = normalize(rules.expectedRight)
  const initialLeft = normalize(config.equationLeft)
  const initialRight = normalize(config.equationRight)

  if (left === expectedLeft && right === expectedRight) {
    return 'correct'
  }

  if (left === initialLeft && right === initialRight) {
    return 'incomplete'
  }

  const initialConstant = parseConstant(config.equationLeft)
  const rightValue = parseConstant(state.rightExpression.replace(/^X/, '')) ??
    Number(state.rightExpression.replace(/[^\d]/g, ''))

  if (
    initialConstant !== null &&
    left === 'X' &&
    rightValue === Number(initialRight.replace(/[^\d]/g, '')) + initialConstant
  ) {
    return 'wrong_moved_incorrectly'
  }

  return 'generic_wrong'
}

export function evaluateVisualIntro(
  state: VisualIntroState,
): ValidationOutcome {
  return state.leftWeight === state.rightWeight ? 'correct' : 'generic_wrong'
}

export function getExplanation(
  step: LessonStep,
  outcome: ValidationOutcome,
): string {
  const explanations = step.explanations ?? {}
  return (
    explanations[outcome] ??
    explanations.generic_wrong ??
    'Keep trying — adjust until it feels right.'
  )
}

export function createInitialScaleState(config: ScaleBalanceConfig): ScaleBalanceState {
  return {
    leftExpression: config.equationLeft,
    rightExpression: config.equationRight,
  }
}

export function createInitialIntroState(config: VisualIntroConfig): VisualIntroState {
  return {
    leftWeight: config.leftWeight,
    rightWeight: config.rightWeight,
  }
}

export function subtractConstantFromBothSides(
  state: ScaleBalanceState,
  config: ScaleBalanceConfig,
): ScaleBalanceState {
  const constant = parseConstant(config.equationLeft)
  if (constant === null) return state

  const rightNum = Number(config.equationRight.replace(/[^\d]/g, ''))
  return {
    leftExpression: config.targetVariable,
    rightExpression: String(rightNum - constant),
  }
}
