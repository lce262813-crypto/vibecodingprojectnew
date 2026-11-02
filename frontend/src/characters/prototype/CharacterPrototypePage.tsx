import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { PixelMonster } from '../PixelMonster'
import { originalCharacterAsset, originalCharacters } from '../originalCharacters'

interface PrototypeDefinition {
  id: string
  name: string
  seed: number
  body: { template_id: string; palette_id: string; color: string }
  expression: { eyebrow_id: string; eye_id: string; mouth_id: string }
  emotion: {
    primary: { key: string; intensity: number }
    secondary: { key: string; intensity: number }
    detail_state: string
  }
  decoration: { part_id: string; anchor: string }
  effect_parts: string[]
  mutation: { part_id: string | null }
  description: string
}

const emotionLabels: Record<string, string> = {
  joy: '기쁨', excitement: '설렘', calm: '평온', pride: '뿌듯함',
  moved: '감동', sadness: '슬픔', anger: '분노', irritation: '짜증',
  anxiety: '불안', loneliness: '외로움', disappointment: '실망',
  embarrassment: '당황', confusion: '혼란', shyness: '부끄러움',
  fatigue: '피로', lethargy: '무기력',
}

const bodyTemplates = ['basic']
const galleryCases = [
  ['반짝두근', 'joy', 70, 'excitement', 30, '#F8D76A'],
  ['방긋평온', 'joy', 60, 'calm', 40, '#F6CF65'],
  ['콩닥초조', 'excitement', 65, 'anxiety', 35, '#F8BCD0'],
  ['포근울먹', 'calm', 70, 'sadness', 30, '#A9D7C3'],
  ['으씄졸림', 'pride', 70, 'fatigue', 30, '#F8E078'],
  ['촉촉방긋', 'moved', 60, 'joy', 40, '#A8E1E0'],
  ['비구름몽', 'sadness', 70, 'loneliness', 30, '#A8C8F8'],
  ['울컥부글', 'sadness', 55, 'anger', 45, '#AFC9EE'],
  ['부글꾸벅', 'anger', 70, 'fatigue', 30, '#F8877E'],
  ['억울버럭', 'anger', 65, 'sadness', 35, '#F39A78'],
  ['까칠멍', 'irritation', 60, 'lethargy', 40, '#C2AFE8'],
  ['답답초조', 'irritation', 55, 'anxiety', 45, '#D0B0F0'],
  ['불안혼란', 'anxiety', 60, 'confusion', 40, '#C8B6EF'],
  ['조마녹초', 'anxiety', 65, 'fatigue', 35, '#B8B8C8'],
  ['쓸쓸고요', 'loneliness', 70, 'calm', 30, '#A8D8E8'],
  ['허탈멍', 'disappointment', 55, 'lethargy', 45, '#B8B8C8'],
  ['화들조마', 'embarrassment', 60, 'anxiety', 40, '#F3A9C8'],
  ['갸웃멍', 'confusion', 55, 'lethargy', 45, '#D0B0F0'],
  ['수줍콩닥', 'shyness', 60, 'excitement', 40, '#F5B8CF'],
  ['느릿녹초', 'fatigue', 60, 'lethargy', 40, '#B8B8C8'],
] as const

function expandBodyGallery(source: PrototypeDefinition[]) {
  if (source.length === 0) return []
  return galleryCases.map(([name, primary, primaryIntensity, secondary, secondaryIntensity, color], index) => {
    const prototype = source[index % source.length]
    return {
      ...prototype,
      id: `body-check-${index + 1}`,
      name,
      seed: 50021 + index * 7919,
      body: {
        ...prototype.body,
        template_id: bodyTemplates[index % bodyTemplates.length],
        color,
      },
      emotion: {
        ...prototype.emotion,
        primary: { key: primary, intensity: primaryIntensity },
        secondary: { key: secondary, intensity: secondaryIntensity },
      },
      description: `${emotionLabels[primary]} + ${emotionLabels[secondary]} 조합의 몸통 안정성 검수`,
    }
  })
}

