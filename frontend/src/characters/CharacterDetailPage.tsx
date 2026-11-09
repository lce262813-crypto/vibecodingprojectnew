import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ShareControls } from '../sharing/ShareControls'
import { CharacterSprite } from './CharacterSprite'
import { downloadCharacterPng } from './pixel/canvasExport'
import { renderStoredPixelCharacter } from './pixel/renderStoredCharacter'
import { getCharacter, renameCharacter, setCharacterFavorite, type CharacterDetail } from './charactersApi'
import { EMOTION_LABELS } from './emotionCatalog'
import { PageLoader } from '../components/PageLoader'

export function CharacterDetailPage() {
  const { characterId = '' } = useParams()
  const [detail, setDetail] = useState<CharacterDetail | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    getCharacter(characterId)
      .then((result) => {
        if (!active) return
        setDetail(result)
        setName(result.character.name)
      })
      .catch(() => { if (active) setError('캐릭터 정보를 불러오지 못했습니다.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [characterId])

  async function handleRename(event: FormEvent) {
    event.preventDefault()
    setError(''); setSuccess('')
    try {
      const result = await renameCharacter(characterId, name)
      setDetail(result); setName(result.character.name); setSuccess('새 이름을 저장했어요.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '이름을 변경하지 못했습니다.')
    }
  }

  async function toggleFavorite() {
    if (!detail) return
    setError(''); setSuccess('')
    try {
      const result = await setCharacterFavorite(characterId, !detail.character.is_favorite)
      setDetail(result)
      setSuccess(result.character.is_favorite ? '즐겨찾기에 추가했어요.' : '즐겨찾기에서 해제했어요.')
    } catch { setError('즐겨찾기를 변경하지 못했습니다.') }
  }

  function downloadPng() {
    if (!detail) return
    const rendered = renderStoredPixelCharacter(detail.character)
    if (!rendered) { setError('이전 버전 캐릭터는 PNG 다운로드를 지원하지 않아요.'); return }
    downloadCharacterPng(rendered, `${detail.character.name}.png`, 6)
    setSuccess('투명 배경 PNG 다운로드를 시작했어요.')
  }

  return (
    <main className="min-h-screen px-5 py-8">
      <section className="panel mx-auto max-w-3xl">
        <Link className="text-sm font-bold text-violet-700" to="/characters">← 도감으로</Link>
        {isLoading && <PageLoader label="캐릭터를 불러오는 중…" />}
        {error && <p className="form-error mt-5" role="alert">{error}</p>}
        {detail && (
          <>
            <div className="mt-5 text-center">
              <CharacterSprite
                accessoryPart={detail.encounters[0]?.accessory_part}
                character={detail.character}
                effectParts={detail.encounters[0]?.effect_parts}
              />
              <h1 className="mt-3 text-3xl font-black">{detail.character.name}</h1>
              <p className="mt-2 text-stone-500">
                {detail.character.first_met_on} 첫 만남 · 총 {detail.character.encounter_count}번 만남
              </p>
              <p className="mt-2 font-bold text-violet-700">주감정 {EMOTION_LABELS[detail.character.primary_emotion] ?? detail.character.primary_emotion}</p>
              <button className="button button--secondary mt-4" onClick={() => void toggleFavorite()} type="button">{detail.character.is_favorite ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가'}</button>
              <button className="button button--secondary mt-4 ml-2" onClick={downloadPng} type="button">PNG 저장</button>
            </div>
            <form className="name-form mt-8" onSubmit={handleRename}>
              <label htmlFor="character-name">캐릭터 이름</label>
              <div><input id="character-name" maxLength={12} value={name} onChange={(event) => setName(event.target.value)} /><button className="button button--secondary" type="submit">이름 저장</button></div>
            </form>
            {success && <p className="form-success mt-4">{success}</p>}
            <section className="mt-9">
              <h2 className="text-xl font-black">만났던 날짜</h2>
              <div className="encounter-list mt-4">
                {detail.encounters.map((encounter) => (
                  <Link key={encounter.encounter_id} to={`/diary/entries/${encounter.entry_id}`}>
                    <strong>{encounter.met_on} · {encounter.title || '제목 없는 일기'}</strong>
                    <span>{encounter.display_emotions.map((emotion) => emotion.label).join(' · ')} · 원본 일기 보기 →</span>
                  </Link>
                ))}
              </div>
            </section>
            <div className="mt-9">
              <ShareControls characterId={characterId} characterName={detail.character.name} />
            </div>
          </>
        )}
      </section>
    </main>
  )
}
