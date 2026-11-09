import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { EMOTION_KEYS, EMOTION_LABELS, type EmotionKey } from '../pixel/palette'
import { SIZE, type ConceptSpec, type Grid } from './kit'
import { renderCostumeFriend, renderHeartPlant, renderMarbleJelly, renderMoodBottle, renderWeatherPerson } from './renderers'

interface Concept {
  id: string
  name: string
  kind: string
  render: (spec: ConceptSpec) => Grid
  strength: string
  size: string
  secondary: string
  note: string
}

const CONCEPTS: Concept[] = [
  { id: 'weather', name: '날씨 사람', kind: '사람형', render: renderWeatherPerson, strength: '표정과 자세로 보여줘요. 기쁨은 팔이 올라가다 점프하고, 슬픔은 몸이 가라앉아 주저앉아요.', size: '머리가 조금씩 커져요. 옷 색이 주감정 색이에요.', secondary: '머리 위 날씨예요. 기쁨은 해, 슬픔은 비구름, 분노는 번개구름이고 점수가 높을수록 커져요.', note: '사람은 주감정만 맡아 얼굴이 깔끔해요. 두 감정의 자리가 달라 겹치지 않아요.' },
  { id: 'costume', name: '인형탈 친구', kind: '사람형', render: renderCostumeFriend, strength: '표정, 팔 높이, 귀와 뿔 길이가 함께 변해요.', size: '탈이 빵빵해지면서 몸집이 커져요.', secondary: '작은 친구예요. 점수가 낮으면 주머니 속, 중간이면 어깨 옆, 높으면 머리 위로 올라가요.', note: '보조감정의 크기를 위치로 읽을 수 있어요. 귀 모양으로 감정 그룹 6개도 구분돼요.' },
  { id: 'plant', name: '마음 화분', kind: '식물형', render: renderHeartPlant, strength: '새싹, 잎, 꽃봉오리, 개화, 만개 순서로 자라요.', size: '줄기 길이가 곧 점수예요.', secondary: '곁가지의 작은 꽃과 화분 색이에요. 점수가 높을수록 꽃이 커져요.', note: '슬픈 감정도 시드는 대신 다른 꽃이 피어서, 부정 감정을 벌주는 느낌이 없어요.' },
  { id: 'bottle', name: '마음 병', kind: '사물형', render: renderMoodBottle, strength: '기포가 늘고 표면이 출렁이다가, 활동적인 감정이 아주 강하면 코르크가 튀어 올라요.', size: '액체 높이가 곧 점수예요.', secondary: '위에 뜬 다른 색 층이에요. 층 두께가 점수예요.', note: '수치가 가장 정확하게 보여요. 감정 리포트와 연결하기 좋아요.' },
  { id: 'jelly', name: '두 색 젤리', kind: '비인간형', render: renderMarbleJelly, strength: '강해지면 왕관, 뿔, 하트 같은 장식이 생기며 진화해요.', size: '몸집이 점수만큼 커져요.', secondary: '몸에 섞인 무늬예요. 두 감정의 비율이 그대로 색 면적이 돼요.', note: '지금 슬라임에서 가장 쉽게 옮겨 올 수 있어요. 두 감정이 정말 섞인 느낌이 나요.' },
]

const LEVELS = [{ score: 10, label: '아주 약함' }, { score: 30, label: '약함' }, { score: 50, label: '보통' }, { score: 70, label: '강함' }, { score: 95, label: '매우 강함' }]
const SECONDARY_SIZES = [{ score: 20, label: '보조 20' }, { score: 50, label: '보조 50' }, { score: 85, label: '보조 85' }]
const PAIRINGS: Array<[EmotionKey, EmotionKey]> = [['joy', 'sadness'], ['anger', 'fatigue'], ['excitement', 'anxiety'], ['calm', 'loneliness']]

function Sprite({ grid, label, scale }: { grid: Grid; label: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    grid.px.forEach((color, i) => {
      if (!color) return
      ctx.fillStyle = color
      ctx.fillRect(i % SIZE, Math.floor(i / SIZE), 1, 1)
    })
  }, [grid])
  return <canvas aria-label={label} height={SIZE} ref={ref} role="img" style={{ width: SIZE * scale, height: 'auto', aspectRatio: '1', imageRendering: 'pixelated', maxWidth: '100%' }} width={SIZE} />
}

function Cell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-[#f6f1ff] p-1.5 text-center">
      {children}
      <span className="text-[11px] font-bold leading-tight text-slate-600">{label}</span>
    </div>
  )
}

