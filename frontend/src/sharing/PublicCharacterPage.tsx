import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CharacterSprite } from '../characters/CharacterSprite'
import { ApiError } from '../api/client'
import { EMOTION_CHART_COLORS } from '../characters/emotionCatalog'
import { MoziLoadingScreen } from '../components/MoziLoadingScreen'
import { getSharedCharacter, type PublicSharedCharacter } from './sharingApi'

const RELATIONSHIP_LABELS: Record<string, string> = {
  SINGLE: '오늘의 감정',
  MIXED: '함께 느낀 감정',
  TRANSITION: '감정의 흐름',
  CONTRAST: '상황과 다른 마음',
  UNCERTAIN: '감정을 알아가는 중',
}

export function PublicCharacterPage() {
  const { token = '' } = useParams()
  const [shared, setShared] = useState<PublicSharedCharacter | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getSharedCharacter(token)
      .then((result) => { if (active) setShared(result) })
      .catch((caught) => { if (active) setError(caught instanceof ApiError && caught.status === 404 ? '공유가 만료되었거나 찾을 수 없는 링크예요.' : caught instanceof ApiError ? caught.message : '공유 정보를 불러오지 못했어요. 링크나 연결 상태를 확인해 주세요.') })
    return () => { active = false }
  }, [token, attempt])

  if (!shared || error) {
    return (
      <MoziLoadingScreen
        variant="page"
        label="Shared character loading"
        error={error || undefined}
        onRetry={() => { setError(''); setShared(null); setAttempt((value) => value + 1) }}
      />
    )
  }

  return (
    <main className="share-page grid min-h-screen place-items-center px-5 py-10">
      <section className="share-card share-card--showcase">
        <p className="share-card__brand">MOZI.</p>
        <p className="share-card__eyebrow">캐릭터 선물 도착</p>
        <h1 className="share-card__headline">친구가 보낸 캐릭터가 도착했어요!</h1>
        <p className="share-card__sender">{shared.owner_nickname}님이 나눈 감정 친구예요.</p>

        <div className="share-card__stage">
          <CharacterSprite
            accessoryPart={shared.accessory_part}
            character={shared}
            effectParts={shared.effect_parts}
            size="large"
          />
        </div>
        <h2 className="share-card__name">{shared.name}</h2>

        <section className="share-card__emotions" aria-label="캐릭터의 감정 결과">
          <div className="share-card__emotion-heading">
            <h3>이 친구를 만든 마음</h3>
            {shared.relationship_type && (
              <span>{RELATIONSHIP_LABELS[shared.relationship_type] ?? '감정 기록'}</span>
            )}
          </div>
          {shared.emotions?.length ? (
            <ul className="share-emotion-list">
              {shared.emotions.map((emotion) => (
                <li
                  className={`share-emotion${emotion.is_primary ? ' share-emotion--primary' : ''}`}
                  key={emotion.key}
                  style={{ '--emotion-color': EMOTION_CHART_COLORS[emotion.key] ?? '#8b78b8' } as CSSProperties}
                >
                  <span className="share-emotion__dot" aria-hidden="true" />
                  <strong>{emotion.label}</strong>
                  {emotion.is_primary && <span className="share-emotion__role">대표 감정</span>}
                  {emotion.intensity !== null && (
                    <span className="share-emotion__intensity">강도 {emotion.intensity}단계</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="share-card__no-emotion">저장된 감정 결과가 없는 캐릭터예요.</p>
          )}
        </section>

        <p className="share-card__privacy">일기 내용은 공유되지 않아요.</p>
        <Link className="button button--primary share-card__cta" to="/signup">나만의 감정 친구 만나기</Link>
      </section>
    </main>
  )
}
