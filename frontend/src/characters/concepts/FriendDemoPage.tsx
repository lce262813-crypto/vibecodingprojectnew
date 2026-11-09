import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { EMOTION_KEYS, EMOTION_LABELS, type EmotionKey } from '../pixel/palette'
import { ACCESSORIES, renderFriend, type Accessory } from './friends'
import { SIZE, type ConceptSpec, type Grid } from './kit'
import { SHAPE_LABELS, type BodyShape } from './walkers'

type SecondaryLook = Accessory | 'dye'

const ACCESSORY_INFO: Record<SecondaryLook, { name: string; how: string; good: string }> = {
  dye: { name: '몸 물들기', how: '보조감정 색이 몸 아래에서 차올라요. 높이 올라올수록 점수가 높아요.', good: '소품이 없어서 표정이 가장 깔끔하고, 두 감정이 섞인 느낌이 나요.' },
  balloon: { name: '풍선', how: '손에 쥐고 다녀요. 점수가 높을수록 풍선이 커져요.', good: '몸을 가리지 않아 어떤 몸 형태에도 어울려요. 대신 차지하는 자리가 넓어요.' },
  hat: { name: '작은 모자', how: '머리에 얹어요. 점수가 높을수록 모자가 커져요.', good: '기호가 잘 보이고 가장 눈에 띄어요. 대신 귀나 가시 같은 특징을 일부 가릴 수 있어요.' },
  pin: { name: '꽃핀', how: '머리 옆에 달아요. 점수가 높을수록 꽃이 커져요.', good: '가장 작고 귀엽고 표정을 가리지 않아요. 대신 기호 없이 색으로만 구분해요.' },
  badge: { name: '배지', how: '몸 아래쪽에 달아요. 점수가 높을수록 배지가 커져요.', good: '몸 안에 있어서 깔끔하고 기호가 보여요. 대신 작은 크기에서는 잘 안 보일 수 있어요.' },
  bag: { name: '가방', how: '옆구리에 메요. 점수가 높을수록 가방이 커져요.', good: '보조감정을 "지니고 다닌다"는 뜻이 자연스러워요. 대신 팔 한쪽을 가려요.' },
}

