import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  DECORATION_LABELS,
  EFFECT_IDS,
  EFFECT_LABELS,
  type DecorationId,
  type EffectId,
} from '../pixel/decorations'
import { EMOTION_COLOR_SEEDS, EMOTION_KEYS, EMOTION_LABELS, type EmotionKey } from '../pixel/palette'
import { downloadCharacterPng } from '../pixel/canvasExport'
import { PixelCharacterCanvas } from '../pixel/PixelCharacterCanvas'
import { renderCharacter, type CharacterSpec, type RenderedCharacter } from '../pixel/renderCharacter'
import { SILHOUETTES, SILHOUETTE_IDS, analyzeMask, type SilhouetteId } from '../pixel/silhouettes'

interface DemoCase { title: string; spec: CharacterSpec }

const GROUP_SILHOUETTE_CASES: DemoCase[] = [
  { title: '행복·성취 · 동글형', spec: { primary: { key: 'joy', score: 60 }, silhouette: 'round', seed: 601, features: { decoration: null, effect: null } } },
  { title: '두근거림·자의식 · 하트봉우리형', spec: { primary: { key: 'excitement', score: 60 }, silhouette: 'heart', seed: 602, features: { decoration: null, effect: null } } },
  { title: '안정·저활력 · 납작형', spec: { primary: { key: 'calm', score: 60 }, silhouette: 'flat', seed: 603, features: { decoration: null, effect: null } } },
  { title: '상실·침체 · 물결형', spec: { primary: { key: 'sadness', score: 60 }, silhouette: 'wave', seed: 604, features: { decoration: null, effect: null } } },
  { title: '분노·불쾌 · 뾰족형', spec: { primary: { key: 'anger', score: 60 }, silhouette: 'spiky', seed: 605, features: { decoration: null, effect: null } } },
  { title: '긴장·인지적 혼란 · 물방울형', spec: { primary: { key: 'anxiety', score: 60 }, silhouette: 'drop', seed: 606, features: { decoration: null, effect: null } } },
]

const LEVEL_NAMES = ['아주 약함', '약함', '보통', '강함', '매우 강함']

const EMOTION_OVERVIEW_CASES: DemoCase[] = EMOTION_KEYS.map((key) => ({
  title: EMOTION_LABELS[key],
  spec: {
    primary: { key, score: 50 },
    seed: EMOTION_COLOR_SEEDS[key].seed,
    features: { decoration: null, effect: null },
  },
}))

const INTENSITY_CASES: DemoCase[] = EMOTION_KEYS.flatMap((key) =>
  [10, 30, 50, 70, 90].map((score, level) => ({
    title: `${EMOTION_LABELS[key]} ${LEVEL_NAMES[level]}`,
    spec: { primary: { key, score }, seed: EMOTION_COLOR_SEEDS[key].seed },
  })),
)

const MIX_PAIRS: Array<[EmotionKey, EmotionKey]> = [['joy', 'sadness'], ['anger', 'fatigue']]
const MIX_CASES: DemoCase[] = MIX_PAIRS.flatMap(([primary, secondary], index) =>
  [[90, 10], [70, 30], [55, 45]].map(([p, s]) => ({
    title: `${EMOTION_LABELS[primary]} ${p} : ${EMOTION_LABELS[secondary]} ${s}`,
    spec: { primary: { key: primary, score: p }, secondary: { key: secondary, score: s }, seed: 200 + index },
  })),
)

