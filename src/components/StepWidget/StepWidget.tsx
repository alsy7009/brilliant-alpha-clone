import type { LessonStep, WidgetState } from '../../types/lesson'
import { ExpressionBuild } from '../ExpressionBuild/ExpressionBuild'
import { ExpressionEvaluate } from '../ExpressionEvaluate/ExpressionEvaluate'
import { ExplanationSlide } from '../ExplanationSlide/ExplanationSlide'
import { EquationScale } from '../EquationScale/EquationScale'
import { VisualIntro } from '../EquationScale/VisualIntro'
import { FoilMultiply } from '../FoilMultiply/FoilMultiply'
import { GraphSelect } from '../GraphSelect/GraphSelect'
import { LinearGraph } from '../LinearGraph/LinearGraph'

interface StepWidgetProps {
  step: LessonStep
  state: WidgetState
  onStateChange: (state: WidgetState) => void
}

export function StepWidget({ step, state, onStateChange }: StepWidgetProps) {
  switch (step.type) {
    case 'visual-intro':
      return (
        <VisualIntro
          config={step.widgetConfig as Parameters<typeof VisualIntro>[0]['config']}
          state={state as Parameters<typeof VisualIntro>[0]['state']}
          onStateChange={onStateChange as Parameters<typeof VisualIntro>[0]['onStateChange']}
        />
      )
    case 'scale-balance':
      return (
        <EquationScale
          config={step.widgetConfig as Parameters<typeof EquationScale>[0]['config']}
          state={state as Parameters<typeof EquationScale>[0]['state']}
          onStateChange={onStateChange as Parameters<typeof EquationScale>[0]['onStateChange']}
        />
      )
    case 'expression-build':
      return (
        <ExpressionBuild
          config={step.widgetConfig as Parameters<typeof ExpressionBuild>[0]['config']}
          state={state as Parameters<typeof ExpressionBuild>[0]['state']}
          onStateChange={onStateChange as Parameters<typeof ExpressionBuild>[0]['onStateChange']}
        />
      )
    case 'expression-evaluate':
      return (
        <ExpressionEvaluate
          config={step.widgetConfig as Parameters<typeof ExpressionEvaluate>[0]['config']}
          state={state as Parameters<typeof ExpressionEvaluate>[0]['state']}
          onStateChange={onStateChange as Parameters<typeof ExpressionEvaluate>[0]['onStateChange']}
        />
      )
    case 'linear-graph':
      return (
        <LinearGraph
          config={step.widgetConfig as Parameters<typeof LinearGraph>[0]['config']}
          state={state as Parameters<typeof LinearGraph>[0]['state']}
          onStateChange={onStateChange as Parameters<typeof LinearGraph>[0]['onStateChange']}
        />
      )
    case 'graph-select':
      return (
        <GraphSelect
          config={step.widgetConfig as Parameters<typeof GraphSelect>[0]['config']}
          state={state as Parameters<typeof GraphSelect>[0]['state']}
          onStateChange={onStateChange as Parameters<typeof GraphSelect>[0]['onStateChange']}
        />
      )
    case 'explanation-slide':
      return (
        <ExplanationSlide
          config={step.widgetConfig as Parameters<typeof ExplanationSlide>[0]['config']}
          state={state as Parameters<typeof ExplanationSlide>[0]['state']}
          onStateChange={onStateChange as Parameters<typeof ExplanationSlide>[0]['onStateChange']}
        />
      )
    case 'foil-multiply':
      return (
        <FoilMultiply
          config={step.widgetConfig as Parameters<typeof FoilMultiply>[0]['config']}
          state={state as Parameters<typeof FoilMultiply>[0]['state']}
          onStateChange={onStateChange as Parameters<typeof FoilMultiply>[0]['onStateChange']}
        />
      )
    default:
      return <p>Unknown step type.</p>
  }
}
