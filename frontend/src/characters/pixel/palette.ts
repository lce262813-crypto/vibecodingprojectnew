// 감정 → 색. 감정마다 기준 색상(HSL)이 있고, 강도와 비율로 색조·명도·채도를 조정한다.
// 결과는 항상 경계가 분명한 단색 단계(램프)로만 쓰인다. 그라데이션·노이즈 없음.

export type EmotionKey =
  | 'joy' | 'excitement' | 'calm' | 'pride' | 'moved' | 'sadness' | 'anger' | 'irritation'
  | 'anxiety' | 'loneliness' | 'disappointment' | 'embarrassment' | 'confusion' | 'shyness'
  | 'fatigue' | 'lethargy'

export const EMOTION_LABELS: Record<EmotionKey, string> = {
  joy: '기쁨', excitement: '설렘', calm: '평온', pride: '뿌듯함', moved: '감동',
  sadness: '슬픔', anger: '분노', irritation: '짜증', anxiety: '불안', loneliness: '외로움',
  disappointment: '실망', embarrassment: '당황', confusion: '혼란', shyness: '부끄러움',
  fatigue: '피로', lethargy: '무기력',
}

export const EMOTION_KEYS = Object.keys(EMOTION_LABELS) as EmotionKey[]

interface Hsl { h: number; s: number; l: number }

export const EMOTION_COLOR_SEEDS: Record<EmotionKey, { seed: number; base: string }> = {
  joy: { seed: 1101, base: '#ffd84d' },
  excitement: { seed: 1102, base: '#ff9fc7' },
  calm: { seed: 1103, base: '#72d3a4' },
  pride: { seed: 1104, base: '#ffba53' },
  moved: { seed: 1105, base: '#f3a17f' },
  sadness: { seed: 1106, base: '#669fe3' },
  anger: { seed: 1107, base: '#e5484d' },
  irritation: { seed: 1108, base: '#e8793e' },
  anxiety: { seed: 1109, base: '#9b82e2' },
  loneliness: { seed: 1110, base: '#5798a8' },
  disappointment: { seed: 1111, base: '#9e370e' },
  embarrassment: { seed: 1112, base: '#ff8b75' },
  confusion: { seed: 1113, base: '#b568ca' },
  shyness: { seed: 1114, base: '#d99bc1' },
  fatigue: { seed: 1115, base: '#34384b' },
  lethargy: { seed: 1116, base: '#789281' },
}

const BASE_COLORS: Record<EmotionKey, Hsl> = {
  joy: { h: 46.9, s: 100, l: 65.1 },
  // 진한 하트 눈(#ef4a64)이 몸통에 묻히지 않도록 밝은 연분홍을 사용한다.
  excitement: { h: 335, s: 100, l: 81.1765 },
  calm: { h: 150.9, s: 52.4, l: 63.7 },
  pride: { h: 35.9302, s: 100, l: 66.2745 },
  moved: { h: 17.6, s: 82.9, l: 72.5 },
  sadness: { h: 212.6, s: 69.1, l: 64.5 },
  anger: { h: 358.1, s: 75.1, l: 59 },
  irritation: { h: 20.8, s: 78.7, l: 57.6 },
  anxiety: { h: 255.6, s: 62.3, l: 69.8 },
  loneliness: { h: 191.9, s: 31.8, l: 50 },
  // 피로의 청회색과 겹치지 않도록, 온기가 빠진 탁한 코코아색으로 분리한다.
  disappointment: { h: 17.0833, s: 83.7209, l: 33.7255 },
  embarrassment: { h: 9.6, s: 100, l: 72.9 },
  confusion: { h: 287.1, s: 48, l: 60 },
  shyness: { h: 323.2, s: 44.9, l: 72.9 },
  fatigue: { h: 229.5652, s: 18.1102, l: 24.902 },
  lethargy: { h: 140.8, s: 10.7, l: 52.2 },
}

/** 6단계: 하이라이트, 밝은 면, 기본색, 그림자, 진한 그림자, 외곽선 */
export type Ramp = [string, string, string, string, string, string]

export const TONE = { highlight: 0, light: 1, base: 2, shadow: 3, deep: 4, outline: 5 } as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** h를 target 쪽으로 최대 amount도 이동 (지나치지 않음) */
function shiftHue(h: number, target: number, amount: number) {
  const delta = ((target - h + 540) % 360) - 180
  const step = Math.sign(delta) * Math.min(Math.abs(delta), amount)
  return (h + step + 360) % 360
}

export function hslToHex({ h, s, l }: Hsl) {
  const sat = clamp(s, 0, 100) / 100
  const light = clamp(l, 0, 100) / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const channel = (n: number) => {
    const value = light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(value * 255).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

/** 따뜻한 쪽(노랑)으로 밝히고 차가운 쪽(남보라)으로 어둡히는 픽셀 아트식 색조 이동 */
export function buildRamp({ h, s, l }: Hsl): Ramp {
  return [
    hslToHex({ h: shiftHue(h, 55, 10), s: s * 0.55, l: Math.min(96, l + 25) }),
    hslToHex({ h: shiftHue(h, 55, 6), s: s * 0.95, l: Math.min(90, l + 11) }),
    hslToHex({ h, s, l }),
    hslToHex({ h: shiftHue(h, 255, 12), s: Math.min(100, s * 1.05), l: l - 13 }),
    hslToHex({ h: shiftHue(h, 255, 22), s, l: l - 25 }),
    hslToHex({ h: shiftHue(h, 255, 28), s: s * 0.7, l: Math.max(14, l - 46) }),
  ]
}

/**
 * 감정 하나의 색: 강도가 낮으면 확실한 파스텔, 높으면 진하고 묵직한 색이 된다.
 * score 50에서는 감정별 기준색을 정확히 유지한다.
 */
export function emotionColor(key: EmotionKey, score: number): Hsl {
  const base = BASE_COLORS[key]
  const t = clamp(score, 0, 100) / 100
  return {
    h: base.h,
    s: clamp(base.s * (0.45 + 1.1 * t), 8, 100),
    l: clamp(base.l + (0.5 - t) * 28, 15, 94),
  }
}

export interface CharacterPalette {
  body: Ramp
  /** 보조 감정 포인트 색 (볼터치·무늬). 보조 감정이 없으면 주 감정에서 파생 */
  point: Ramp
  blush: string
}

/**
 * 몸통 팔레트는 오직 주 감정으로만 만든다.
 * 보조 감정은 색에 섞지 않고 별도의 감정 이펙트 레이어로 표현한다.
 */
export function buildPalette(primary: { key: EmotionKey; score: number }): CharacterPalette {
  const main = emotionColor(primary.key, primary.score)
  const pointBase = { h: shiftHue(main.h, 350, 40), s: Math.max(55, main.s), l: 74 }
  return { body: buildRamp(main), point: buildRamp(pointBase), blush: hslToHex(pointBase) }
}