const KEYWORD_CASES: DemoCase[] = [
  ['카페에서 라떼', 'coffee'], ['버블티 한 잔', 'drink'], ['친구들과 건배', 'beer'],
  ['오늘 회사에서 회의', 'briefcase'], ['시험 공부', 'book'], ['일기에 메모하기', 'pencil'],
  ['새 앨범 음악', 'headphones'], ['벚꽃 산책', 'flower'], ['친구가 고마웠다', 'heart'],
  ['게임에서 레벨업', 'gamepad'], ['대회에서 우승', 'medal'], ['운동하고 달리기', 'sneaker'],
  ['공항에서 여행', 'bag'], ['예쁜 풍경 사진', 'camera'], ['영화 티켓 예매', 'ticket'],
  ['비 오는 날 우산', 'umbrella'], ['푹 자고 싶다', 'sleepCap'], ['생일 케이크', 'cake'],
  ['깜짝 선물', 'gift'], ['친구와 통화', 'phone'], ['감기약을 먹었다', 'medicine'],
  ['고양이와 놀았다', 'paw'], ['맛있는 저녁 식사', 'meal'], ['수채화 그림', 'paintbrush'],
  ['페퍼로니 피자', 'pizza'], ['수제 햄버거', 'burger'], ['친구와 치킨', 'chicken'],
  ['회전초밥', 'sushi'], ['달콤한 딸기', 'fruit'], ['젤라또 아이스크림', 'icecream'],
  ['와인 한 잔', 'wine'], ['하이볼 칵테일', 'cocktail'], ['새집 열쇠', 'key'],
  ['손편지를 받았다', 'letter'], ['노트북으로 코딩', 'laptop'], ['주말 쇼핑', 'shopping'],
  ['화분 분갈이', 'plant'], ['바닷가에서 조개', 'beach'], ['집들이한 날', 'house'], ['월급날 저축', 'money'],
].map(([title, decoration], index) => ({
  title: `“${title}”`,
  spec: {
    primary: { key: index % 3 === 0 ? 'calm' : index % 3 === 1 ? 'joy' : 'excitement', score: 62 + (index % 3) * 8 },
    keywords: [title],
    seed: 301 + index,
    features: { decoration: decoration as DecorationId, effect: null },
  },
}))

const FEATURE_CASES: DemoCase[] = [
  { title: '기존 기준 · 표정만', spec: { primary: { key: 'joy', score: 60 }, seed: 410, features: { decoration: null, effect: null } } },
  { title: '개선형 · 자동 선택', spec: { primary: { key: 'joy', score: 60 }, keywords: ['카페'], seed: 410 } },
  { title: '심플형', spec: { primary: { key: 'calm', score: 35 }, seed: 411, features: { decoration: null, effect: null } } },
  { title: '표정 강조형', spec: { primary: { key: 'excitement', score: 70 }, seed: 412, features: { decoration: null, effect: null } } },
  { title: '고양이 귀만', spec: { primary: { key: 'joy', score: 55 }, seed: 421, features: { animalFeature: 'cat_ears', decoration: null, effect: null } } },
  { title: '곰 귀만', spec: { primary: { key: 'calm', score: 55 }, seed: 422, features: { animalFeature: 'bear_ears', decoration: null, effect: null } } },
  { title: '소품만', spec: { primary: { key: 'fatigue', score: 70 }, keywords: ['커피'], seed: 413, features: { decoration: 'coffee', effect: null } } },
  { title: '이펙트만', spec: { primary: { key: 'confusion', score: 75 }, seed: 414, features: { decoration: null, effect: 'question' } } },
  { title: '머리 착용 소품', spec: { primary: { key: 'calm', score: 70 }, keywords: ['꽃'], seed: 415, features: { decoration: 'flower', effect: null } } },
  { title: '분노 이펙트', spec: { primary: { key: 'anger', score: 85 }, seed: 416, features: { decoration: null, effect: 'anger' } } },
  { title: '소품 + 이펙트', spec: { primary: { key: 'anxiety', score: 75 }, keywords: ['우산'], seed: 417, features: { decoration: 'umbrella', effect: 'sweat' } } },
  { title: '보조 감정 + 손 소품 + 이펙트', spec: { primary: { key: 'joy', score: 90 }, secondary: { key: 'excitement', score: 35 }, keywords: ['게임'], seed: 418, features: { decoration: 'gamepad', effect: 'sparkle' } } },
  { title: '눈물 이펙트 비교', spec: { primary: { key: 'sadness', score: 85 }, seed: 419, features: { decoration: null, effect: 'tear' } } },
  { title: '땀방울 이펙트 비교', spec: { primary: { key: 'anxiety', score: 85 }, seed: 420, features: { decoration: null, effect: 'sweat' } } },
]

const RANDOM_KEYWORDS = ['', '커피', '게임', '여행', '운동', '음악', '꽃', '수면', '우산', '시험 공부']
const RANDOM_CASES: DemoCase[] = Array.from({ length: 30 }, (_, index) => {
  const primary = EMOTION_KEYS[index % EMOTION_KEYS.length]
  const secondary = EMOTION_KEYS[(index + 5) % EMOTION_KEYS.length]
  const primaryScore = 30 + ((index * 17) % 66)
  const secondaryScore = 10 + ((index * 11) % 36)
  const keyword = RANDOM_KEYWORDS[index % RANDOM_KEYWORDS.length]
  return {
    title: `자동 ${String(index + 1).padStart(2, '0')} · ${EMOTION_LABELS[primary]}`,
    spec: {
      primary: { key: primary, score: primaryScore },
      secondary: index % 3 === 0 ? { key: secondary, score: secondaryScore } : null,
      keywords: keyword ? [keyword] : [],
      seed: 9000 + index * 7919,
    },
  }
})

