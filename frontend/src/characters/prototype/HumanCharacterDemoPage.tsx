import { Link } from 'react-router-dom'

import { PixelCharacterCanvas } from '../pixel/PixelCharacterCanvas'
import { EMOTION_KEYS, type EmotionKey } from '../pixel/palette'
import { renderCharacter, type CharacterSpec } from '../pixel/renderCharacter'
import { renderHumanCharacter } from '../pixel/renderHumanCharacter'

const LABELS: Record<EmotionKey, string> = {
  joy: '기쁨', excitement: '설렘', calm: '평온', pride: '뿌듯함', moved: '감동', sadness: '슬픔',
  anger: '분노', irritation: '짜증', anxiety: '불안', loneliness: '외로움', disappointment: '실망',
  embarrassment: '당황', confusion: '혼란', shyness: '부끄러움', fatigue: '피로', lethargy: '무기력',
}

const HAIR_LABELS = { round: '동글 머리', heart: '하트봉우리 머리', flat: '차분한 납작 머리', wave: '처진 물결 머리', spiky: '불꽃 뾰족 머리', drop: '긴장 물방울 머리' }
const SECONDARIES: EmotionKey[] = ['calm', 'anxiety', 'joy', 'fatigue', 'moved', 'loneliness', 'sadness', 'irritation', 'embarrassment', 'disappointment', 'anger', 'confusion', 'shyness', 'excitement', 'lethargy', 'pride']

function spec(primary: EmotionKey, secondary: EmotionKey, intensity = 72): CharacterSpec {
  return { primary: { key: primary, score: intensity }, secondary: { key: secondary, score: 58 }, seed: 4100 + EMOTION_KEYS.indexOf(primary) }
}

export function HumanCharacterDemoPage() {
  const comparison = spec('anger', 'fatigue', 80)
  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-8 text-[#31243c]">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-violet-700">MOZI CHARACTER WORKSHOP</p>
            <h1 className="mt-1 text-3xl font-black">캐릭터 작업실</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">주감정은 머리 모양과 머리색을, 보조감정은 얼굴 표정을 결정합니다. 기존 5단계 강도 팔레트와 표정 라이브러리는 그대로 사용합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-700" to="/prototype/characters/pixel">기존 슬라임 데모</Link>
            <Link className="rounded-full bg-violet-700 px-4 py-2 text-sm font-bold text-white" to="/">MOZI 홈</Link>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">기존 스타일과 새 스타일</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl bg-violet-50 p-4 text-center">
              <PixelCharacterCanvas character={renderCharacter(comparison)} label="기존 슬라임 캐릭터" scale={4} />
              <strong className="mt-3 block">pixel-v5 · 기존 기록 보존</strong>
            </article>
            <article className="rounded-2xl bg-amber-50 p-4 text-center">
              <PixelCharacterCanvas character={renderHumanCharacter(comparison)} label="새 사람형 캐릭터" scale={4} />
              <strong className="mt-3 block">human-v1 · 새로 생성되는 기록</strong>
            </article>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black">16가지 주감정 머리 + 보조감정 표정</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {EMOTION_KEYS.map((primary, index) => {
              const secondary = SECONDARIES[index]
              const result = renderHumanCharacter(spec(primary, secondary))
              return (
                <article className="rounded-3xl border border-violet-100 bg-white p-3 text-center shadow-sm" key={primary}>
                  <div className="rounded-2xl bg-[linear-gradient(45deg,#faf7ff_25%,transparent_25%),linear-gradient(-45deg,#faf7ff_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#faf7ff_75%),linear-gradient(-45deg,transparent_75%,#faf7ff_75%)] bg-[length:16px_16px]">
                    <PixelCharacterCanvas character={result} label={`${LABELS[primary]} 사람형 캐릭터`} scale={3} />
                  </div>
                  <strong className="mt-2 block">{LABELS[primary]} 머리</strong>
                  <p className="mt-1 text-xs text-slate-600">{HAIR_LABELS[result.silhouette as keyof typeof HAIR_LABELS]} · {LABELS[secondary]} 표정</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-violet-200 bg-white p-5">
          <h2 className="text-xl font-black">같은 주감정, 다른 보조감정</h2>
          <p className="mt-1 text-sm text-slate-600">머리와 색은 기쁨으로 고정되고 표정만 달라지는지 확인합니다.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['excitement', 'sadness', 'anger', 'fatigue'] as EmotionKey[]).map((secondary) => (
              <article className="rounded-2xl bg-[#fffaf2] p-3 text-center" key={secondary}>
                <PixelCharacterCanvas character={renderHumanCharacter(spec('joy', secondary, 70))} label={`기쁨 머리 ${LABELS[secondary]} 표정`} scale={3} />
                <b className="block text-sm">기쁨 + {LABELS[secondary]}</b>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
