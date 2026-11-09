import { type ReactNode, useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { MoziLogo, MoziSky } from '../brand/MoziArt'
import { PixelArt } from '../brand/PixelArt'
import { CHAT_BUBBLE, COIN, DIARY, LOCK, SPARKLE } from '../brand/scenery.ts'
import { originalCharacterAsset } from '../characters/originalCharacters'
import { saveTutorialStep } from './authApi'
import { useAuth } from './authContextValue'

function Monsters({ names }: { names: string[] }) {
  return (
    <div className="tutorial__row">
      {names.map((name) => <img alt="" className="tutorial__monster" draggable="false" key={name} src={originalCharacterAsset(name)} />)}
    </div>
  )
}

const WEEK = ['월', '화', '수', '목', '금', '토', '일']

interface Step { title: string; body: string; note?: string; art: ReactNode }

// Copy follows what the app really does: the coins are the diary rewards in backend constants/shop.py,
// and sharing goes through a link or the phone's share sheet.
const STEPS: Step[] = [
  {
    title: 'MOZI에 오신 걸 환영해요!',
    body: 'MOZI는 당신의 하루를 특별한 감정 친구로 만들어 주는 공간이에요.',
    art: <><MoziSky clouds={false} /><MoziLogo /><Monsters names={['seollemi', 'pyeongoni', 'ulmeogi']} /></>,
  },
  {
    title: '하루에 한 번, 감정 친구 탄생!',
    body: '하루에 한 번 일기를 작성하면 AI가 마음을 읽고 나만의 픽셀 캐릭터를 만들어 줘요.',
    note: '하루에 작성할 수 있는 일기는 1개예요.',
    art: (
      <div className="tutorial__row">
        <PixelArt className="tutorial__prop" grid={DIARY} />
        <PixelArt className="tutorial__prop tutorial__prop--small" grid={SPARKLE} />
        <img alt="" className="tutorial__monster" draggable="false" src={originalCharacterAsset('dugeuni')} />
      </div>
    ),
  },
  {
    title: '매일 일기로 출석하고 코인을 모아요!',
    body: '일기를 쓰는 날이 곧 출석하는 날이에요. 일기를 완성하면 100코인, 새로운 감정 친구를 만나면 50코인을 더 받아요.',
    note: '모은 코인으로 감정 방의 가구를 살 수 있어요.',
    art: (
      <>
        <PixelArt className="tutorial__prop tutorial__prop--small tutorial__prop--bob" grid={COIN} />
        <div aria-hidden="true" className="tutorial__calendar">
          {WEEK.map((day, index) => <span className={index < 4 ? 'is-done' : ''} key={day}>{index < 4 ? '✓' : day}</span>)}
        </div>
      </>
    ),
  },
  {
    title: '오늘의 기록은 한 번만!',
    body: '일기를 저장하면 수정할 수 없어요. 저장하기 전에 내용을 꼭 확인해 주세요.',
    note: '저장 전까지는 임시 저장으로 이어 쓸 수 있어요.',
    art: (
      <div className="tutorial__row">
        <PixelArt className="tutorial__prop" grid={DIARY} />
        <PixelArt className="tutorial__prop tutorial__prop--small" grid={LOCK} />
      </div>
    ),
  },
  {
    title: '나의 감정 친구를 공유해요!',
    body: '오늘 태어난 캐릭터를 공유 링크로 친구들에게 자랑해 보세요! 휴대폰 공유창에서 카카오톡도 고를 수 있어요.',
    note: '일기 내용과 개인정보는 공유되지 않아요.',
    art: (
      <div className="tutorial__row">
        <div className="tutorial__share-card">
          <Monsters names={['ppudeuswang', 'seollemi']} />
          <strong>오늘의 감정 친구</strong>
        </div>
        <PixelArt className="tutorial__prop tutorial__prop--small" grid={CHAT_BUBBLE} />
      </div>
    ),
  },
]

export function OnboardingPage() {
  const { completeTutorial, user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isReplay = params.has('replay')
  const [index, setIndex] = useState(() => (isReplay ? 0 : Math.min(user?.tutorial_step ?? 0, STEPS.length - 1)))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const isDone = user?.tutorial_completed ?? false

  // Remember the step on the account so the next login resumes here. A missed save only
  // means resuming a step earlier, so it never blocks moving through the tutorial.
  useEffect(() => {
    if (!isReplay && !isDone) saveTutorialStep(index).catch(() => undefined)
  }, [index, isDone, isReplay])

  // Someone who already finished only gets here through the replay link from settings.
  if (isDone && !isReplay) return <Navigate replace to="/room" />

  const step = STEPS[index]
  const isLast = index === STEPS.length - 1

  async function finish() {
    if (isReplay) { navigate('/settings', { replace: true }); return }
    setIsSaving(true); setError('')
    try {
      await completeTutorial()
      navigate('/room', { replace: true })
    } catch {
      setError('튜토리얼 완료를 저장하지 못했어요. 다시 시도해 주세요.')
      setIsSaving(false)
    }
  }

  return (
    <main className="tutorial">
      <div className="tutorial__progress">
        <span aria-label={`${STEPS.length}단계 중 ${index + 1}단계`} className="tutorial__count">{index + 1}/{STEPS.length}</span>
        <div aria-hidden="true" className="tutorial__bar">
          {STEPS.map((item, dot) => <i className={dot <= index ? 'is-done' : ''} key={item.title} />)}
        </div>
      </div>
      <div aria-hidden="true" className="tutorial__stage">{step.art}</div>
      <section aria-live="polite" className="tutorial__text">
        <h1>{step.title}</h1>
        <p>{step.body}</p>
        {step.note && <p className="tutorial__note">{step.note}</p>}
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="tutorial__actions">
        {index > 0 && <button className="button button--secondary" disabled={isSaving} onClick={() => setIndex(index - 1)} type="button">이전</button>}
        {isLast
          ? <button className="button button--primary" disabled={isSaving} onClick={() => void finish()} type="button">{isReplay ? '설정으로 돌아가기' : isSaving ? '저장하는 중...' : 'MOZI 시작하기'}</button>
          : <button className="button button--primary" onClick={() => setIndex(index + 1)} type="button">다음</button>}
      </div>
    </main>
  )
}