export function CharacterPrototypePage() {
  const [prototypes, setPrototypes] = useState<PrototypeDefinition[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/assets/character-prototype/prototypes.json')
      .then((response) => {
        if (!response.ok) throw new Error('prototype data unavailable')
        return response.json() as Promise<PrototypeDefinition[]>
      })
      .then((result) => { if (active) setPrototypes(expandBodyGallery(result)) })
      .catch(() => { if (active) setError('프로토타입 데이터를 불러오지 못했습니다.') })
    return () => { active = false }
  }, [])

  return (
    <main className="prototype-page min-h-screen px-5 py-7 sm:px-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link className="brand" to="/">MOZI</Link>
        <span className="prototype-badge">개발용 · 원본/생성 분리</span>
      </header>
      <section className="mx-auto mt-10 max-w-7xl">
        <p className="eyebrow">Original style combination test</p>
        <h1 className="mt-3 text-3xl font-black text-stone-900 sm:text-4xl">원본 12종과 공통 젤리 몸통 20종</h1>
        <p className="mt-4 max-w-3xl leading-7 text-stone-600">
          위의 원본 12종은 추출한 PNG를 수정 없이 보여줍니다. 아래 20종은 같은 크기의
          몸통·표정·장식 픽셀 레이어를 조합한 새 캐릭터입니다. 이번 화면은 표정 확정 전
          가이드의 96:64 비율 공통 몸통에 파임·구멍·분리가 없는지 확인하는 Phase 2 검수용입니다.
        </p>

        <div className="prototype-section-heading">
          <div><span className="prototype-source prototype-source--original">원본</span><h2>원본 캐릭터 12종</h2></div>
          <p>원본 이미지 에셋을 그대로 표시</p>
        </div>
        <div className="original-character-grid">
          {originalCharacters.map((character) => (
            <article className="original-character-card" key={character.asset} data-character-source="original">
              <div className="prototype-canvas">
                <img
                  alt={`${character.name} 원본 캐릭터`}
                  draggable="false"
                  src={originalCharacterAsset(character.asset)}
                />
              </div>
              <h3>{character.name}</h3>
              <p>{character.emotion}</p>
            </article>
          ))}
        </div>

        <div className="prototype-section-heading">
          <div><span className="prototype-source prototype-source--generated">생성</span><h2>동일한 기본 몸통의 감정 조합 20종</h2></div>
          <p>몸통은 하나로 고정 · 표정·색상·장식으로 다양성 표현</p>
        </div>
        {error && <p className="form-error mt-6" role="alert">{error}</p>}
        {!error && prototypes.length === 0 && <p className="mt-10 text-center text-stone-500">프로토타입을 조립하는 중…</p>}
        <div className="prototype-grid mt-9">
          {prototypes.map((prototype) => (
            <article className="prototype-card" key={prototype.id} data-character-source="generated">
              <div className="prototype-canvas">
                <PixelMonster
                  alt={`${prototype.name} 생성 캐릭터`}
                  parts={{
                    body: prototype.body.template_id,
                    color: prototype.body.color,
                    eyebrow: prototype.expression.eyebrow_id,
                    eyes: prototype.expression.eye_id,
                    mouth: prototype.expression.mouth_id,
                    decoration: prototype.decoration.part_id,
                    effects: prototype.effect_parts,
                    mutation: prototype.mutation.part_id,
                  }}
                />
              </div>
              <h2>{prototype.name}</h2>
              <div className="prototype-emotions">
                <span>{emotionLabels[prototype.emotion.primary.key]} {prototype.emotion.primary.intensity}%</span>
                <span>{emotionLabels[prototype.emotion.secondary.key]} {prototype.emotion.secondary.intensity}%</span>
              </div>
              <p>{prototype.description}</p>
              <dl>
                <div><dt>몸통</dt><dd>{prototype.body.template_id} · {prototype.body.palette_id}</dd></div>
                <div><dt>표정</dt><dd>{prototype.expression.eyebrow_id} / {prototype.expression.eye_id} / {prototype.expression.mouth_id}</dd></div>
                <div><dt>장식</dt><dd>{prototype.decoration.part_id}</dd></div>
                <div><dt>시드</dt><dd>{prototype.seed}</dd></div>
                <div><dt>마스크</dt><dd>연결 1 · 구멍 0 · 상단 볼록</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
