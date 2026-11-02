import { Link } from 'react-router-dom'

import { originalCharacterAsset } from '../characters/originalCharacters'
import { HealthBadge } from '../components/HealthBadge'

const monsters = [
  { asset: 'seollemi', className: 'landing-monster--spark', label: '설렘이' },
  { asset: 'pyeongoni', className: 'landing-monster--calm', label: '평온이' },
  { asset: 'nokchomong', className: 'landing-monster--tired', label: '녹초몽' },
]

export function LandingPage() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link className="brand" to="/" aria-label="MOZI 홈">
          MOZI
        </Link>
        <HealthBadge />
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-24">
        <div>
          <p className="eyebrow">오늘의 일기가 감정 몬스터로</p>
          <h1 className="mt-4 text-4xl leading-tight font-black tracking-tight text-stone-900 sm:text-6xl">
            내 마음에서 태어난
            <span className="block text-violet-700">오늘의 이상한 친구</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-stone-600 sm:text-lg">
            일기를 쓰면 AI가 복합 감정을 읽고, 세상에 하나뿐인 픽셀
            캐릭터를 만듭니다. 다시 찾아온 감정은 익숙한 친구로 돌아와요.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="button button--primary" to="/signup">
              회원가입
            </Link>
            <Link className="button button--secondary" to="/login">
              로그인
            </Link>
          </div>

          <p className="mt-5 text-sm text-stone-500">오늘의 일기는 하루에 한 번만 만들 수 있어요.</p>
          <Link className="mt-4 inline-block text-sm font-bold text-violet-700 underline" to="/prototype/characters">
            공통 기본 몸통 확인하기
          </Link>
        </div>

        <div className="room-preview" aria-label="감정 몬스터 방 미리보기">
          <div className="room-preview__window" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="room-preview__floor" />
          <div className="room-preview__monsters">
            {monsters.map((monster) => (
              <img
                alt={`${monster.label} 원본 캐릭터`}
                className={`landing-monster ${monster.className}`}
                draggable="false"
                key={monster.label}
                src={originalCharacterAsset(monster.asset)}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