const LEVELS = [{ score: 10, label: '아주 약함' }, { score: 30, label: '약함' }, { score: 50, label: '보통' }, { score: 70, label: '강함' }, { score: 95, label: '매우 강함' }]
const SECOND_SIZES = [{ score: 20, label: '보조 20' }, { score: 50, label: '보조 50' }, { score: 85, label: '보조 85' }]
const SHAPES = Object.keys(SHAPE_LABELS) as BodyShape[]
const CAST: ConceptSpec[] = [
  { primary: { key: 'joy', score: 90 }, secondary: { key: 'calm', score: 40 } },
  { primary: { key: 'sadness', score: 70 }, secondary: { key: 'fatigue', score: 50 } },
  { primary: { key: 'anger', score: 95 }, secondary: { key: 'anxiety', score: 80 } },
  { primary: { key: 'calm', score: 15 }, secondary: null },
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

function WalkingRoom({ accessory, soft }: { accessory: SecondaryLook; soft: boolean }) {
  const tick = useTick(170)
  const [walkers, setWalkers] = useState(() => CAST.map((_, i) => ({ x: 4 + i * 19, dir: (i % 2 ? -1 : 1) as 1 | -1, pause: 0 })))
  useEffect(() => {
    setWalkers((current) => current.map((walker) => {
      if (walker.pause > 0) return { ...walker, pause: walker.pause - 1 }
      const next = walker.x + walker.dir * 0.7
      const turn = next < 1 || next > 84
      if (!turn && Math.random() > 0.015) return { ...walker, x: next }
      return { x: Math.min(84, Math.max(1, walker.x)), dir: (turn || Math.random() < 0.5 ? -walker.dir : walker.dir) as 1 | -1, pause: 6 + Math.floor(Math.random() * 12) }
    }))
  }, [tick])
  return (
    <div aria-label="방에서 걷는 모습" className="relative h-48 overflow-hidden rounded-2xl" role="img" style={{ background: 'linear-gradient(#f4e3d3 0 38%, #8a6a52 38% 40%, #d9ae85 40% 100%)' }}>
      {CAST.map((spec, i) => {
        const walker = walkers[i]
        return (
          <div className="absolute" key={spec.primary.key} style={{ left: `${walker.x}%`, bottom: `${4 + (i % 2) * 14}%`, zIndex: 10 - (i % 2) }}>
            <Sprite flip={walker.dir === -1} grid={renderFriend(spec, { tick: tick + i, walking: walker.pause === 0, accessory, soft })} label="" scale={2} />
          </div>
        )
      })}
    </div>
  )
}

function LivePreview({ spec, accessory, soft }: { spec: ConceptSpec; accessory: SecondaryLook; soft: boolean }) {
  const tick = useTick(220)
  return <Sprite grid={renderFriend(spec, { tick, accessory, soft })} label="캐릭터 미리보기" scale={6} />
}

export function FriendDemoPage({ soft = false }: { soft?: boolean }) {
  const [primary, setPrimary] = useState<EmotionKey>('joy')
  const [primaryScore, setPrimaryScore] = useState(70)
  const [secondary, setSecondary] = useState<EmotionKey | ''>('sadness')
  const [secondaryScore, setSecondaryScore] = useState(50)
  const [accessory, setAccessory] = useState<SecondaryLook>('balloon')
  const looks: SecondaryLook[] = soft ? ['balloon'] : ACCESSORIES
  const describe = (item: SecondaryLook) => (soft ? { name: '풍선', how: '점수가 높을수록 풍선이 1개, 2개, 3개로 늘어나요.', good: '풍선 크기는 같고 개수만 달라져요. 풍선 속 기호로 어떤 감정인지 알 수 있어요.' } : ACCESSORY_INFO[item])
  const liveSpec: ConceptSpec = {
    primary: { key: primary, score: primaryScore },
    secondary: secondary ? { key: secondary, score: secondaryScore } : null,
  }
  const second = secondary || 'sadness'

  return (
    <main className="min-h-screen bg-[#fffaf2] px-3 py-6 text-[#31243c] sm:px-4">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-violet-700">MOZI CHARACTER CONCEPTS · {soft ? '5차' : '3차'}</p>
            <h1 className="mt-1 text-3xl font-black">{soft ? '몸 형태 친구 색 다듬기' : '몸 형태 친구'}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{soft ? '3차의 얼굴과 형태는 그대로 두고 색과 음영만 다듬었어요. 보조감정은 풍선 개수로 보여줘요.' : '처음 슬라임의 표정을 다시 넣었어요. 자세는 고정이라 어떤 감정이든 같은 걸음으로 돌아다녀요. 표정은 강도에 따라 바뀌고, 보조감정은 소품으로 보여줘요.'}</p>
          </div>
          <Link className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-700" to={soft ? '/prototype/characters/friends' : '/prototype/characters/walkers'}>{soft ? '3차 시안 보기' : '2차 시안 보기'}</Link>
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
          {!soft && <div className="flex flex-wrap gap-1.5 sm:col-span-2" role="group" aria-label="보조감정 소품">
            {looks.map((item) => (
              <button aria-pressed={accessory === item} className={`rounded-full border px-3 py-1.5 text-sm font-bold ${accessory === item ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-200 bg-white text-violet-700'}`} key={item} onClick={() => setAccessory(item)} type="button">{ACCESSORY_INFO[item].name}</button>
            ))}
          </div>}
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div>
              <h2 className="text-xl font-black">지금 고른 조합</h2>
              <div className="mt-3 flex justify-center rounded-2xl bg-[#f6f1ff] p-3"><LivePreview accessory={accessory} soft={soft} spec={liveSpec} /></div>
              <p className="mt-3 text-sm leading-relaxed"><b>{describe(accessory).name}:</b> {describe(accessory).how}</p>
            </div>
            <div className="min-w-0 space-y-4">
              <section>
                <h3 className="text-sm font-black">방에서 걷는 모습</h3>
                <div className="mt-2"><WalkingRoom accessory={accessory} soft={soft} /></div>
              </section>
              <section>
                <h3 className="text-sm font-black">강도 5단계</h3>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {LEVELS.map((level) => <Cell key={level.score} label={level.label}><Sprite grid={renderFriend({ primary: { key: primary, score: level.score }, secondary: null }, { soft, tick: 2, walking: false })} label={level.label} scale={2.5} /></Cell>)}
                </div>
              </section>
              <section>
                <h3 className="text-sm font-black">몸 형태 10가지</h3>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {SHAPES.map((shape) => <Cell key={shape} label={SHAPE_LABELS[shape]}><Sprite grid={renderFriend({ primary: { key: primary, score: 75 }, secondary: null }, { soft, tick: 2, walking: false, shape })} label={SHAPE_LABELS[shape]} scale={2.5} /></Cell>)}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black">3차와 색 비교</h2>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <Cell label="3차"><Sprite grid={renderFriend({ primary: { key: primary, score: 80 }, secondary: null }, { tick: 2, walking: false })} label="3차 캐릭터" scale={4} /></Cell>
              <Cell label="5차"><Sprite grid={renderFriend({ primary: { key: primary, score: 80 }, secondary: null }, { soft: true, tick: 2, walking: false })} label="5차 캐릭터" scale={4} /></Cell>
            </div>
          </section>
        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">{soft ? '보조감정 풍선' : '보조감정 소품 비교'}</h2>
          <p className="mt-1 text-sm text-slate-600">{EMOTION_LABELS[primary]} 캐릭터에 {EMOTION_LABELS[second]}을 보조감정으로 넣은 모습이에요.</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {looks.map((item) => (
              <article className="rounded-2xl border border-violet-100 p-3" key={item}>
                <h3 className="font-black">{describe(item).name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{describe(item).good}</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {SECOND_SIZES.map((size) => <Cell key={size.score} label={size.label}><Sprite grid={renderFriend({ primary: { key: primary, score: 70 }, secondary: { key: second, score: size.score } }, { soft, tick: 2, walking: false, accessory: item })} label={`${describe(item).name} ${size.label}`} scale={2.5} /></Cell>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black">표정 전체 보기</h2>
          <p className="mt-1 text-sm text-slate-600">처음 슬라임에 정해 둔 16가지 감정의 5단계 표정이에요.</p>
          <div className="mt-3 grid gap-1.5">
            <div className="grid grid-cols-[3.2rem_repeat(5,minmax(0,1fr))] gap-1.5 text-center text-[11px] font-bold text-slate-600">
              <span />{LEVELS.map((level) => <span key={level.score}>{level.label}</span>)}
            </div>
            {EMOTION_KEYS.map((key) => (
              <div className="grid grid-cols-[3.2rem_repeat(5,minmax(0,1fr))] items-center gap-1.5" key={key}>
                <span className="text-xs font-black">{EMOTION_LABELS[key]}</span>
                {LEVELS.map((level) => <div className="flex justify-center rounded-lg bg-[#f6f1ff] p-1" key={level.score}><Sprite grid={renderFriend({ primary: { key, score: level.score }, secondary: null }, { soft, tick: 2, walking: false })} label={`${EMOTION_LABELS[key]} ${level.label}`} scale={soft ? 3 : 2.25} /></div>)}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
