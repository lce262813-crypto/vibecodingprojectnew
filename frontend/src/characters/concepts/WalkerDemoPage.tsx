import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { EMOTION_KEYS, EMOTION_LABELS, type EmotionKey } from '../pixel/palette'
import { COLORS, SIZE, darken, type ConceptSpec, type Grid } from './kit'
import { SHAPE_LABELS, SYMBOLS, renderCostumePerson, renderHatPerson, renderShapeFriend, type BodyShape } from './walkers'

type Render = (spec: ConceptSpec, tick?: number, walking?: boolean) => Grid

interface Concept {
  id: string
  name: string
  kind: string
  render: Render
  summary: string
  reading: Array<{ part: string; meaning: string }>
}

const CONCEPTS: Concept[] = [
  {
    id: 'shape', name: '몸 형태 친구', kind: '이전 캐릭터 구체화', render: renderShapeFriend,
    summary: '예전의 둥근형, 귀형, 하트형을 그대로 살리고 손발, 입체감, 목도리를 더했어요.',
    reading: [
      { part: '몸 형태와 색', meaning: '주감정이에요.' },
      { part: '색 농도', meaning: '강도예요. 약하면 연하고 강하면 진해요.' },
      { part: '귀, 가시, 뿔처럼 튀어나온 부분', meaning: '강도예요. 강할수록 길어져요.' },
      { part: '몸집', meaning: '주감정의 크기예요.' },
      { part: '주변 기호', meaning: '강도예요. 강할수록 많아져요.' },
      { part: '목도리', meaning: '보조감정이에요. 색이 감정이고, 점수가 높을수록 두껍고 길어요.' },
    ],
  },
  {
    id: 'hat', name: '감정 모자 사람', kind: '사람형', render: renderHatPerson,
    summary: '사람은 그대로 두고 모자와 옷으로 감정을 보여줘요. 모자 뱃지를 보면 무슨 감정인지 바로 알 수 있어요.',
    reading: [
      { part: '모자 뱃지와 옷 색', meaning: '주감정이에요.' },
      { part: '모자 종류', meaning: '감정 그룹이에요. 왕관, 리본, 수면모자, 챙모자, 불꽃, 안테나 6종이에요.' },
      { part: '모자 장식 크기', meaning: '주감정의 크기예요.' },
      { part: '색 농도와 주변 기호', meaning: '강도예요.' },
      { part: '옆에 떠다니는 구름', meaning: '보조감정이에요. 구름 속 기호가 감정이고, 점수가 높을수록 커요.' },
    ],
  },
  {
    id: 'costume', name: '감정 인형탈', kind: '사람형', render: renderCostumePerson,
    summary: '사람이 감정 인형탈을 입었어요. 배의 뱃지가 감정을 알려주고, 작은 친구가 함께 다녀요.',
    reading: [
      { part: '배 뱃지와 탈 색', meaning: '주감정이에요.' },
      { part: '귀 모양', meaning: '감정 그룹이에요.' },
      { part: '귀 길이', meaning: '강도예요.' },
      { part: '탈의 폭', meaning: '주감정의 크기예요.' },
      { part: '색 농도와 주변 기호', meaning: '강도예요.' },
      { part: '작은 친구', meaning: '보조감정이에요. 점수가 낮으면 발치, 중간이면 어깨 옆, 높으면 머리 위에 있어요.' },
    ],
  },
]

const LEVELS = [{ score: 10, label: '아주 약함' }, { score: 30, label: '약함' }, { score: 50, label: '보통' }, { score: 70, label: '강함' }, { score: 95, label: '매우 강함' }]
const SECONDARY_SIZES = [{ score: 20, label: '보조 20' }, { score: 50, label: '보조 50' }, { score: 85, label: '보조 85' }]
const PAIRINGS: Array<[EmotionKey, EmotionKey]> = [['joy', 'sadness'], ['anger', 'fatigue'], ['excitement', 'anxiety'], ['calm', 'loneliness']]
const SHAPES = Object.keys(SHAPE_LABELS) as BodyShape[]
const CAST: ConceptSpec[] = [
  { primary: { key: 'joy', score: 90 }, secondary: null },
  { primary: { key: 'sadness', score: 70 }, secondary: { key: 'fatigue', score: 50 } },
  { primary: { key: 'anger', score: 95 }, secondary: { key: 'anxiety', score: 80 } },
  { primary: { key: 'calm', score: 15 }, secondary: null },
  { primary: { key: 'excitement', score: 50 }, secondary: { key: 'shyness', score: 25 } },
  { primary: { key: 'loneliness', score: 30 }, secondary: { key: 'sadness', score: 40 } },
]