const GROUPS = [
  { title: '같은 감정의 강도별 차이', note: '감정 16종 × 5단계 · 감정별 실루엣과 seed 고정, 눈·눈썹·입·색·이펙트만 변화', cases: INTENSITY_CASES },
  { title: '주 감정 색 + 보조 감정 이펙트', note: '몸통은 주 감정 색만 유지 · 보조 감정은 캐릭터 주변의 독립된 픽셀 이펙트로 표시', cases: MIX_CASES },
  { title: '일기에서 태어나는 소품 40종', note: '일기 문장 속 음식·음료·취미·생활·이동 키워드를 찾아 픽셀 소품으로 배치', cases: KEYWORD_CASES },
]

const ZOOMS = [2, 3, 4, 6]
type FeatureChoice<T extends string> = 'auto' | 'none' | T

function choiceFor<T extends string>(value: T | null | undefined): FeatureChoice<T> {
  return value === undefined ? 'auto' : value === null ? 'none' : value
}

function featureValue<T extends string>(choice: FeatureChoice<T>): T | null | undefined {
  return choice === 'auto' ? undefined : choice === 'none' ? null : choice
}

function describe(result: RenderedCharacter) {
  const parts = [SILHOUETTES[result.silhouette].label, `표정 ${result.level}단계`]
  if (result.secondaryEffect) parts.push(`${EMOTION_LABELS[result.secondaryEffect]} 이펙트`)
  if (result.animalFeature) parts.push(result.animalFeature === 'cat_ears' ? '고양이 귀' : '곰 귀')
  if (result.decoration) parts.push(DECORATION_LABELS[result.decoration])
  if (result.effects.length) parts.push(`${EFFECT_LABELS[result.effects[0]]}×${result.effects.length}`)
  if (!result.decoration && !result.effects.length) parts.push('심플형')
  parts.push(`복잡도 ${result.complexity.used}/${result.complexity.budget}`)
  return parts.join(' · ')
}

function Swatches({ result }: { result: RenderedCharacter }) {
  const names = ['하이라이트', '밝은 면', '기본', '그림자', '진한 그림자', '외곽선']
  return (
    <div className="pixel-swatches">
      {result.palette.body.map((color, i) => (
        <span key={`b${i}`} title={`몸통 ${names[i]} ${color}`} style={{ background: color }} />
      ))}
      <i />
      {result.palette.point.slice(0, 5).map((color, i) => (
        <span key={`p${i}`} title={`포인트 ${names[i]} ${color}`} style={{ background: color }} />
      ))}
    </div>
  )
}

