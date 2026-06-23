export type StepType =
  | 'visual-intro'
  | 'scale-balance'
  | 'expression-build'
  | 'expression-evaluate'
  | 'linear-graph'
  | 'graph-select'
  | 'explanation-slide'
  | 'foil-multiply'

export interface ScaleValidationRules {
  expectedLeft: string
  expectedRight: string
}

export interface ExpressionBuildValidationRules {
  expectedSlots: Record<string, string>
  expectedExpression?: string
}

export interface ExpressionEvaluateValidationRules {
  expectedSlots: Record<string, string>
}

export interface LinearGraphValidationRules {
  expectedYIntercept?: number
  expectedXIntercept?: number
  tolerance?: number
}

export interface GraphSelectValidationRules {
  correctOptionId: string
}

export interface FoilMultiplyValidationRules {
  expectedSlots: Record<string, string>
}

export type ValidationRules =
  | ScaleValidationRules
  | ExpressionBuildValidationRules
  | ExpressionEvaluateValidationRules
  | LinearGraphValidationRules
  | GraphSelectValidationRules
  | FoilMultiplyValidationRules

export interface VisualIntroConfig {
  leftWeight: number
  rightWeight: number
  isInteractive: boolean
}

export interface ScaleBalanceConfig {
  equationLeft: string
  equationRight: string
  targetVariable: string
}

export interface ExpressionSlotConfig {
  slotId: string
  accept?: Array<'number' | 'variable'>
  label?: string
}

export interface ExpressionBuildConfig {
  visualModel: {
    variable: string
    variableColor: string
    variableCount: number
    constantCount: number
  }
  slots: ExpressionSlotConfig[]
  slotLayout: string[]
  tileBank: string[]
}

export interface ExpressionEvaluateConfig {
  expression: string
  substitute: { variable: string; value: number }
  visualModel: {
    variable: string
    variableColor?: string
    variableCount: number
    constantCount: number
  }
  slotIds: string[]
  slotLabels: string[]
  tileBank: string[]
}

export interface LinearGraphConfig {
  equation: { slope: number; intercept: number }
  grid: { xMin: number; xMax: number; yMin: number; yMax: number }
  mode: 'find-y-intercept' | 'find-x-intercept'
  tolerance?: number
  equationLabel?: string
  /** When false, hide the plot and ask for the intercept from the equation alone. */
  showGraph?: boolean
}

export interface GraphSelectOption {
  optionId: string
  roots: [number, number]
  opens: 'up' | 'down'
}

export interface GraphSelectConfig {
  equationLabel: string
  options: GraphSelectOption[]
}

export interface ExplanationSlideItem {
  title: string
  body: string
  highlight?: string[]
}

export interface ExplanationSlideConfig {
  slides: ExplanationSlideItem[]
}

export interface FoilMultiplyConfig {
  /** The factored form shown as the prompt, e.g. "(x + 2)(x + 3)". */
  factors: string
  /** Tokens for the polynomial line. Tokens wrapped like "{a}" are drop slots; others are literal text. */
  layout: string[]
  slotIds: string[]
  tileBank: string[]
}

export type WidgetConfig =
  | VisualIntroConfig
  | ScaleBalanceConfig
  | ExpressionBuildConfig
  | ExpressionEvaluateConfig
  | LinearGraphConfig
  | GraphSelectConfig
  | ExplanationSlideConfig
  | FoilMultiplyConfig

export interface LessonStep {
  stepId: string
  type: StepType
  instruction: string
  widgetConfig: WidgetConfig
  validationRules?: ValidationRules
  explanations?: Record<string, string>
}

export interface Lesson {
  lessonId: string
  title: string
  subject: 'algebra'
  order: number
  steps: LessonStep[]
}

export interface ScaleBalanceState {
  leftExpression: string
  rightExpression: string
}

export interface VisualIntroState {
  leftWeight: number
  rightWeight: number
}

export interface SlotWidgetState {
  slots: Record<string, string | null>
}

export interface LinearGraphState {
  typedValue: string | null
}

export interface GraphSelectState {
  selectedOptionId: string | null
}

export interface ExplanationSlideState {
  slideIndex: number
}

export type WidgetState =
  | ScaleBalanceState
  | VisualIntroState
  | SlotWidgetState
  | LinearGraphState
  | GraphSelectState
  | ExplanationSlideState

export type ValidationOutcome =
  | 'correct'
  | 'wrong_moved_incorrectly'
  | 'wrong_count'
  | 'wrong_variable'
  | 'wrong_substitution'
  | 'wrong_arithmetic'
  | 'wrong_intercept'
  | 'generic_wrong'
  | 'incomplete'

export function isScaleValidationRules(
  rules: ValidationRules,
): rules is ScaleValidationRules {
  return 'expectedLeft' in rules
}

export function isSlotValidationRules(
  rules: ValidationRules,
): rules is ExpressionBuildValidationRules | ExpressionEvaluateValidationRules | FoilMultiplyValidationRules {
  return 'expectedSlots' in rules
}

export function isLinearGraphValidationRules(
  rules: ValidationRules,
): rules is LinearGraphValidationRules {
  return 'expectedYIntercept' in rules || 'expectedXIntercept' in rules
}

export function isGraphSelectValidationRules(
  rules: ValidationRules,
): rules is GraphSelectValidationRules {
  return 'correctOptionId' in rules
}

// Legacy alias
export type ExpressionBuildState = SlotWidgetState