function useTick(ms: number) {
  const [tick, setTick] = useState(1)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((current) => current + 1), ms)
    return () => window.clearInterval(timer)
  }, [ms])
  return tick
}

function Sprite({ grid, label, scale, flip = false }: { grid: Grid; label: string; scale: number; flip?: boolean }) {
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
  return <canvas aria-label={label} height={SIZE} ref={ref} role="img" style={{ width: SIZE * scale, height: 'auto', aspectRatio: '1', imageRendering: 'pixelated', maxWidth: '100%', transform: flip ? 'scaleX(-1)' : undefined }} width={SIZE} />
}

function Cell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-[#f6f1ff] p-1.5 text-center">
      {children}
      <span className="text-[11px] font-bold leading-tight text-slate-600">{label}</span>
    </div>
  )
}

interface Walker { x: number; dir: 1 | -1; pause: number }

/** A small room where everyone shares one walk cycle, whatever their emotion or strength. */
function WalkingRoom({ concept }: { concept: Concept }) {
  const tick = useTick(170)
  const [walkers, setWalkers] = useState<Walker[]>(() => CAST.map((_, i) => ({ x: 6 + i * 16, dir: i % 2 ? -1 : 1, pause: 0 })))
  useEffect(() => {
    setWalkers((current) => current.map((walker) => {
      if (walker.pause > 0) return { ...walker, pause: walker.pause - 1 }
      const next = walker.x + walker.dir * 0.8
      const turn = next < 2 || next > 86
      if (!turn && Math.random() > 0.015) return { ...walker, x: next }
      return { x: Math.min(86, Math.max(2, walker.x)), dir: turn || Math.random() < 0.5 ? (walker.dir === 1 ? -1 : 1) : walker.dir, pause: 6 + Math.floor(Math.random() * 12) }
    }))
  }, [tick])
  return (
    <div aria-label={`${concept.name} 걷기 미리보기`} className="relative h-44 overflow-hidden rounded-2xl" role="img" style={{ background: 'linear-gradient(#f4e3d3 0 42%, #8a6a52 42% 44%, #d9ae85 44% 100%)' }}>
      {CAST.map((spec, i) => {
        const walker = walkers[i]
        return (
          <div className="absolute" key={spec.primary.key} style={{ left: `${walker.x}%`, bottom: `${6 + (i % 3) * 13}%`, zIndex: 10 - (i % 3) }}>
            <Sprite flip={walker.dir === -1} grid={concept.render(spec, tick + i, walker.pause === 0)} label="" scale={1.75} />
          </div>
        )
      })}
    </div>
  )
}

function LivePreview({ concept, spec }: { concept: Concept; spec: ConceptSpec }) {
  const tick = useTick(220)
  return <Sprite grid={concept.render(spec, tick, true)} label={`${concept.name} 미리보기`} scale={6} />
}

function SymbolIcon({ emotion }: { emotion: EmotionKey }) {
  const color = darken(COLORS[emotion], 0.08)
  return (
    <svg aria-hidden="true" height="20" shapeRendering="crispEdges" viewBox="0 0 5 5" width="20">
      {SYMBOLS[emotion].flatMap((row, y) => [...row].map((ch, x) => (ch === '#' ? <rect fill={color} height="1" key={`${x}-${y}`} width="1" x={x} y={y} /> : null)))}
    </svg>
  )
}

