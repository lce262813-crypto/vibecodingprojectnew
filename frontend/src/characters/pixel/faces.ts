// 표정 레이어: 눈썹·눈·입을 각각 독립된 픽셀 스프라이트로 정의한다.
// 왼쪽 눈/눈썹만 그리고 오른쪽은 좌우 반전한다(비대칭 표정은 Right를 따로 지정).
// 색 키: k 잉크, w 흰자/반짝임, m 입 안, t 혀, b 눈물, B 눈물 밝은 면, r 하트, s 몸통 그림자색

import type { EmotionKey } from './palette'

export type ExpressionLevel = 1 | 2 | 3 | 4 | 5

export interface Expression {
  brows: string[] | null
  browsRight?: string[] | null
  eyes: string[]
  eyesRight?: string[]
  mouth: string[]
  blush?: boolean
}

export const FACE_COLORS: Record<string, string> = {
  k: '#2a1d33',
  w: '#ffffff',
  m: '#6e2238',
  t: '#f0788c',
  b: '#58b6f0',
  B: '#c9efff',
  r: '#ef4a64',
}

// ── 눈 ──────────────────────────────────────────────
const EYE_OPEN = ['.kk.', 'kwkk', 'kkkk', '.kk.']
const EYE_SPARKLE = ['.kkk.', 'kwkkk', 'kkkwk', '.kkk.']
const EYE_ARC = ['.kk.', 'k..k']
const EYE_ARC_BIG = ['.kkk.', 'kk.kk', 'k...k']
const EYE_HEART = ['rw.rr', 'rrrrr', '.rrr.', '..r..']
const EYE_CONTENT = ['k..k', '.kk.']
const EYE_CONTENT_WIDE = ['k...k', '.kkk.']
const EYE_SMUG = ['kkkk', 'kwkk', '.kk.']
const EYE_GLARE = ['kk..', 'kkkk', 'kwkk', '.kk.']
const EYE_RAGE = ['kk...', 'kkkk.', 'kwwkk', '.kkk.']
const EYE_RAGE_MAX = ['kkk..', 'kkkk.', 'kwwkk', 'kkkk.', '.kkk.']
const EYE_SIDE = ['kkkk', '..kk']
const EYE_TEARY = ['.kk.', 'kwkk', 'kkkk', 'bkkb', '.bB.']
const EYE_CRYING = ['kkkk', '.b..', '.bB.', '.b..']
const EYE_DOWN = ['.kk.', 'kkkk', 'kkwk']
const EYE_WORRIED_WIDE = ['kkkk', 'kwwk', 'kwkk', 'kkkk']
const EYE_PANIC = ['.kkk.', 'kwwwk', 'kwkwk', 'kwwwk', '.kkk.']
const EYE_SQUINT = ['kkkk']
const EYE_SPIRAL = ['kkkk', '...k', '.k.k', '.kkk']
const EYE_DROOPY = ['kkkk', 'kwkk', '.kk.']
const EYE_SLEEPY = ['kkkk', '.kk.', 'ssss']
const EYE_ASLEEP = ['kkkk', '....', 'ssss']
const EYE_DOT = ['kk', 'kk']
const EYE_SHUT_TIGHT = ['kk..', '..kk', 'kk..']
const EYE_WINK = ['kkkk', '.kk.']
const EYE_GLOSSY = ['.kk.', 'kwwk', 'kwkk', '.kk.']
const EYE_HOLLOW = ['kkkk', 'k..k', 'k..k', 'kkkk']
const EYE_AVERTED = ['.kk.', 'kkkk', 'kkw.']

// ── 눈썹 (최대 2행) ─────────────────────────────────
const BROW_ANGRY = ['kk..', '..kk']
const BROW_FURIOUS = ['kkkk.', '..kkk']
const BROW_SAD = ['..kk', 'kk..']
const BROW_ARCH = ['.kk.', 'k..k']
const BROW_FLAT = ['kkkk']
const BROW_UP = ['.kkk', 'k...']
const BROW_SOFT = ['..kk', '.k..']
const BROW_UNEVEN = ['kkk.', '...k']

