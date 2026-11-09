import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { CharacterSprite } from '../characters/CharacterSprite'
import { ShareControls } from '../sharing/ShareControls'
import {
  continueWithDemoAnalysis,
  getTodayDiary,
  retryTodayAnalysis,
  type TodayDiary,
} from './diaryApi'
import { EmotionAnalysisPanel } from './EmotionAnalysisPanel'
import { PageLoader } from '../components/PageLoader'

export function GenerationPage() {
  const [today, setToday] = useState<TodayDiary | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    let active = true
    getTodayDiary()
      .then((result) => {
        if (!active) return
        setToday(result)
        setIsLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('오늘의 기록을 불러오지 못했습니다.')
        setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (today?.status !== 'analyzing') return
    const timer = window.setTimeout(() => { getTodayDiary().then(setToday).catch(() => setError('상태를 확인하지 못했어요. 새로고침해 주세요.')) }, 2500)
    return () => window.clearTimeout(timer)
  }, [today])

  if (isLoading || isRetrying || today?.status === 'analyzing') {
    return <PageLoader label="오늘의 마음을 읽어오는 중..." />
  }

  if (today?.status === 'not_started') {
    return <Navigate to="/diary" replace />
  }


  async function runRecovery(mode: 'retry' | 'demo') {
    setIsRetrying(true)
    setError('')
    try {
      const result = mode === 'retry'
        ? await retryTodayAnalysis()
        : await continueWithDemoAnalysis()
      setToday(result)
      if (result.status === 'ai_failed') {
        setError('AI 분석에 다시 실패했습니다. 데모 분석으로 계속할 수 있어요.')
      }
    } catch {
      setError('감정 분석을 진행하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsRetrying(false)
    }
  }



  if (today?.status === 'ai_failed') {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-10">
        <section className="panel max-w-xl text-center">
          <div className="analysis-orb analysis-orb--failed" aria-hidden="true">!</div>
          <p className="eyebrow mt-7">일기는 저장되었어요</p>
          <h1 className="mt-3 text-3xl font-black text-stone-900">AI 감정 분석을 완료하지 못했어요</h1>
          <p className="mt-4 leading-7 text-stone-600">
            일기 내용은 그대로 보관되어 있습니다. 실제 AI 분석을 다시 시도하거나,
            같은 형식의 데모 분석으로 계속할 수 있어요.
          </p>
          {error && <p className="form-error mt-5" role="alert">{error}</p>}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              className="button button--primary"
              disabled={isRetrying}
              onClick={() => void runRecovery('retry')}
              type="button"
            >
              {isRetrying ? '분석 중…' : '다시 시도'}
            </button>
            <button
              className="button button--secondary"
              disabled={isRetrying}
              onClick={() => void runRecovery('demo')}
              type="button"
            >
              데모 분석으로 계속하기
            </button>
          </div>
        </section>
      </main>
    )
  }

  const analysis = today?.analysis
  const character = today?.character

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="panel max-w-xl text-center">
        {character ? (
          <CharacterSprite
            accessoryPart={character.accessory_part}
            character={character}
            effectParts={character.effect_parts}
          />
        ) : (
          <div className="analysis-orb" aria-hidden="true">✦</div>
        )}
        <p className="eyebrow mt-7">
          {character?.is_new_character ? '새로운 감정 몬스터 탄생' : '다시 만난 감정 몬스터'}
        </p>
        <h1 className="mt-3 text-3xl font-black text-stone-900">
          {character ? `${character.name} 등장!` : today?.status === 'uncertain' ? '오늘의 감정을 읽기 어려웠어요' : 'AI가 오늘의 일기를 이렇게 해석했어요'}
        </h1>
        {character && (
          <>
            <p className="mt-3 leading-7 text-stone-600">{character.feature_description}</p>
            <p className="collection-notice mt-4">도감에 자동으로 저장되었어요</p>
          </>
        )}
        {analysis?.analysis_mode === 'demo' && <span className="demo-badge mt-4">데모 분석 결과</span>}
        {analysis && (
          <EmotionAnalysisPanel analysis={analysis} />
        )}
        {!character && (
          <p className="mt-6 text-sm leading-6 text-stone-500">
            {today?.status === 'uncertain' ? '감정을 짐작해서 만들지 않았어요. 다음 기록에 당시 마음을 조금 더 적어주면 다시 살펴볼게요.' : '이전 분석 기록에는 캐릭터가 없을 수 있어요.'}
          </p>
        )}
        {error && <p className="form-error mt-5" role="alert">{error}</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {character && <Link className="button button--primary" to={`/characters/${character.character_id}`}>도감에서 보기</Link>}
          <Link className="button button--secondary" to="/room">감정 방으로 돌아가기</Link>
        </div>
        {character && (
          <div className="mt-6 text-left">
            <ShareControls characterId={character.character_id} characterName={character.name} />
          </div>
        )}
      </section>
    </main>
  )
}
