import { Link } from 'react-router-dom'

import { MoziLogo } from '../brand/MoziArt'
import { PixelArt } from '../brand/PixelArt'
import { SPARKLE, SPARKLE_SMALL } from '../brand/scenery'

type LoadingVariant = 'full' | 'page' | 'compact'

interface MoziLoadingScreenProps {
  label?: string
  error?: string
  onRetry?: () => void
  variant?: LoadingVariant
}

const STARS = [
  { top: '20%', left: '15%', small: false, delay: '0ms' },
  { top: '40%', left: '5%', small: true, delay: '240ms' },
  { top: '22%', right: '14%', small: true, delay: '420ms' },
  { top: '48%', right: '3%', small: false, delay: '180ms' },
]

export function MoziLoadingScreen({ label, error, onRetry, variant = 'page' }: MoziLoadingScreenProps) {
  const loading = !error

  return (
    <main
      className={`mozi-loading mozi-loading--${variant}`}
      role={loading ? 'status' : 'alert'}
      aria-label={loading ? label ?? 'MOZI loading' : undefined}
      aria-live={loading ? 'polite' : 'assertive'}
    >
      <section className="mozi-loading__content">
        {loading ? (
          <>
            <div className="mozi-loading__stage" aria-label="MOZI">
              {STARS.map((star, index) => (
                <PixelArt
                  key={index}
                  className={`mozi-loading__star${star.small ? ' mozi-loading__star--small' : ''}`}
                  grid={star.small ? SPARKLE_SMALL : SPARKLE}
                  style={{ top: star.top, left: star.left, right: star.right, animationDelay: star.delay }}
                />
              ))}
              <MoziLogo className="mozi-loading__stage-logo" />
            </div>
            <h1 className="mozi-loading__title">{'\uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824 \uC8FC\uC138\uC694!'}</h1>
            <p className="mozi-loading__message">{'MOZI\uAC00 \uC5F4\uC2EC\uD788 \uC900\uBE44\uD558\uACE0 \uC788\uC5B4\uC694...'}</p>
            <div className="mozi-loading__dots" aria-hidden="true">
              {[0, 1, 2].map((dot) => <i key={dot} style={{ animationDelay: `${dot * 180}ms` }} />)}
            </div>
          </>
        ) : (
          <div className="mozi-loading__error">
            <p>{error}</p>
            {onRetry && <button className="button button--primary" onClick={onRetry} type="button">{'\uB2E4\uC2DC \uC2DC\uB3C4'}</button>}
            {!onRetry && <Link className="button button--secondary" to="/">{'\uCC98\uC74C \uD654\uBA74\uC73C\uB85C'}</Link>}
          </div>
        )}
      </section>
    </main>
  )
}