// ── 입 (짝수 폭) ────────────────────────────────────
const MOUTH_SMILE_S = ['k..k', '.kk.']
const MOUTH_SMILE = ['k....k', '.kkkk.']
const MOUTH_OPEN_SMILE = ['kkkkkk', 'kmmmmk', '.kttk.']
const MOUTH_BIG_LAUGH = ['kkkkkkkk', 'kmmmmmmk', 'kmmttmmk', '.kmttmk.', '..kkkk..']
const MOUTH_SMIRK = ['.....k', 'kkkkk.']
const MOUTH_GRIN = ['kkkkkk', 'kwwwwk', '.kkkk.']
const MOUTH_GRIN_BIG = ['kkkkkkkk', 'kwwwwwwk', '.kkkkkk.']
const MOUTH_FROWN_S = ['.kk.', 'k..k']
const MOUTH_FROWN = ['.kkkk.', 'k....k']
const MOUTH_SHOUT = ['kkkkkkkk', 'kwwwwwwk', 'kmmmmmmk', '.kkkkkk.']
const MOUTH_CROOKED = ['....kk', 'kkkk..']
const MOUTH_CROOKED_BIG = ['.....k', '..kkk.', 'kk....']
const MOUTH_WOBBLE = ['..kk..', '.k..k.', 'k....k']
const MOUTH_WAIL = ['.kkkk.', 'kmmmmk', 'kmttmk', '.kkkk.']
const MOUTH_WAVY = ['.k..k.', 'k.kk.k']
const MOUTH_ZIGZAG = ['k.k.k.', '.k.k.k']
const MOUTH_GRIT = ['kkkkkkkk', 'kwkwwkwk', 'kkkkkkkk']
const MOUTH_O = ['.kk.', 'kmmk', '.kk.']
const MOUTH_WAVE_BIG = ['.kk..kk.', 'k..kk..k']
const MOUTH_FLAT = ['kkkk']
const MOUTH_FLAT_WIDE = ['kkkkkk']
// 피로 전용 하품 입: 붉은 입술/혀 대신 몸통 그림자색(s)을 써서 자연스럽게 보인다.
const MOUTH_TIRED_O = ['.kk.', 'kssk', 'kssk', '.kk.']
const MOUTH_TIRED_SIGH = ['.kkkk.', 'kssssk', '.kkkk.']
const MOUTH_TIRED_YAWN = ['.kkkk.', 'kssssk', 'kssssk', 'kssssk', '.kkkk.']
// 불안 최고 단계: 붉은 입술처럼 보이지 않는 떨리는 들숨 모양.
const MOUTH_ANXIOUS_GASP_MAX = ['..kk..', '.kssk.', 'kssssk', 'kssssk', '.kkkk.']
const MOUTH_RAGE_ROAR = ['kkkkkkkk', 'kmmmmmmk', 'kmwmmwmk', 'kmmmmmmk', '.kkkkkk.']
const MOUTH_SHOCK_MAX = ['..kk..', '.k..k.', 'k....k', 'k....k', '.kkkk.']
const MOUTH_TINY = ['kk']
const MOUTH_POUT = ['.kkkk.', 'k....k', '.k..k.']
const MOUTH_SIGH = ['.kkkk.', 'kmmmmk', '.kkkk.']
const MOUTH_SURPRISE = ['.kkkk.', 'kmmmmk', '.kkkk.']

type Levels = Record<ExpressionLevel, Expression>

function levels(a: Expression, b: Expression, c: Expression, d: Expression, e: Expression): Levels {
  return { 1: a, 2: b, 3: c, 4: d, 5: e }
}

