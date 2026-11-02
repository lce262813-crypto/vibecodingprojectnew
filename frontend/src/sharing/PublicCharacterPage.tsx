import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CharacterSprite } from '../characters/CharacterSprite'
import { getSharedCharacter, type PublicSharedCharacter } from './sharingApi'

export function PublicCharacterPage() {
  const { token = '' } = useParams()
  const [shared, setShared] = useState<PublicSharedCharacter | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getSharedCharacter(token)
      .then((result) => { if (active) setShared(result) })
      .catch(() => { if (active) setError('공유가 끝났거나 찾을 수 없는 링크예요.') })
    return () => { active = false }
  }, [token])

  return (
    <main className="share-page grid min-h-screen place-items-center px-5 py-10">
      <section className="share-card text-center">
        <p className="share-card__brand">MOZI</p>
        {!shared && !error && <p className="mt-8 text-stone-500">감정 몬스터를 불러오는 중…</p>}
        {error && (
          <>
            <h1 className="mt-6 text-2xl font-black text-stone-900">{error}</h1>
            <p className="mt-3 text-stone-600">친구에게 새 링크를 부탁해 보세요.</p>
          </>
        )}
        {shared && (
          <>
            <h1 className="mt-4 text-xl font-black text-stone-900">
              {shared.owner_nickname}님이 새로운 감정 몬스터를 공유했어요!
            </h1>
            <div className="share-card__stage">
              <CharacterSprite
                accessoryPart={shared.accessory_part}
                character={shared}
                effectParts={shared.effect_parts}
                size="large"
              />
            </div>
            <p className="share-card__name">{shared.name}</p>
          </>
        )}
        <Link className="button button--primary mt-8" to="/signup">나도 감정 몬스터 만들기</Link>
      </section>
    </main>
  )
}