export function ConceptDemoPage() {
  const [primary, setPrimary] = useState<EmotionKey>('joy')
  const [primaryScore, setPrimaryScore] = useState(70)
  const [secondary, setSecondary] = useState<EmotionKey | ''>('sadness')
  const [secondaryScore, setSecondaryScore] = useState(50)
  const contrast: EmotionKey = primary === 'sadness' ? 'joy' : 'sadness'
  const liveSpec: ConceptSpec = {
    primary: { key: primary, score: primaryScore },
    secondary: secondary ? { key: secondary, score: secondaryScore } : null,
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-3 py-6 text-[#31243c] sm:px-4">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-violet-700">MOZI CHARACTER CONCEPTS</p>
            <h1 className="mt-1 text-3xl font-black">캐릭터 콘셉트 비교</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">다섯 가지 방식 모두 같은 감정 점수로 그려요. 아래에서 값을 바꾸면 모든 콘셉트가 함께 바뀌어요.</p>
          </div>
          <Link className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-700" to="/character-workshop">현재 캐릭터 보기</Link>
        </div>

        <section className="sticky top-0 z-20 mt-5 grid gap-3 rounded-2xl border border-violet-200 bg-white/95 p-3 shadow-sm sm:grid-cols-2">
          <div className="grid gap-1 text-sm font-bold">
            <span>주감정 · {EMOTION_LABELS[primary]} {primaryScore}</span>
            <div className="flex gap-2">
              <select aria-label="주감정" className="rounded-lg border border-violet-200 bg-white p-2" onChange={(event) => setPrimary(event.target.value as EmotionKey)} value={primary}>
                {EMOTION_KEYS.map((key) => <option key={key} value={key}>{EMOTION_LABELS[key]}</option>)}
              </select>
              <input aria-label="주감정 점수" className="min-w-0 flex-1 accent-violet-600" max={100} min={0} onChange={(event) => setPrimaryScore(Number(event.target.value))} type="range" value={primaryScore} />
            </div>
          </div>
          <div className="grid gap-1 text-sm font-bold">
            <span>보조감정 · {secondary ? `${EMOTION_LABELS[secondary]} ${secondaryScore}` : '없음'}</span>
            <div className="flex gap-2">
              <select aria-label="보조감정" className="rounded-lg border border-violet-200 bg-white p-2" onChange={(event) => setSecondary(event.target.value as EmotionKey | '')} value={secondary}>
                <option value="">없음</option>
                {EMOTION_KEYS.map((key) => <option key={key} value={key}>{EMOTION_LABELS[key]}</option>)}
              </select>
              <input aria-label="보조감정 점수" className="min-w-0 flex-1 accent-violet-600" disabled={!secondary} max={100} min={0} onChange={(event) => setSecondaryScore(Number(event.target.value))} type="range" value={secondaryScore} />
            </div>
          </div>
        </section>

        {CONCEPTS.map((concept, index) => (
          <article className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm" key={concept.id}>
            <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-bold text-violet-700">콘셉트 {index + 1} · {concept.kind}</p>
                <h2 className="mt-1 text-xl font-black">{concept.name}</h2>
                <div className="mt-3 flex justify-center rounded-2xl bg-[#f6f1ff] p-3"><Sprite grid={concept.render(liveSpec)} label={`${concept.name} 미리보기`} scale={6} /></div>
                <dl className="mt-3 grid gap-2 text-sm leading-relaxed">
                  <div><dt className="font-black text-violet-700">감정의 강도</dt><dd>{concept.strength}</dd></div>
                  <div><dt className="font-black text-violet-700">주감정의 크기</dt><dd>{concept.size}</dd></div>
                  <div><dt className="font-black text-violet-700">보조감정</dt><dd>{concept.secondary}</dd></div>
                </dl>
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed">{concept.note}</p>
              </div>
              <div className="min-w-0 space-y-4">
                <section>
                  <h3 className="text-sm font-black">주감정 강도 5단계</h3>
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {LEVELS.map((level) => <Cell key={level.score} label={level.label}><Sprite grid={concept.render({ primary: { key: primary, score: level.score }, secondary: null })} label={`${concept.name} ${level.label}`} scale={2.5} /></Cell>)}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-black">{EMOTION_LABELS[contrast]} 강도 5단계 (비교)</h3>
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {LEVELS.map((level) => <Cell key={level.score} label={level.label}><Sprite grid={concept.render({ primary: { key: contrast, score: level.score }, secondary: null })} label={`${concept.name} ${EMOTION_LABELS[contrast]} ${level.label}`} scale={2.5} /></Cell>)}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-black">보조감정 크기 3단계</h3>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {SECONDARY_SIZES.map((item) => <Cell key={item.score} label={item.label}><Sprite grid={concept.render({ primary: { key: primary, score: 70 }, secondary: { key: secondary || 'sadness', score: item.score } })} label={`${concept.name} ${item.label}`} scale={2.5} /></Cell>)}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-black">감정 조합</h3>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {PAIRINGS.map(([main, sub]) => <Cell key={main} label={`${EMOTION_LABELS[main]} + ${EMOTION_LABELS[sub]}`}><Sprite grid={concept.render({ primary: { key: main, score: 75 }, secondary: { key: sub, score: 55 } })} label={`${concept.name} ${EMOTION_LABELS[main]} ${EMOTION_LABELS[sub]}`} scale={2.5} /></Cell>)}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-black">16가지 주감정 · 방에 놓이는 크기</h3>
                  <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                    {EMOTION_KEYS.map((key) => <Cell key={key} label={EMOTION_LABELS[key]}><Sprite grid={concept.render({ primary: { key, score: 75 }, secondary: null })} label={`${concept.name} ${EMOTION_LABELS[key]}`} scale={1.75} /></Cell>)}
                  </div>
                </section>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
