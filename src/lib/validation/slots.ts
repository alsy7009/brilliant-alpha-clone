import type {
  ExpressionSlotConfig,
  LessonStep,
  SlotWidgetState,
  ValidationOutcome,
} from '../../types/lesson'
import { isSlotValidationRules } from '../../types/lesson'

export function createInitialSlotState(
  slots: Array<{ slotId: string } | ExpressionSlotConfig>,
): SlotWidgetState {
  const state: Record<string, string | null> = {}
  for (const slot of slots) {
    state[slot.slotId] = null
  }
  return { slots: state }
}

export function evaluateSlots(
  state: SlotWidgetState,
  step: LessonStep,
  options?: { variableSlotId?: string; numericSlotIds?: string[] },
): ValidationOutcome {
  const rules = step.validationRules
  if (!rules || !isSlotValidationRules(rules)) return 'generic_wrong'

  const expectedSlots = rules.expectedSlots
  const keys = Object.keys(expectedSlots)

  if (keys.some((k) => !state.slots[k])) {
    return 'incomplete'
  }

  let allMatch = true
  let countWrong = false
  let variableWrong = false

  for (const key of keys) {
    const actual = state.slots[key]
    const expectedVal = expectedSlots[key]
    if (actual !== expectedVal) {
      allMatch = false
      if (key === 'sub') {
        return 'wrong_substitution'
      }
      if (key === 'result') {
        return 'wrong_arithmetic'
      }
      if (key === 'var' || key === options?.variableSlotId) {
        variableWrong = true
      } else if (options?.numericSlotIds?.includes(key) || key === 'coef' || key === 'const') {
        countWrong = true
      }
    }
  }

  if (allMatch) return 'correct'
  if (variableWrong && !countWrong) return 'wrong_variable'
  if (countWrong) return 'wrong_count'
  return 'generic_wrong'
}