export function PixelRendererDemoPage() {
  const [zoom, setZoom] = useState(3)
  const [grid, setGrid] = useState(false)
  const [emotionEffectsEnabled, setEmotionEffectsEnabled] = useState(true)
  const [emotionEffectsAnimated, setEmotionEffectsAnimated] = useState(true)
  const [primary, setPrimary] = useState<EmotionKey>('joy')
  const [primaryScore, setPrimaryScore] = useState(70)
  const [secondary, setSecondary] = useState<EmotionKey | ''>('sadness')
  const [secondaryScore, setSecondaryScore] = useState(30)
  const [keyword, setKeyword] = useState('')
  const [silhouette, setSilhouette] = useState<SilhouetteId | ''>('')
  const [seed, setSeed] = useState(7)
  const [decorationChoice, setDecorationChoice] = useState<FeatureChoice<DecorationId>>('auto')
  const [effectChoice, setEffectChoice] = useState<FeatureChoice<EffectId>>('auto')

  const playgroundSpec = useMemo<CharacterSpec>(() => ({
    primary: { key: primary, score: primaryScore },
    secondary: secondary ? { key: secondary, score: secondaryScore } : null,
    keywords: keyword ? [keyword] : [],
    silhouette: silhouette || undefined,
    seed,
    features: {
      decoration: featureValue(decorationChoice),
      effect: featureValue(effectChoice),
    },
  }), [primary, primaryScore, secondary, secondaryScore, keyword, silhouette, seed, decorationChoice, effectChoice])
  const playground = useMemo(() => renderCharacter(playgroundSpec), [playgroundSpec])
  const seedReproduces = useMemo(
    () => renderCharacter(playgroundSpec).pixels.every((pixel, index) => pixel === playground.pixels[index]),
    [playground, playgroundSpec],
  )

  const groups = useMemo(
    () => GROUPS.map((group) => ({ ...group, results: group.cases.map((c) => renderCharacter(c.spec)) })),
    [],
  )
  const masks = useMemo(() => SILHOUETTE_IDS.map((id) => ({
    id,
    report: analyzeMask(SILHOUETTES[id].mask),
    preview: renderCharacter({ primary: { key: 'calm', score: 45 }, silhouette: id, seed: 1 }),
  })), [])
  const featureResults = useMemo(() => FEATURE_CASES.map((demo) => renderCharacter(demo.spec)), [])
  const emotionOverviewResults = useMemo(() => EMOTION_OVERVIEW_CASES.map((demo) => renderCharacter(demo.spec)), [])
  const randomResults = useMemo(() => RANDOM_CASES.map((demo) => renderCharacter(demo.spec)), [])
  const groupSilhouetteResults = useMemo(() => GROUP_SILHOUETTE_CASES.map((demo) => renderCharacter(demo.spec)), [])

  const loadCase = (spec: CharacterSpec) => {
    setPrimary(spec.primary.key)
    setPrimaryScore(spec.primary.score)
    setSecondary(spec.secondary?.key ?? '')
    setSecondaryScore(spec.secondary?.score ?? 30)
    setKeyword(spec.keywords?.[0] ?? '')
    setSilhouette('')
    setSeed(spec.seed ?? 7)
    setDecorationChoice(choiceFor(spec.features?.decoration))
    setEffectChoice(choiceFor(spec.features?.effect))
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="prototype-page min-h-screen px-5 py-7 sm:px-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link className="brand" to="/">MOZI</Link>
        <span className="prototype-badge">개발용 · 서비스 미적용</span>
      </header>

      <section className="mx-auto mt-10 max-w-7xl">
        <p className="eyebrow">Pixel renderer v5 · Phase 3</p>
        <h1 className="mt-3 text-3xl font-black text-stone-900 sm:text-4xl">공식 감정 캐릭터 렌더러 검수</h1>
        <p className="mt-4 max-w-3xl leading-7 text-stone-600">
          기존 실루엣 에셋을 보존하면서 6개 감정 그룹의 공식 몸통, 6단계 팔레트, 5단계 표정과 선택형 소품을
          합성합니다. 보조감정은 몸통 색과 섞지 않고 독립 이펙트로 표시하며 실제 도감·감정 방에도 같은 저장 명세를 사용합니다.
        </p>

        <div className="pixel-lab">
          <div className="pixel-lab__stage">
            <PixelCharacterCanvas character={playground} label="실험 캐릭터" scale={6} grid={grid} />
          </div>
          <div className="pixel-lab__controls">
            <label>주 감정
              <select aria-label="주 감정" value={primary} onChange={(e) => setPrimary(e.target.value as EmotionKey)}>
                {EMOTION_KEYS.map((key) => <option key={key} value={key}>{EMOTION_LABELS[key]}</option>)}
              </select>
            </label>
            <label>강도 {primaryScore}
              <input type="range" min={5} max={100} value={primaryScore} onChange={(e) => setPrimaryScore(Number(e.target.value))} />
            </label>
            <label>보조 감정
              <select aria-label="보조 감정" value={secondary} onChange={(e) => setSecondary(e.target.value as EmotionKey | '')}>
                <option value="">없음</option>
                {EMOTION_KEYS.map((key) => <option key={key} value={key}>{EMOTION_LABELS[key]}</option>)}
              </select>
            </label>
            <label>보조 강도 {secondaryScore}
              <input type="range" min={0} max={100} value={secondaryScore} disabled={!secondary} onChange={(e) => setSecondaryScore(Number(e.target.value))} />
            </label>
            <label>일기 내용에서 소품 찾기
              <input aria-label="일기 내용에서 소품 찾기" value={keyword} placeholder="예: 카페에서 라떼를 마셨어" onChange={(e) => setKeyword(e.target.value)} />
            </label>
            <label>실루엣
              <select aria-label="실루엣" value={silhouette} onChange={(e) => setSilhouette(e.target.value as SilhouetteId | '')}>
                <option value="">감정에 맞게 자동</option>
                {SILHOUETTE_IDS.map((id) => <option key={id} value={id}>{SILHOUETTES[id].label}</option>)}
              </select>
            </label>
            <label>이펙트
              <select aria-label="이펙트" value={effectChoice} onChange={(e) => setEffectChoice(e.target.value as FeatureChoice<EffectId>)}>
                <option value="auto">감정에 맞게 자동</option><option value="none">없음</option>
                {EFFECT_IDS.map((id) => <option key={id} value={id}>{EFFECT_LABELS[id]}</option>)}
              </select>
            </label>
            <label>랜덤 seed
              <input aria-label="랜덤 seed" min={0} type="number" value={seed} onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <p className="pixel-lab__summary">{describe(playground)}</p>
            <p className="pixel-seed-check">같은 seed 재현 {seedReproduces ? '✓ 일치' : '✕ 불일치'} · {playground.rendererVersion}</p>
            <Swatches result={playground} />
            <div className="pixel-lab__actions">
              <label className="pixel-lab__check">
                <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> 픽셀 격자 보기
              </label>
              <button className="button button--secondary" type="button" onClick={() => setSeed(Math.floor(Math.random() * 1_000_000_000))}>새 seed로 생성</button>
              <button className="button button--secondary" type="button" onClick={() => downloadCharacterPng(playground, 'mozi-character-64.png')}>PNG 64px</button>
              <button className="button button--secondary" type="button" onClick={() => downloadCharacterPng(playground, 'mozi-character-512.png', 8)}>PNG 512px</button>
            </div>
          </div>
        </div>

        <div className="pixel-zoom" role="group" aria-label="카드 확대 배율">
          <span>카드 배율</span>
          {ZOOMS.map((value) => (
            <button key={value} type="button" aria-pressed={zoom === value} onClick={() => setZoom(value)}>{value}×</button>
          ))}
        </div>

        <section>
          <div className="prototype-section-heading">
            <div><span className="prototype-source prototype-source--generated">공식 6종</span><h2>6개 감정 그룹 몸통</h2></div>
            <p>자동 생성에서는 아래 검증된 실루엣만 사용 · 기존 나머지 마스크는 삭제하지 않고 보존</p>
          </div>
          <div className="pixel-demo-grid">
            {GROUP_SILHOUETTE_CASES.map((demo, index) => {
              const result = groupSilhouetteResults[index]
              return (
                <button className="pixel-demo-card" key={demo.title} type="button" onClick={() => loadCase(demo.spec)}>
                  <PixelCharacterCanvas character={result} label={`${demo.title} 캐릭터`} scale={zoom} grid={grid} />
                  <strong>{demo.title}</strong>
                  <small>{SILHOUETTES[result.silhouette].label} · 연결·구멍 자동 검증</small>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="prototype-section-heading">
            <div><span className="prototype-source prototype-source--generated">기본 16종</span><h2>감정별 모양과 색상</h2></div>
            <div className="emotion-effect-controls">
              <label><input type="checkbox" checked={emotionEffectsEnabled} onChange={(event) => setEmotionEffectsEnabled(event.target.checked)} /> 감정 이펙트</label>
              <label><input type="checkbox" checked={emotionEffectsAnimated} disabled={!emotionEffectsEnabled} onChange={(event) => setEmotionEffectsAnimated(event.target.checked)} /> 위아래 움직임</label>
            </div>
          </div>
          <p className="emotion-effect-note">강도 50 기준 · 제공된 16×16 원본 비트맵 · 이펙트를 켜면 기존 외부 효과는 숨기고 몸통·표정·볼터치·눈물은 유지</p>
          <div className="pixel-demo-grid">
            {EMOTION_OVERVIEW_CASES.map((demo, index) => {
              const result = emotionOverviewResults[index]
              const color = EMOTION_COLOR_SEEDS[demo.spec.primary.key]
              return (
                <button className="pixel-demo-card" key={demo.title} type="button" onClick={() => loadCase(demo.spec)}>
                  <PixelCharacterCanvas
                    character={result}
                    label={`${demo.title} 기본 캐릭터`}
                    scale={emotionEffectsEnabled ? 2 : zoom}
                    grid={grid}
                    emotionEffect={emotionEffectsEnabled ? demo.spec.primary.key : null}
                    animateEffect={emotionEffectsAnimated}
                  />
                  <strong>{demo.title}</strong>
                  <small>{SILHOUETTES[result.silhouette].label} · 표정 {result.level}단계</small>
                  <span className="emotion-color-seed">
                    <i aria-hidden="true" style={{ background: color.base }} />
                    <code>{color.base.toUpperCase()}</code> · seed {color.seed}
                  </span>
                  <Swatches result={result} />
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="prototype-section-heading">
            <div><span className="prototype-source prototype-source--generated">비교 14종</span><h2>선택형 특징·소품 비교</h2></div>
            <p>헤어는 사용하지 않고 동물 귀·소품·이펙트의 없음(null) 상태와 조합을 한눈에 확인</p>
          </div>
          <div className="pixel-demo-grid">
            {FEATURE_CASES.map((demo, index) => {
              const result = featureResults[index]
              return (
                <button className="pixel-demo-card" key={demo.title} type="button" onClick={() => loadCase(demo.spec)}>
                  <PixelCharacterCanvas character={result} label={`${demo.title} 캐릭터`} scale={zoom} grid={grid} />
                  <strong>{demo.title}</strong>
                  <small>{describe(result)}</small>
                  <small>seed {demo.spec.seed}</small>
                  <Swatches result={result} />
                </button>
              )
            })}
          </div>
        </section>

        {groups.map((group) => (
          <section key={group.title}>
            <div className="prototype-section-heading">
              <div><span className="prototype-source prototype-source--generated">{group.cases.length}종</span><h2>{group.title}</h2></div>
              <p>{group.note}</p>
            </div>
            <div className="pixel-demo-grid">
              {group.cases.map((demo, index) => {
                const result = group.results[index]
                return (
                  <button className="pixel-demo-card" key={demo.title} type="button" onClick={() => loadCase(demo.spec)}>
                    <PixelCharacterCanvas character={result} label={`${demo.title} 캐릭터`} scale={zoom} grid={grid} />
                    <strong>{demo.title}</strong>
                    <small>{describe(result)}</small>
                    <Swatches result={result} />
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <section>
          <div className="prototype-section-heading">
            <div><span className="prototype-source prototype-source--generated">자동 30종</span><h2>감정 기반 선택형 캐릭터</h2></div>
            <p>감정·강도·복합 비율·키워드·seed가 다른 고정 검수 세트</p>
          </div>
          <div className="pixel-demo-grid">
            {RANDOM_CASES.map((demo, index) => {
              const result = randomResults[index]
              const secondaryText = demo.spec.secondary
                ? ` + ${EMOTION_LABELS[demo.spec.secondary.key]} ${demo.spec.secondary.score}`
                : ''
              return (
                <button className="pixel-demo-card" key={demo.title} type="button" onClick={() => loadCase(demo.spec)}>
                  <PixelCharacterCanvas character={result} label={`${demo.title} 캐릭터`} scale={zoom} grid={grid} />
                  <strong>{demo.title}</strong>
                  <small>{EMOTION_LABELS[demo.spec.primary.key]} {demo.spec.primary.score}{secondaryText}</small>
                  <small>{describe(result)}</small>
                  <small>seed {demo.spec.seed}</small>
                  <Swatches result={result} />
                </button>
              )
            })}
          </div>
        </section>

        <div className="prototype-section-heading">
          <div><span className="prototype-source prototype-source--original">마스크</span><h2>몸통 실루엣 10종 검증</h2></div>
          <p>고정 마스크만 사용 · 생성기는 id만 고를 수 있음</p>
        </div>
        <div className="pixel-demo-grid">
          {masks.map(({ id, report, preview }) => {
            const ok = report.components === 1 && report.holes === 0 && report.spurs === 0 && report.notches === 0 && report.symmetric
            return (
              <div className="pixel-demo-card" key={id}>
                <PixelCharacterCanvas character={preview} label={`${SILHOUETTES[id].label} 실루엣`} scale={zoom} grid={grid} />
                <strong>{SILHOUETTES[id].label} <code>{id}</code></strong>
                <small className={ok ? 'pixel-check pixel-check--ok' : 'pixel-check'}>
                  연결 {report.components} · 구멍 {report.holes} · 튐 {report.spurs} · 파임 {report.notches} · {report.symmetric ? '대칭' : '비대칭'}
                </small>
              </div>
            )
          })}
        </div>

      </section>
    </main>
  )
}
