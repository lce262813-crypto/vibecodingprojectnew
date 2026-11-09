import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CharacterSprite } from './CharacterSprite'
import { getCharacters, setCharacterFavorite, type CharacterCard } from './charactersApi'
import { EMOTION_GROUPS, EMOTION_LABELS, emotionGroupFor } from './emotionCatalog'
import { PageLoader } from '../components/PageLoader'

export function CollectionPage() {
  const [characters, setCharacters] = useState<CharacterCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [emotion, setEmotion] = useState('')
  const [group, setGroup] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [pendingFavorite, setPendingFavorite] = useState('')

  useEffect(() => {
    let active = true
    getCharacters()
      .then((result) => { if (active) setCharacters(result) })
      .catch(() => { if (active) setError('캐릭터 도감을 불러오지 못했습니다.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => characters
    .filter((character) => !emotion || character.primary_emotion === emotion)
    .filter((character) => !group || emotionGroupFor(character.primary_emotion) === group)
    .filter((character) => !favoritesOnly || character.is_favorite)
    .sort((a, b) => sort === 'newest'
      ? b.first_met_on.localeCompare(a.first_met_on)
      : a.first_met_on.localeCompare(b.first_met_on)),
  [characters, emotion, group, favoritesOnly, sort])

  async function toggleFavorite(character: CharacterCard) {
    setPendingFavorite(character.character_id); setError('')
    try {
      const result = await setCharacterFavorite(character.character_id, !character.is_favorite)
      setCharacters((current) => current.map((item) => item.character_id === character.character_id
        ? result.character
        : item))
    } catch { setError('즐겨찾기를 변경하지 못했습니다.') }
    finally { setPendingFavorite('') }
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="eyebrow">나의 수집 기록</p>
        <h1 className="mt-3 text-3xl font-black text-stone-900">캐릭터 도감</h1>
        <p className="mt-3 text-stone-600">일기에서 만난 감정 몬스터들이 자동으로 모여요.</p>
        <section className="collection-filters mt-6" aria-label="도감 필터">
          <label><span>주감정</span><select aria-label="주감정 필터" onChange={(event) => setEmotion(event.target.value)} value={emotion}><option value="">전체 감정</option>{Object.entries(EMOTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>감정 그룹</span><select aria-label="감정 그룹 필터" onChange={(event) => setGroup(event.target.value)} value={group}><option value="">전체 그룹</option>{Object.entries(EMOTION_GROUPS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
          <label><span>정렬</span><select aria-label="생성 날짜 정렬" onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')} value={sort}><option value="newest">최근 탄생순</option><option value="oldest">오래된 탄생순</option></select></label>
          <label className="collection-favorite-filter"><input checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} type="checkbox" /> 즐겨찾기만</label>
        </section>
        {isLoading && <PageLoader label="도감을 펼치는 중…" />}
        {error && <p className="form-error mt-6" role="alert">{error}</p>}
        {!isLoading && !error && characters.length === 0 && (
          <section className="collection-empty mt-8">
            <span aria-hidden="true">✦</span>
            <h2>아직 만난 캐릭터가 없어요</h2>
            <p>오늘의 일기를 쓰면 첫 감정 몬스터를 만날 수 있어요.</p>
            <Link className="button button--primary mt-5" to="/diary">첫 일기 쓰기</Link>
          </section>
        )}
        {!isLoading && characters.length > 0 && filtered.length === 0 && <p className="collection-empty mt-8">선택한 조건에 맞는 캐릭터가 없어요.</p>}
        {filtered.length > 0 && (
          <ul className="collection-tiles mt-6">
            {filtered.map((character) => (
              <li className="collection-tile" key={character.character_id}>
                <button aria-label={`${character.name} ${character.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}`} className={`favorite-button${character.is_favorite ? ' favorite-button--active' : ''}`} disabled={pendingFavorite === character.character_id} onClick={() => void toggleFavorite(character)} type="button">★</button>
                <Link className="collection-tile__link" title={`${character.encounter_count}번 만남 · 탄생 ${character.first_met_on}`} to={`/characters/${character.character_id}`}>
                  <CharacterSprite character={character} size="small" />
                  <strong>{character.name}</strong>
                  <span>{EMOTION_LABELS[character.primary_emotion] ?? character.primary_emotion} · {character.encounter_count}번</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
