import { useEffect, useState } from 'react'

import { CharacterSprite } from '../characters/CharacterSprite'
import { getCharacters, type CharacterCard } from '../characters/charactersApi'
import { getResidents, moveIn, moveOut, type ResidentListResponse } from './roomApi'

export function ResidentManagerPage() {
  const [characters, setCharacters] = useState<CharacterCard[]>([])
  const [room, setRoom] = useState<ResidentListResponse | null>(null)
  const [pendingId, setPendingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getCharacters(), getResidents()])
      .then(([collection, residents]) => { setCharacters(collection); setRoom(residents) })
      .catch(() => setError('입주 정보를 불러오지 못했습니다.'))
  }, [])

  async function toggle(character: CharacterCard) {
    setPendingId(character.character_id); setError('')
    try {
      const result = character.is_resident
        ? await moveOut(character.character_id)
        : await moveIn(character.character_id)
      const residentIds = new Set(result.residents.map((item) => item.character.character_id))
      setRoom(result)
      setCharacters((current) => current.map((item) => ({
        ...item, is_resident: residentIds.has(item.character_id),
      })))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '입주 상태를 변경하지 못했습니다.')
    } finally {
      setPendingId('')
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="eyebrow">나의 감정 방</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div><h1 className="text-3xl font-black">입주 관리</h1><p className="mt-2 text-stone-600">좋아하는 캐릭터를 최대 5마리까지 선택해 보세요.</p></div>
          <strong className="resident-count">{room?.count ?? 0} / {room?.limit ?? 5} 입주</strong>
        </div>
        {error && <p className="form-error mt-6" role="alert">{error}</p>}
        {room && characters.length === 0 && <p className="collection-empty mt-8">먼저 일기를 써서 캐릭터를 만나 보세요.</p>}
        <div className="collection-grid mt-8">
          {characters.map((character) => (
            <article className={`collection-card ${character.is_resident ? 'collection-card--resident' : ''}`} key={character.character_id}>
              <CharacterSprite character={character} size="small" />
              <h2>{character.name}</h2>
              <p>{character.is_resident ? '입주 중' : '대기 중'}</p>
              <button
                className={`button mt-3 ${character.is_resident ? 'button--secondary' : 'button--primary'}`}
                disabled={pendingId === character.character_id || (!character.is_resident && room?.count === room?.limit)}
                onClick={() => void toggle(character)}
                type="button"
              >
                {pendingId === character.character_id ? '변경 중…' : character.is_resident ? '퇴실시키기' : '입주시키기'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
