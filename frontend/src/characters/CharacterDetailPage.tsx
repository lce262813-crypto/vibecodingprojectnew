import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ShareControls } from '../sharing/ShareControls'
import { CharacterSprite } from './CharacterSprite'
import { getCharacter, renameCharacter, type CharacterDetail } from './charactersApi'

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

  return (
    <main className="min-h-screen px-5 py-8">
      <section className="panel mx-auto max-w-3xl">
        <Link className="text-sm font-bold text-violet-700" to="/characters">← 도감으로</Link>
        {isLoading && <p className="mt-8 text-center text-stone-500">캐릭터를 불러오는 중…</p>}
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
                  <Link key={encounter.encounter_id} to={`/characters/${characterId}/encounters/${encounter.encounter_id}`}>
                    <strong>{encounter.met_on}</strong><span>감정 강도 {encounter.intensity_level}단계 →</span>
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
