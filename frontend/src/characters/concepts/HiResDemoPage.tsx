import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { EMOTION_KEYS, EMOTION_LABELS, type EmotionKey } from '../pixel/palette'
import { renderFriend } from './friends'
import { HI_SIZE, SECONDARY_MODES, renderHiFriend, type HiGrid, type SecondaryMode } from './hires'
import type { ConceptSpec } from './kit'
import { SHAPE_LABELS, type BodyShape } from './walkers'

const MODE_INFO: Record<SecondaryMode, { name: string; how: string; note: string }> = {
  dye: { name: '몸 물들기', how: '보조감정 색이 몸 아래에서 차올라요. 높이 올라올수록 점수가 높아요.', note: '소품이 없어서 표정과 몸이 가장 깔끔하고, 두 감정이 정말 섞인 느낌이 나요.' },
  spots: { name: '몸 무늬', how: '보조감정 색 점무늬가 2개, 4개, 7개로 늘어나요.', note: '캐릭터마다 개성이 생겨요. 대신 점수를 세밀하게 읽기는 어려워요.' },
  balloons: { name: '풍선 개수', how: '풍선이 1개, 2개, 3개로 늘어나요.', note: '기호로 감정을 바로 읽을 수 있어요. 대신 자리를 가장 많이 차지해요.' },
  bloom: { name: '꽃 피우기', how: '머리의 꽃이 봉오리, 반쯤 핀 꽃, 활짝 핀 꽃으로 바뀌어요.', note: '크기보다 변화 단계가 눈에 띄어요. 도감에 모으는 재미가 있어요.' },
  buddy: { name: '작은 친구 위치', how: '작은 친구가 발치, 어깨 옆, 머리 위로 올라와요.', note: '위치만 보면 점수를 알 수 있고 귀여워요. 대신 그려야 할 요소가 하나 늘어요.' },
}

const LEVELS = [{ score: 10, label: '아주 약함' }, { score: 30, label: '약함' }, { score: 50, label: '보통' }, { score: 70, label: '강함' }, { score: 95, label: '매우 강함' }]
const SECOND_SIZES = [{ score: 20, label: '보조 20' }, { score: 50, label: '보조 50' }, { score: 85, label: '보조 85' }]
const SHAPES = Object.keys(SHAPE_LABELS) as BodyShape[]
const CAST: ConceptSpec[] = [
  { primary: { key: 'joy', score: 90 }, secondary: { key: 'calm', score: 40 } },
  { primary: { key: 'sadness', score: 70 }, secondary: { key: 'fatigue', score: 50 } },
  { primary: { key: 'anger', score: 95 }, secondary: { key: 'anxiety', score: 80 } },
  { primary: { key: 'excitement', score: 50 }, secondary: { key: 'shyness', score: 25 } },
]

function useTick(ms: number) {
  const [tick, setTick] = useState(1)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((current) => current + 1), ms)
    return () => window.clearInterval(timer)
  }, [ms])
  return tick
}

function Sprite({ grid, label, width, size = HI_SIZE, flip = false }: { grid: HiGrid; label: string; width: number; size?: number; flip?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    grid.px.forEach((color, i) => {
      if (!color) return
      ctx.fillStyle = color
      ctx.fillRect(i % size, Math.floor(i / size), 1, 1)
    })
  }, [grid, size])
  return <canvas aria-label={label} height={size} ref={ref} role="img" style={{ width, height: 'auto', aspectRatio: '1', imageRendering: 'pixelated', maxWidth: '100%', transform: flip ? 'scaleX(-1)' : undefined }} width={size} />
}

function Cell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-[#f6f1ff] p-1.5 text-center">
      {children}
      <span className="text-[11px] font-bold leading-tight text-slate-600">{label}</span>
    </div>
  )
}

function WalkingRoom({ mode }: { mode: SecondaryMode }) {
  const tick = useTick(170)
  // Whole-number scales keep every pixel square: 1× on phones, 2× on wider screens.
  const spriteWidth = window.innerWidth < 640 ? 80 : 160
  const [walkers, setWalkers] = useState(() => CAST.map((_, i) => ({ x: 3 + i * 23, dir: (i % 2 ? -1 : 1) as 1 | -1, pause: 0 })))
  useEffect(() => {
    setWalkers((current) => current.map((walker) => {
      if (walker.pause > 0) return { ...walker, pause: walker.pause - 1 }
      const next = walker.x + walker.dir * 0.6
      const turn = next < 0 || next > 78
      if (!turn && Math.random() > 0.015) return { ...walker, x: next }
      return { x: Math.min(78, Math.max(0, walker.x)), dir: (turn || Math.random() < 0.5 ? -walker.dir : walker.dir) as 1 | -1, pause: 6 + Math.floor(Math.random() * 12) }
    }))
  }, [tick])
  return (
    <div aria-label="방에서 걷는 모습" className="relative h-40 overflow-hidden rounded-2xl sm:h-64" role="img" style={{ background: 'linear-gradient(#f4e3d3 0 38%, #8a6a52 38% 40%, #d9ae85 40% 100%)' }}>
      {CAST.map((spec, i) => {
        const walker = walkers[i]
        return (
          <div className="absolute" key={spec.primary.key} style={{ left: `${walker.x}%`, bottom: `${2 + (i % 2) * 12}%`, zIndex: 10 - (i % 2) }}>
            <Sprite flip={walker.dir === -1} grid={renderHiFriend(spec, { tick: tick + i, walking: walker.pause === 0, mode })} label="" width={spriteWidth} />
          </div>
        )
      })}
    </div>
  )
}