// 각 감정은 5단계 모두를 명시한다. 인접 감정끼리도 대표 신호가 겹치지 않도록
// 기쁨=웃는 눈, 설렘=반짝/하트, 감동=촉촉한 눈, 실망=빈 눈/한숨처럼 분리했다.
const EXPRESSIONS: Record<EmotionKey, Levels> = {
  joy: levels(
    { brows: null, eyes: EYE_OPEN, mouth: MOUTH_SMILE_S },
    { brows: null, eyes: EYE_OPEN, mouth: MOUTH_SMILE },
    { brows: null, eyes: EYE_ARC, mouth: MOUTH_OPEN_SMILE, blush: true },
    { brows: BROW_ARCH, eyes: EYE_ARC_BIG, mouth: MOUTH_OPEN_SMILE, blush: true },
    { brows: BROW_ARCH, eyes: EYE_ARC_BIG, mouth: MOUTH_BIG_LAUGH, blush: true },
  ),
  excitement: levels(
    { brows: BROW_UP, eyes: EYE_OPEN, mouth: MOUTH_TINY, blush: true },
    { brows: BROW_UP, eyes: EYE_GLOSSY, mouth: MOUTH_SMILE_S, blush: true },
    { brows: BROW_UP, eyes: EYE_SPARKLE, mouth: MOUTH_OPEN_SMILE, blush: true },
    { brows: BROW_UP, eyes: EYE_HEART, mouth: MOUTH_OPEN_SMILE, blush: true },
    { brows: BROW_ARCH, eyes: EYE_HEART, mouth: MOUTH_BIG_LAUGH, blush: true },
  ),
  calm: levels(
    { brows: null, eyes: EYE_DOT, mouth: MOUTH_SMILE_S },
    { brows: null, eyes: EYE_CONTENT, mouth: MOUTH_SMILE_S },
    { brows: null, eyes: EYE_CONTENT_WIDE, mouth: MOUTH_SMILE },
    { brows: BROW_SOFT, eyes: EYE_ASLEEP, mouth: MOUTH_SMILE },
    { brows: BROW_SOFT, eyes: EYE_ASLEEP, mouth: MOUTH_SMILE_S, blush: true },
  ),
  pride: levels(
    { brows: BROW_ARCH, eyes: EYE_OPEN, mouth: MOUTH_SMIRK },
    { brows: BROW_UP, eyes: EYE_SIDE, mouth: MOUTH_SMIRK },
    { brows: BROW_UP, eyes: EYE_SMUG, mouth: MOUTH_GRIN },
    { brows: BROW_ARCH, eyes: EYE_CONTENT, mouth: MOUTH_GRIN_BIG },
    { brows: BROW_ARCH, eyes: EYE_ARC, mouth: MOUTH_GRIN_BIG, blush: true },
  ),
  moved: levels(
    { brows: BROW_SOFT, eyes: EYE_GLOSSY, mouth: MOUTH_SMILE_S },
    { brows: BROW_SAD, eyes: EYE_GLOSSY, mouth: MOUTH_SMILE, blush: true },
    { brows: BROW_SAD, eyes: EYE_TEARY, mouth: MOUTH_SMILE, blush: true },
    { brows: BROW_SOFT, eyes: EYE_TEARY, mouth: MOUTH_OPEN_SMILE, blush: true },
    { brows: BROW_SOFT, eyes: EYE_CRYING, mouth: MOUTH_OPEN_SMILE, blush: true },
  ),
  sadness: levels(
    { brows: BROW_SAD, eyes: EYE_DOWN, mouth: MOUTH_FROWN_S },
    { brows: BROW_SAD, eyes: EYE_GLOSSY, mouth: MOUTH_FROWN },
    { brows: BROW_SAD, eyes: EYE_TEARY, mouth: MOUTH_WOBBLE },
    { brows: BROW_SAD, eyes: EYE_CRYING, mouth: MOUTH_WAIL },
    { brows: BROW_SAD, eyes: EYE_CRYING, mouth: MOUTH_WAVE_BIG },
  ),
  anger: levels(
    { brows: BROW_ANGRY, eyes: EYE_OPEN, mouth: MOUTH_FROWN_S },
    { brows: BROW_ANGRY, eyes: EYE_GLARE, mouth: MOUTH_FROWN },
    { brows: BROW_FURIOUS, eyes: EYE_GLARE, mouth: MOUTH_GRIT },
    { brows: BROW_FURIOUS, eyes: EYE_RAGE, mouth: MOUTH_SHOUT },
    { brows: BROW_FURIOUS, eyes: EYE_RAGE_MAX, mouth: MOUTH_RAGE_ROAR },
  ),
  irritation: levels(
    { brows: BROW_FLAT, eyes: EYE_SIDE, eyesRight: EYE_SIDE, mouth: MOUTH_CROOKED },
    { brows: BROW_UNEVEN, eyes: EYE_SIDE, eyesRight: EYE_DROOPY, mouth: MOUTH_CROOKED },
    { brows: BROW_ANGRY, eyes: EYE_SMUG, mouth: MOUTH_CROOKED_BIG },
    { brows: BROW_ANGRY, eyes: EYE_SQUINT, mouth: MOUTH_ZIGZAG },
    { brows: BROW_FURIOUS, eyes: EYE_GLARE, mouth: MOUTH_GRIT },
  ),
  anxiety: levels(
    { brows: BROW_SAD, eyes: EYE_AVERTED, mouth: MOUTH_TINY },
    { brows: BROW_SAD, eyes: EYE_OPEN, mouth: MOUTH_WAVY },
    { brows: BROW_UP, eyes: EYE_WORRIED_WIDE, mouth: MOUTH_ZIGZAG },
    { brows: BROW_UP, eyes: EYE_PANIC, mouth: MOUTH_GRIT },
    { brows: BROW_UP, browsRight: BROW_SAD, eyes: EYE_PANIC, mouth: MOUTH_ANXIOUS_GASP_MAX },
  ),
  loneliness: levels(
    { brows: null, eyes: EYE_AVERTED, mouth: MOUTH_TINY },
    { brows: BROW_SOFT, eyes: EYE_DOWN, mouth: MOUTH_TINY },
    { brows: BROW_SAD, eyes: EYE_DOWN, mouth: MOUTH_FROWN_S },
    { brows: BROW_SAD, eyes: EYE_GLOSSY, mouth: MOUTH_POUT },
    { brows: BROW_SAD, eyes: EYE_TEARY, mouth: MOUTH_POUT },
  ),
  disappointment: levels(
    { brows: BROW_FLAT, eyes: EYE_DROOPY, mouth: MOUTH_FLAT },
    { brows: BROW_SOFT, eyes: EYE_AVERTED, mouth: MOUTH_FLAT_WIDE },
    { brows: BROW_SAD, eyes: EYE_HOLLOW, mouth: MOUTH_SIGH },
    { brows: BROW_SAD, eyes: EYE_HOLLOW, mouth: MOUTH_FROWN },
    { brows: BROW_SAD, eyes: EYE_ASLEEP, mouth: MOUTH_SIGH },
  ),
  embarrassment: levels(
    { brows: BROW_UP, eyes: EYE_OPEN, mouth: MOUTH_O },
    { brows: BROW_UP, eyes: EYE_GLOSSY, mouth: MOUTH_O, blush: true },
    { brows: BROW_UP, eyes: EYE_WORRIED_WIDE, mouth: MOUTH_SURPRISE, blush: true },
    { brows: BROW_UNEVEN, eyes: EYE_PANIC, mouth: MOUTH_WAVE_BIG, blush: true },
    { brows: BROW_UP, eyes: EYE_PANIC, eyesRight: EYE_WORRIED_WIDE, mouth: MOUTH_SHOCK_MAX, blush: true },
  ),
  confusion: levels(
    { brows: BROW_ARCH, browsRight: BROW_FLAT, eyes: EYE_OPEN, eyesRight: EYE_SQUINT, mouth: MOUTH_TINY },
    { brows: BROW_UNEVEN, browsRight: BROW_FLAT, eyes: EYE_AVERTED, eyesRight: EYE_OPEN, mouth: MOUTH_WAVY },
    { brows: BROW_ARCH, browsRight: BROW_FLAT, eyes: EYE_OPEN, eyesRight: EYE_SPIRAL, mouth: MOUTH_O },
    { brows: BROW_UP, eyes: EYE_SPIRAL, eyesRight: EYE_PANIC, mouth: MOUTH_WAVE_BIG },
    { brows: BROW_UP, eyes: EYE_SPIRAL, eyesRight: EYE_SPIRAL, mouth: MOUTH_ZIGZAG },
  ),
  shyness: levels(
    { brows: null, eyes: EYE_AVERTED, mouth: MOUTH_SMILE_S, blush: true },
    { brows: null, eyes: EYE_DOWN, mouth: MOUTH_SMILE_S, blush: true },
    { brows: BROW_SOFT, eyes: EYE_CONTENT, mouth: MOUTH_SMILE_S, blush: true },
    { brows: BROW_SOFT, eyes: EYE_WINK, mouth: MOUTH_SMILE, blush: true },
    { brows: BROW_SOFT, eyes: EYE_SHUT_TIGHT, mouth: MOUTH_SMILE_S, blush: true },
  ),
  fatigue: levels(
    { brows: null, eyes: EYE_DROOPY, mouth: MOUTH_FLAT },
    { brows: BROW_FLAT, eyes: EYE_SLEEPY, mouth: MOUTH_FLAT_WIDE },
    { brows: BROW_FLAT, eyes: EYE_SLEEPY, mouth: MOUTH_TIRED_O },
    { brows: BROW_FLAT, eyes: EYE_ASLEEP, mouth: MOUTH_TIRED_SIGH },
    { brows: BROW_FLAT, eyes: EYE_ASLEEP, mouth: MOUTH_TIRED_YAWN },
  ),
  lethargy: levels(
    { brows: null, eyes: EYE_DOT, mouth: MOUTH_TINY },
    { brows: null, eyes: EYE_DOT, mouth: MOUTH_FLAT },
    { brows: BROW_FLAT, eyes: EYE_HOLLOW, mouth: MOUTH_FLAT_WIDE },
    { brows: BROW_FLAT, eyes: EYE_SQUINT, mouth: MOUTH_FLAT_WIDE },
    { brows: BROW_FLAT, eyes: EYE_HOLLOW, mouth: MOUTH_WAVE_BIG },
  ),
}

export function expressionFor(emotion: EmotionKey, level: ExpressionLevel): Expression {
  return EXPRESSIONS[emotion][level]
}

export function levelForScore(score: number): ExpressionLevel {
  if (score <= 20) return 1
  if (score <= 40) return 2
  if (score <= 60) return 3
  if (score <= 80) return 4
  return 5
}

export function mirrorSprite(rows: string[]) {
  return rows.map((row) => [...row].reverse().join(''))
}
