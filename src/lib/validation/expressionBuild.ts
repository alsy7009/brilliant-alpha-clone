import type { ExpressionBuildConfig, LessonStep, SlotWidgetState } from '../../types/lesson'
import { createInitialSlotState, evaluateSlots } from './slots'

export function createInitialExpressionBuildState(config: ExpressionBuildConfig) {
  return createInitialSlotState(config.slots)
}

export function evaluateExpressionBuild(state: SlotWidgetState, step: LessonStep) {
  return evaluateSlots(state, step, { numericSlotIds: ['coef', 'const'], variableSlotId: 'var' })
}