function LivePreview({ spec, mode }: { spec: ConceptSpec; mode: SecondaryMode }) {
  const tick = useTick(220)
  return <Sprite grid={renderHiFriend(spec, { tick, mode })} label="캐릭터 미리보기" width={240} />
}

export function HiResDemoPage() {
  const [primary, setPrimary] = useState<EmotionKey>('joy')
  const [primaryScore, setPrimaryScore] = useState(70)
  const [secondary, setSecondary] = useState<EmotionKey | ''>('sadness')
  const [secondaryScore, setSecondaryScore] = useState(50)
  const [mode, setMode] = useState<SecondaryMode>('dye')
  const liveSpec: ConceptSpec = {
    primary: { key: primary, score: primaryScore },
    secondary: secondary ? { key: secondary, score: secondaryScore } : null,
  }
  const second = secondary || 'sadness'
  const before: ConceptSpec = { primary: { key: primary, score: 80 }, secondary: null }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-3 py-6 text-[#31243c] sm:px-4">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-violet-700">MOZI CHARACTER CONCEPTS · 4차</p>
            <h1 className="mt-1 text-3xl font-black">몸 형태 친구 고해상도</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">픽셀을 2배로 잘게 나누고, 표정과 입체 음영을 새로 그렸어요. 보조감정은 소품 크기 대신 다섯 가지 방식으로 비교할 수 있어요.</p>
          </div>
          <Link className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-700" to="/prototype/characters/friends">3차 시안 보기</Link>
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
          <div aria-label="보조감정 표현 방식" className="flex flex-wrap gap-1.5 sm:col-span-2" role="group">
            {SECONDARY_MODES.map((item) => (
              <button aria-pressed={mode === item} className={`rounded-full border px-3 py-1.5 text-sm font-bold ${mode === item ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-200 bg-white text-violet-700'}`} key={item} onClick={() => setMode(item)} type="button">{MODE_INFO[item].name}</button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div>
              <h2 className="text-xl font-black">지금 고른 조합</h2>
              <div className="mt-3 flex justify-center rounded-2xl bg-[#f6f1ff] p-2"><LivePreview mode={mode} spec={liveSpec} /></div>
              <p className="mt-3 text-sm leading-relaxed"><b>{MODE_INFO[mode].name}:</b> {MODE_INFO[mode].how}</p>
            </div>
            <div className="min-w-0 space-y-4">
              <section>
                <h3 className="text-sm font-black">방에서 걷는 모습</h3>
                <div className="mt-2"><WalkingRoom mode={mode} /></div>
              </section>
              <section>
                <h3 className="text-sm font-black">3차와 비교</h3>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <Cell label="3차 (40칸)"><Sprite grid={renderFriend(before, { tick: 2, walking: false })} label="3차 캐릭터" size={40} width={160} /></Cell>
                  <Cell label="4차 (80칸)"><Sprite grid={renderHiFriend(before, { tick: 2, walking: false })} label="4차 캐릭터" width={160} /></Cell>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">강도 5단계</h2>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {LEVELS.map((level) => <Cell key={level.score} label={level.label}><Sprite grid={renderHiFriend({ primary: { key: primary, score: level.score }, secondary: null }, { tick: 2, walking: false })} label={level.label} width={160} /></Cell>)}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">보조감정 표현 방식 비교</h2>
          <p className="mt-1 text-sm text-slate-600">{EMOTION_LABELS[primary]} 캐릭터에 {EMOTION_LABELS[second]}을 보조감정으로 넣은 모습이에요.</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {SECONDARY_MODES.map((item) => (
              <article className="rounded-2xl border border-violet-100 p-3" key={item}>
                <h3 className="font-black">{MODE_INFO[item].name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{MODE_INFO[item].how} {MODE_INFO[item].note}</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {SECOND_SIZES.map((size) => <Cell key={size.score} label={size.label}><Sprite grid={renderHiFriend({ primary: { key: primary, score: 70 }, secondary: { key: second, score: size.score } }, { tick: 2, walking: false, mode: item })} label={`${MODE_INFO[item].name} ${size.label}`} width={160} /></Cell>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">몸 형태 10가지</h2>
          <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {SHAPES.map((shape) => <Cell key={shape} label={SHAPE_LABELS[shape]}><Sprite grid={renderHiFriend({ primary: { key: primary, score: 75 }, secondary: null }, { tick: 2, walking: false, shape })} label={SHAPE_LABELS[shape]} width={160} /></Cell>)}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">표정 전체 보기</h2>
          <p className="mt-1 text-sm text-slate-600">16가지 감정의 5단계 표정을 새로 그렸어요.</p>
          <div className="mt-3 grid gap-1.5">
            <div className="grid grid-cols-[3.2rem_repeat(5,minmax(0,1fr))] gap-1.5 text-center text-[11px] font-bold text-slate-600">
              <span />{LEVELS.map((level) => <span key={level.score}>{level.label}</span>)}
            </div>
            {EMOTION_KEYS.map((key) => (
              <div className="grid grid-cols-[3.2rem_repeat(5,minmax(0,1fr))] items-center gap-1.5" key={key}>
                <span className="text-xs font-black">{EMOTION_LABELS[key]}</span>
                {LEVELS.map((level) => <div className="flex justify-center rounded-lg bg-[#f6f1ff] p-1" key={level.score}><Sprite grid={renderHiFriend({ primary: { key, score: level.score }, secondary: null }, { tick: 2, walking: false })} label={`${EMOTION_LABELS[key]} ${level.label}`} width={160} /></div>)}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
