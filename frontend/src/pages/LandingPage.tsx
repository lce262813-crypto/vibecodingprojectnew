import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../auth/authContextValue'
import { AppLoadingScreen } from '../brand/AppLoadingScreen'
import { MoziLogo, MoziSky } from '../brand/MoziArt'
import { PixelArt } from '../brand/PixelArt'
import { HealthBadge } from '../components/HealthBadge'
import { HILLS } from '../brand/scenery.ts'

/** First screen (splash / welcome). Signed-in people skip it and go straight to their room. */
export function LandingPage() {
  const { status } = useAuth()

  if (status === 'authenticated') return <Navigate replace to="/room" />
  if (status === 'loading') return <AppLoadingScreen />

  return (
    <main className="splash">
      <MoziSky />
      <PixelArt className="splash__hills" grid={HILLS} />
      <div className="splash__status"><HealthBadge /></div>
      <section className="splash__hero">
        <MoziLogo className="splash__logo" />
        <p className="splash__tagline">내 마음에서 태어난,<br />오늘의 이상한 친구</p>
      </section>
      <div className="splash__actions">
        <Link className="button button--primary" to="/signup">MOZI 시작하기</Link>
        <Link className="button button--secondary" to="/login">로그인</Link>
      </div>
    </main>
  )
}
