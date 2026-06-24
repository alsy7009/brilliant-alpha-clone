import type { ExplanationSlideConfig, ExplanationSlideState } from '../../types/lesson'
import './ExplanationSlide.css'

interface ExplanationSlideProps {
  config: ExplanationSlideConfig
  state: ExplanationSlideState
  onStateChange: (state: ExplanationSlideState) => void
  disabled?: boolean
}

export function ExplanationSlide({
  config,
  state,
  onStateChange,
  disabled = false,
}: ExplanationSlideProps) {
  const slide = config.slides[state.slideIndex]
  const isLast = state.slideIndex >= config.slides.length - 1

  const advance = () => {
    if (disabled || isLast) return
    onStateChange({ slideIndex: state.slideIndex + 1 })
  }

  return (
    <div className="explanation-slide">
      <div className="slide-card">
        <p className="slide-progress">
          {state.slideIndex + 1} / {config.slides.length}
        </p>
        <h2 className="slide-title">{slide.title}</h2>
        <p className="slide-body">{slide.body}</p>
        {slide.highlight && (
          <div className="slide-highlights">
            {slide.highlight.map((word) => (
              <span key={word} className="highlight-chip">
                {word}
              </span>
            ))}
          </div>
        )}
        {slide.title.toLowerCase().includes('foil') && state.slideIndex === 0 && (
          <div className="foil-diagram" aria-hidden="true">
            <div className="foil-grid">
              <span className="foil-f">First</span>
              <span className="foil-o">Outer</span>
              <span className="foil-i">Inner</span>
              <span className="foil-l">Last</span>
            </div>
            <p className="foil-formula">(x + a)(x + b)</p>
          </div>
        )}
      </div>
      {!isLast && (
        <button type="button" className="slide-continue" onClick={advance} disabled={disabled}>
          Continue →
        </button>
      )}
      {isLast && (
        <p className="slide-done-hint">Press <strong>FIRE!</strong> when you are ready to practice.</p>
      )}
    </div>
  )
}
