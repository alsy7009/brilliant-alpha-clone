import type {
  ExplanationSlideConfig,
  ExpressionBuildConfig,
  ExpressionEvaluateConfig,
  FoilMultiplyConfig,
  GraphSelectConfig,
  LessonStep,
  LinearGraphConfig,
  QuadExploreConfig,
  ScaleBalanceConfig,
  VisualIntroConfig,
  WidgetState,
} from '../../types/lesson'
import { createInitialScaleState, createInitialIntroState } from '../validation/scaleBalance'
import { createInitialSlotState } from '../validation/slots'

export function initWidgetState(step: LessonStep): WidgetState {
  switch (step.type) {
    case 'visual-intro':
      return createInitialIntroState(step.widgetConfig as VisualIntroConfig)
    case 'scale-balance':
      return createInitialScaleState(step.widgetConfig as ScaleBalanceConfig)
    case 'expression-build':
      return createInitialSlotState((step.widgetConfig as ExpressionBuildConfig).slots)
    case 'expression-evaluate':
      return createInitialSlotState(
        (step.widgetConfig as ExpressionEvaluateConfig).slotIds.map((id) => ({ slotId: id })),
      )
    case 'foil-multiply': {
      const cfg = step.widgetConfig as FoilMultiplyConfig
      return createInitialSlotState(cfg.slotIds.map((id) => ({ slotId: id })))
    }
    case 'linear-graph':
      return { typedValue: null }
    case 'plot-line':
      return { points: [] }
    case 'quad-explore': {
      const cfg = step.widgetConfig as QuadExploreConfig
      return { ...cfg.initial }
    }
    case 'graph-select':
      return { selectedOptionId: null }
    case 'explanation-slide':
      return { slideIndex: 0 }
    default:
      return { slots: {} }
  }
}

export function isExplanationComplete(
  step: LessonStep,
  state: WidgetState,
): boolean {
  if (step.type !== 'explanation-slide') return false
  const cfg = step.widgetConfig as ExplanationSlideConfig
  const s = state as { slideIndex: number }
  return s.slideIndex >= cfg.slides.length - 1
}

export function isLinearGraphConfig(c: unknown): c is LinearGraphConfig {
  return typeof c === 'object' && c !== null && 'grid' in c && 'mode' in c
}

export function isGraphSelectConfig(c: unknown): c is GraphSelectConfig {
  return typeof c === 'object' && c !== null && 'options' in c
}
