import { emotionTile, ICON_FACES } from './appIcon.ts'
import { PixelArt } from './PixelArt'
import { buildPixelLogo } from './pixelLogo.ts'
import { CLOUD, SPARKLE, SPARKLE_SMALL } from './scenery.ts'

// Built once: the grids never change at runtime.
const LOGO = buildPixelLogo()
const FRIENDS = ICON_FACES.map((face) => ({ emotion: face.emotion, grid: emotionTile(face) }))

export function MoziLogo({ className = '' }: { className?: string }) {
  return <PixelArt className={`mozi-logo ${className}`} grid={LOGO} label="MOZI." />
}

/** The four emotion friends from the app icon, gently bobbing one after another. */
export function MoziFriends({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="mozi-friends">
      {FRIENDS.slice(0, count).map((friend) => <PixelArt className="mozi-friend" grid={friend.grid} key={friend.emotion} />)}
    </div>
  )
}

/** Indeterminate pixel progress bar: a light runs along the segments; there is no fake percentage. */
export function PixelProgress() {
  return (
    <div aria-hidden="true" className="pixel-progress">
      {Array.from({ length: 10 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 110}ms` }} />)}
    </div>
  )
}

const STARS = [
  { top: '12%', left: '14%', size: 'big', delay: 0 },
  { top: '20%', left: '82%', size: 'small', delay: 700 },
  { top: '34%', left: '8%', size: 'small', delay: 1300 },
  { top: '9%', left: '58%', size: 'small', delay: 400 },
  { top: '64%', left: '88%', size: 'big', delay: 1000 },
  { top: '72%', left: '10%', size: 'small', delay: 1700 },
]

/** Twinkling sparkles and drifting clouds behind the splash and loading screens. */
export function MoziSky({ clouds = true }: { clouds?: boolean }) {
  return (
    <div aria-hidden="true" className="mozi-sky">
      {clouds && <PixelArt className="mozi-cloud mozi-cloud--one" grid={CLOUD} />}
      {clouds && <PixelArt className="mozi-cloud mozi-cloud--two" grid={CLOUD} />}
      {STARS.map((star) => (
        <span className={`mozi-star mozi-star--${star.size}`} key={`${star.top}-${star.left}`} style={{ top: star.top, left: star.left, animationDelay: `${star.delay}ms` }}>
          <PixelArt grid={star.size === 'big' ? SPARKLE : SPARKLE_SMALL} />
        </span>
      ))}
    </div>
  )
}
