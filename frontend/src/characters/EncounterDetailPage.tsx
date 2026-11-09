import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { CharacterSprite } from './CharacterSprite'
import { deleteEncounter, getEncounter, type EncounterDetail } from './charactersApi'
import { EmotionAnalysisPanel } from '../diary/EmotionAnalysisPanel'
import { PageLoader } from '../components/PageLoader'

export function EncounterDetailPage() {
  const { characterId = '', encounterId = '' } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<EncounterDetail | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    getEncounter(characterId, encounterId)
      .then((result) => { if (active) setDetail(result) })
      .catch(() => { if (active) setError('만남 기록을 불러오지 못했습니다.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [characterId, encounterId])

  async function handleDelete() {
    setIsDeleting(true); setError('')
    try {
      await deleteEncounter(characterId, encounterId)
      navigate('/characters', { replace: true })
    } catch {
      setError('기록을 삭제하지 못했습니다. 다시 시도해 주세요.')
      setIsDeleting(false)
    }
  }

  return (
    <main className="min-h-screen px-5 py-8">
      <section className="panel mx-auto max-w-2xl">
        <Link className="text-sm font-bold text-violet-700" to="/diary/records">← 감정 달력으로</Link>
        {isLoading && <PageLoader label="만남 기록을 불러오는 중…" />}
        {error && <p className="form-error mt-5" role="alert">{error}</p>}
        {detail && (
          <>
            <p className="eyebrow mt-7">{detail.met_on}의 만남</p>
            <section className="encounter-character mt-5" aria-label="그날 태어난 캐릭터">
              <CharacterSprite
                accessoryPart={detail.character.accessory_part}
                character={detail.character}
                effectParts={detail.character.effect_parts}
                size="large"
              />
              <h1>{detail.character.name}</h1>
              <p>{detail.character.feature_description}</p>
            </section>
            <EmotionAnalysisPanel analysis={detail.analysis} />
            <section className="encounter-diary mt-9">
              <p className="eyebrow">오늘의 일기</p>
              <h2>{detail.title || '제목 없는 일기'}</h2>
              <p className="diary-preview">{detail.diary_text}</p>
              <time dateTime={detail.met_on}>{detail.met_on}</time>
            </section>
            {!confirming ? (
              <button className="danger-link mt-9" onClick={() => setConfirming(true)} type="button">이 만남 기록 삭제</button>
            ) : (
              <section className="delete-confirm mt-7" role="alertdialog" aria-label="만남 기록 삭제 확인">
                <strong>삭제한 일기와 감정 분석은 복구할 수 없어요.</strong>
                <p>이 캐릭터의 마지막 만남이면 캐릭터도 도감에서 사라집니다. 오늘 기록이라도 다시 작성할 수 없습니다.</p>
                <div><button className="button button--secondary" onClick={() => setConfirming(false)} type="button">취소</button><button className="button button--danger" disabled={isDeleting} onClick={() => void handleDelete()} type="button">{isDeleting ? '삭제 중…' : '삭제하기'}</button></div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}
