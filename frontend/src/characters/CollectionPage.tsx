import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { CharacterSprite } from './CharacterSprite'
import { getCharacters, type CharacterCard } from './charactersApi'

const emotionLabels: Record<string, string> = {
  joy: '기쁨', excitement: '설렘', calm: '평온', pride: '뿌듯함', moved: '감동',
  sadness: '슬픔', anger: '분노', irritation: '짜증', anxiety: '불안',
  loneliness: '외로움', disappointment: '실망', embarrassment: '당황',
  confusion: '혼란', shyness: '부끄러움', fatigue: '피로', lethargy: '무기력',
}

export function CollectionPage() {
  const [characters, setCharacters] = useState<CharacterCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getCharacters()
      .then((result) => { if (active) setCharacters(result) })
      .catch(() => { if (active) setError('캐릭터 도감을 불러오지 못했습니다.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="eyebrow">나의 수집 기록</p>
        <h1 className="mt-3 text-3xl font-black text-stone-900">캐릭터 도감</h1>
        <p className="mt-3 text-stone-600">일기에서 만난 감정 몬스터들이 자동으로 모여요.</p>
        {isLoading && <p className="mt-10 text-center text-stone-500">도감을 펼치는 중…</p>}
        {error && <p className="form-error mt-6" role="alert">{error}</p>}
        {!isLoading && !error && characters.length === 0 && (
          <section className="collection-empty mt-8">
            <span aria-hidden="true">✦</span>
            <h2>아직 만난 캐릭터가 없어요</h2>
            <p>오늘의 일기를 쓰면 첫 감정 몬스터를 만날 수 있어요.</p>
            <Link className="button button--primary mt-5" to="/diary">첫 일기 쓰기</Link>
          </section>
        )}
        <div className="collection-grid mt-8">
          {characters.map((character) => (
            <Link className="collection-card" key={character.character_id} to={`/characters/${character.character_id}`}>
              <CharacterSprite character={character} size="small" />
              <h2>{character.name}</h2>
              <p>{emotionLabels[character.primary_emotion] ?? character.primary_emotion}</p>
              <span>{character.encounter_count}번 만남 · 최근 {character.last_met_on}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