export function WalkerDemoPage() {
  const [primary, setPrimary] = useState<EmotionKey>('joy')
  const [primaryScore, setPrimaryScore] = useState(70)
  const [secondary, setSecondary] = useState<EmotionKey | ''>('sadness')
  const [secondaryScore, setSecondaryScore] = useState(50)
  const liveSpec: ConceptSpec = {
    primary: { key: primary, score: primaryScore },
    secondary: secondary ? { key: secondary, score: secondaryScore } : null,
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-3 py-6 text-[#31243c] sm:px-4">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-violet-700">MOZI CHARACTER CONCEPTS · 2차</p>
            <h1 className="mt-1 text-3xl font-black">걸어 다니는 캐릭터 시안</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">모든 캐릭터가 같은 걸음걸이로 움직여요. 감정별 표정도 고정이라, 강도가 달라져도 방에서 자연스럽게 돌아다닐 수 있어요.</p>
          </div>
          <Link className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-700" to="/prototype/characters/concepts">1차 시안 보기</Link>
        </div>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">공통 규칙</h2>
          <ul className="mt-2 grid gap-1 text-sm leading-relaxed">
            <li><b>자세와 표정</b>은 강도와 상관없이 고정돼요.</li>
            <li><b>강도</b>는 색 농도, 몸에 붙은 장식의 크기, 주변 기호 개수로 보여줘요.</li>
            <li><b>기호</b>는 감정마다 하나씩 정해져 있어서, 한 번 익히면 어떤 캐릭터든 읽을 수 있어요.</li>
          </ul>
          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {EMOTION_KEYS.map((key) => <div className="flex items-center gap-1.5 rounded-lg bg-[#f6f1ff] p-1.5 text-xs font-bold" key={key}><SymbolIcon emotion={key} />{EMOTION_LABELS[key]}</div>)}
          </div>
        </section>

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
                <p className="text-xs font-bold text-violet-700">시안 {index + 1} · {concept.kind}</p>
                <h2 className="mt-1 text-xl font-black">{concept.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{concept.summary}</p>
                <div className="mt-3 flex justify-center rounded-2xl bg-[#f6f1ff] p-3"><LivePreview concept={concept} spec={liveSpec} /></div>
                <h3 className="mt-3 text-sm font-black text-violet-700">어디를 보면 될까요</h3>
                <dl className="mt-1 grid gap-1.5 text-sm leading-relaxed">
                  {concept.reading.map((item) => <div key={item.part}><dt className="inline font-bold">{item.part}: </dt><dd className="inline">{item.meaning}</dd></div>)}
                </dl>
              </div>
              <div className="min-w-0 space-y-4">
                <section>
                  <h3 className="text-sm font-black">방에서 걷는 모습</h3>
                  <div className="mt-2"><WalkingRoom concept={concept} /></div>
                </section>
                <section>
                  <h3 className="text-sm font-black">강도 5단계</h3>
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {LEVELS.map((level) => <Cell key={level.score} label={level.label}><Sprite grid={concept.render({ primary: { key: primary, score: level.score }, secondary: null }, 2, false)} label={`${concept.name} ${level.label}`} scale={2.5} /></Cell>)}
                  </div>
                </section>
                {concept.id === 'shape' && (
                  <section>
                    <h3 className="text-sm font-black">몸 형태 10가지</h3>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      {SHAPES.map((shape) => <Cell key={shape} label={SHAPE_LABELS[shape]}><Sprite grid={renderShapeFriend({ primary: { key: primary, score: 75 }, secondary: null }, 2, false, shape)} label={SHAPE_LABELS[shape]} scale={2.5} /></Cell>)}
                    </div>
                  </section>
                )}
                <section>
                  <h3 className="text-sm font-black">보조감정 크기 3단계</h3>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {SECONDARY_SIZES.map((item) => <Cell key={item.score} label={item.label}><Sprite grid={concept.render({ primary: { key: primary, score: 70 }, secondary: { key: secondary || 'sadness', score: item.score } }, 2, false)} label={`${concept.name} ${item.label}`} scale={2.5} /></Cell>)}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-black">감정 조합</h3>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {PAIRINGS.map(([main, sub]) => <Cell key={main} label={`${EMOTION_LABELS[main]} + ${EMOTION_LABELS[sub]}`}><Sprite grid={concept.render({ primary: { key: main, score: 75 }, secondary: { key: sub, score: 55 } }, 2, false)} label={`${concept.name} ${EMOTION_LABELS[main]} ${EMOTION_LABELS[sub]}`} scale={2.5} /></Cell>)}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-black">16가지 주감정</h3>
                  <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                    {EMOTION_KEYS.map((key) => <Cell key={key} label={EMOTION_LABELS[key]}><Sprite grid={concept.render({ primary: { key, score: 75 }, secondary: null }, 2, false)} label={`${concept.name} ${EMOTION_LABELS[key]}`} scale={1.75} /></Cell>)}
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
