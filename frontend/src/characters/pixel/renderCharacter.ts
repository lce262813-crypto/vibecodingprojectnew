// 감정 → 64×64 픽셀 캐릭터.
// 모든 좌표는 정수 픽셀, 모든 색은 불투명 단색(#rrggbb) 또는 투명(null)이다.
// 같은 입력은 항상 같은 결과를 낸다(시드 고정).

import {
  CANVAS_SIZE,
  SILHOUETTES,
  SILHOUETTE_IDS,
  maskBounds,
  rowSpan,
  topAt,
  type Silhouette,
  type SilhouetteId,
} from './silhouettes'
import {
  TONE,
  buildPalette,
  type CharacterPalette,
  type EmotionKey,
  type Ramp,
} from './palette'
import { FACE_COLORS, expressionFor, levelForScore, mirrorSprite, type ExpressionLevel } from './faces'
import {
  DECORATION_ANCHOR,
  DECORATION_OUTLINE,
  EFFECT_SPRITES,
  HEADPHONE_COLORS,
  HEADPHONE_CUP,
  ITEM_SPRITES,
  decorationForKeywords,
  type DecorationId,
  type EffectId,
  type PixelSprite,
} from './decorations'

const N = CANVAS_SIZE

export interface EmotionScore { key: EmotionKey; score: number }

export interface CharacterSpec {
  primary: EmotionScore
  secondary?: EmotionScore | null
  keywords?: string[]
  seed?: number
  /** 고정 실루엣. 목록에 없는 값은 무시된다. */
  silhouette?: SilhouetteId
  /** undefined=감정 기반 자동 선택, null=명시적으로 사용하지 않음 */
  features?: {
    animalFeature?: AnimalFeatureId | null
    decoration?: DecorationId | null
    effect?: EffectId | null
  }
}

export type PatternKind = 'none' | 'spots' | 'belly'
export type AnimalFeatureId = 'cat_ears' | 'bear_ears'

export interface RenderedCharacter {
  size: number
  pixels: (string | null)[]
  silhouette: SilhouetteId
  level: ExpressionLevel
  palette: CharacterPalette
  pattern: PatternKind
  /** 이전 저장 데이터와의 호환용. 새 렌더러에서는 항상 null이다. */
  hair: null
  animalFeature: AnimalFeatureId | null
  decoration: DecorationId | null
  effects: EffectId[]
  /** 복합 감정일 때 몸통 색 대신 표시할 보조 감정 이펙트 */
  secondaryEffect: EmotionKey | null
  rendererVersion: 'pixel-v5' | 'human-v1' | 'human-review-v1'
  complexity: { used: number; budget: number }
  layers: {
    body: Uint8Array
    hair: Uint8Array
    animalFeature: Uint8Array
    face: Uint8Array
    decoration: Uint8Array
    effect: Uint8Array
  }
  issues: {
    clipped: number
    faceOutside: number
    faceOverlap: number
    hairFaceOverlap: number
    animalFeatureFaceOverlap: number
    decorationFaceOverlap: number
  }
}

const SILHOUETTE_CHOICES: Record<EmotionKey, [SilhouetteId, SilhouetteId]> = {
  joy: ['round', 'round'], pride: ['round', 'round'], moved: ['round', 'round'],
  excitement: ['heart', 'heart'], shyness: ['heart', 'heart'],
  calm: ['flat', 'flat'], fatigue: ['flat', 'flat'], lethargy: ['flat', 'flat'],
  sadness: ['wave', 'wave'], loneliness: ['wave', 'wave'], disappointment: ['wave', 'wave'],
  anger: ['spiky', 'spiky'], irritation: ['spiky', 'spiky'],
  anxiety: ['drop', 'drop'], embarrassment: ['drop', 'drop'], confusion: ['drop', 'drop'],
}

function hashSeed(text: string) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N
const at = (x: number, y: number) => y * N + x

class PixelCanvas {
  pixels: (string | null)[] = new Array(N * N).fill(null)
  clipped = 0

  set(x: number, y: number, color: string) {
    if (!inside(x, y)) { this.clipped += 1; return }
    this.pixels[at(x, y)] = color
  }
}

function forEachSpritePixel(rows: string[], x0: number, y0: number, fn: (x: number, y: number, key: string) => void) {
  rows.forEach((row, dy) => {
    [...row].forEach((key, dx) => { if (key !== '.') fn(x0 + dx, y0 + dy, key) })
  })
}

function bodyAt(mask: Uint8Array, x: number, y: number) {
  return inside(x, y) && mask[at(x, y)] === 1
}

/** 상하좌우가 모두 몸통인 픽셀 (외곽선에 닿지 않음) */
function insetAt(mask: Uint8Array, x: number, y: number) {
  return bodyAt(mask, x, y) && bodyAt(mask, x - 1, y) && bodyAt(mask, x + 1, y)
    && bodyAt(mask, x, y - 1) && bodyAt(mask, x, y + 1)
}

// ── 몸통 음영 ───────────────────────────────────────
function shadeBody(mask: Uint8Array) {
  const { minX, minY, maxX, maxY } = maskBounds(mask)
  const cx = (minX + maxX + 1) / 2
  const cy = (minY + maxY + 1) / 2
  const rx = (maxX - minX + 1) / 2
  const ry = (maxY - minY + 1) / 2
  let tones = new Uint8Array(N * N).fill(255)
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (!mask[at(x, y)]) continue
      const u = (x + 0.5 - cx) / rx
      const v = (y + 0.5 - cy) / ry
      const normal = Math.sqrt(Math.max(0, 1 - u * u - v * v))
      // 왼쪽 위에서 오는 빛
      const light = 0.6 * normal - 0.4 * u - 0.55 * v
      let tone: number = light > 0.7 ? TONE.light : light > 0.12 ? TONE.base : light > -0.3 ? TONE.shadow : TONE.deep
      if (!bodyAt(mask, x, y + 1)) tone = TONE.deep
      else if (!bodyAt(mask, x, y + 2) || !bodyAt(mask, x + 1, y)) tone = Math.max(tone, TONE.shadow)
      if (!bodyAt(mask, x, y - 1) && tone === TONE.base && u < 0.3) tone = TONE.light
      tones[at(x, y)] = tone
    }
  }
  // 고립된 1픽셀 음영 제거 → 경계가 깔끔한 덩어리 음영
  for (let pass = 0; pass < 2; pass += 1) {
    const next = new Uint8Array(tones)
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const tone = tones[at(x, y)]
        if (tone === 255) continue
        const counts = new Map<number, number>()
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          if (!bodyAt(mask, nx, ny)) continue
          const other = tones[at(nx, ny)]
          counts.set(other, (counts.get(other) ?? 0) + 1)
        }
        for (const [other, count] of counts) {
          if (other !== tone && count >= 3) next[at(x, y)] = other
        }
      }
    }
    tones = next
  }
  return tones
}

const GLOSS = ['.hh', 'hh.', 'h..']

function placeHighlight(mask: Uint8Array, tones: Uint8Array) {
  const { minX, maxX } = maskBounds(mask)
  const rx = (maxX - minX + 1) / 2
  const hx = Math.round(32 - 0.5 * rx)
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const x0 = hx - 1 + (attempt % 3)
    const y0 = topAt(mask, hx) + 3 + Math.floor(attempt / 3)
    let fits = true
    forEachSpritePixel(GLOSS, x0, y0, (x, y) => { if (!insetAt(mask, x, y)) fits = false })
    if (!fits) continue
    forEachSpritePixel(GLOSS, x0, y0, (x, y) => { tones[at(x, y)] = TONE.highlight })
    return
  }
}

// ── 스프라이트 찍기 (외곽선 자동) ────────────────────
function stampPixels(
  canvas: PixelCanvas,
  layer: Uint8Array,
  pixels: Array<{ x: number; y: number; color: string; bare?: boolean }>,
  outlineColor: string | null,
  skipOutline?: Uint8Array,
) {
  const own = new Set(pixels.map(({ x, y }) => `${x},${y}`))
  if (outlineColor) {
    for (const { x, y, bare } of pixels) {
      if (bare) continue
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (own.has(`${nx},${ny}`)) continue
        if (skipOutline && inside(nx, ny) && skipOutline[at(nx, ny)]) continue
        canvas.set(nx, ny, outlineColor)
        if (inside(nx, ny)) layer[at(nx, ny)] = 1
      }
    }
  }
  for (const { x, y, color } of pixels) {
    canvas.set(x, y, color)
    if (inside(x, y)) layer[at(x, y)] = 1
  }
}

function spritePixels(sprite: PixelSprite, x0: number, y0: number, mirror = false) {
  const rows = mirror ? mirrorSprite(sprite.rows) : sprite.rows
  const pixels: Array<{ x: number; y: number; color: string; bare?: boolean }> = []
  forEachSpritePixel(rows, x0, y0, (x, y, key) => {
    pixels.push({ x, y, color: sprite.colors[key], bare: sprite.bare?.includes(key) })
  })
  return pixels
}

function stampSprite(canvas: PixelCanvas, layer: Uint8Array, sprite: PixelSprite, x0: number, y0: number, mirror = false) {
  stampPixels(canvas, layer, spritePixels(sprite, x0, y0, mirror), sprite.outline === false ? null : DECORATION_OUTLINE)
}

const spriteSize = (sprite: PixelSprite) => ({
  w: Math.max(...sprite.rows.map((row) => row.length)),
  h: sprite.rows.length,
})

/** 작은 6~10px 소품을 nearest-neighbor 방식으로 2배 확대해 실루엣을 읽기 쉽게 한다. */
function detailedDecorationSprite(sprite: PixelSprite, anchor: 'hand' | 'head' | 'around'): PixelSprite {
  const { w, h } = spriteSize(sprite)
  if (anchor === 'around' || w > 10 || h > 10) return sprite
  const rows = sprite.rows.flatMap((row) => {
    const expanded = [...row].map((key) => key.repeat(2)).join('')
    return [expanded, expanded]
  })
  return { ...sprite, rows }
}

// ── 떠 있는 장식 자리 찾기 ──────────────────────────
interface Slot { ax: number; ay: number; dx: number; dy: number; alignX: 'start' | 'end' | 'center'; alignY: 'start' | 'end' | 'center' }

function slotsFor(mask: Uint8Array): Slot[] {
  const { minX, minY, maxX } = maskBounds(mask)
  return [
    { ax: maxX - 4, ay: minY + 1, dx: 1, dy: -1, alignX: 'start', alignY: 'end' },
    { ax: minX + 4, ay: minY + 1, dx: -1, dy: -1, alignX: 'end', alignY: 'end' },
    { ax: maxX + 2, ay: minY + 10, dx: 1, dy: 0, alignX: 'start', alignY: 'center' },
    { ax: minX - 2, ay: minY + 10, dx: -1, dy: 0, alignX: 'end', alignY: 'center' },
    { ax: 32, ay: minY - 3, dx: 0, dy: -1, alignX: 'center', alignY: 'end' },
  ]
}

function fitsAt(canvas: PixelCanvas, x0: number, y0: number, w: number, h: number) {
  if (x0 < 1 || y0 < 1 || x0 + w > N - 1 || y0 + h > N - 1) return false
  for (let y = y0 - 1; y <= y0 + h; y += 1) {
    for (let x = x0 - 1; x <= x0 + w; x += 1) {
      if (inside(x, y) && canvas.pixels[at(x, y)] !== null) return false
    }
  }
  return true
}

function findSlot(canvas: PixelCanvas, slot: Slot, w: number, h: number) {
  const align = (anchor: number, size: number, mode: Slot['alignX']) =>
    mode === 'start' ? anchor : mode === 'end' ? anchor - size + 1 : anchor - Math.floor(size / 2)
  const x0 = align(slot.ax, w, slot.alignX)
  const y0 = align(slot.ay, h, slot.alignY)
  for (let step = 0; step <= 10; step += 1) {
    const x = x0 + slot.dx * step
    const y = y0 + slot.dy * step
    if (fitsAt(canvas, x, y, w, h)) return { x, y }
  }
  return null
}

// ── 본체 ────────────────────────────────────────────
export function pickSilhouette(spec: CharacterSpec, rand: () => number): SilhouetteId {
  if (spec.silhouette && SILHOUETTE_IDS.includes(spec.silhouette)) return spec.silhouette
  const [first, second] = SILHOUETTE_CHOICES[spec.primary.key]
  return rand() < 0.5 ? first : second
}

export function specSeed(spec: CharacterSpec) {
  if (spec.seed !== undefined) return spec.seed >>> 0
  const secondary = spec.secondary ? `${spec.secondary.key}:${spec.secondary.score}` : '-'
  return hashSeed(`${spec.primary.key}:${spec.primary.score}|${secondary}|${(spec.keywords ?? []).join(',')}`)
}

interface FeatureSelection {
  hair: null
  animalFeature: AnimalFeatureId | null
  decoration: DecorationId | null
  effect: EffectId | null
  complexity: { used: number; budget: number }
}

function featureSelection(
  spec: CharacterSpec,
  level: ExpressionLevel,
  rand: () => number,
): FeatureSelection {
  const overrides = spec.features ?? {}

  const animalFeature = overrides.animalFeature !== undefined
    ? overrides.animalFeature
    : rand() < 0.16 ? (rand() < 0.5 ? 'cat_ears' : 'bear_ears') : null

  const keywordDecoration = decorationForKeywords(spec.keywords ?? [])
  let decoration = overrides.decoration !== undefined
    ? overrides.decoration
    : keywordDecoration && rand() < 0.72 ? keywordDecoration : null

  // 감정 이펙트는 보조감정 전용 투명 레이어에서 그린다. 이 필드는
  // 개발용 수동 비교 이펙트만 허용하며 주감정으로 자동 생성하지 않는다.
  let effect = overrides.effect !== undefined
    ? overrides.effect
    : null

  const budget = level === 1 ? 2 : level === 2 ? 3 : 4
  const cost = () => (animalFeature ? 1 : 0) + (decoration ? 2 : 0) + (effect ? 1 : 0)

  // 명시적으로 고른 요소는 유지하고 자동 요소만 덜어낸다.
  while (cost() > budget) {
    if (effect && overrides.effect === undefined) { effect = null; continue }
    if (decoration && overrides.decoration === undefined) { decoration = null; continue }
    break
  }

  const explicitCost = (overrides.animalFeature ? 1 : 0) + (overrides.decoration ? 2 : 0) + (overrides.effect ? 1 : 0)
  return { hair: null, animalFeature, decoration, effect, complexity: { used: cost(), budget: Math.max(budget, explicitCost) } }
}

export function renderCharacter(spec: CharacterSpec): RenderedCharacter {
  const rand = random(specSeed(spec))
  const silhouetteId = pickSilhouette(spec, rand)
  const silhouette = SILHOUETTES[silhouetteId]
  const mask = silhouette.mask
  const secondary = spec.secondary && spec.secondary.key !== spec.primary.key && spec.secondary.score > 0
    ? spec.secondary
    : null
  const palette = buildPalette(spec.primary)
  const level = levelForScore(spec.primary.score)
  const selected = featureSelection(spec, level, rand)
  const canvas = new PixelCanvas()
  const layers = {
    body: new Uint8Array(mask),
    hair: new Uint8Array(N * N),
    animalFeature: new Uint8Array(N * N),
    face: new Uint8Array(N * N),
    decoration: new Uint8Array(N * N),
    effect: new Uint8Array(N * N),
  }
  const issues = {
    clipped: 0,
    faceOutside: 0,
    faceOverlap: 0,
    hairFaceOverlap: 0,
    animalFeatureFaceOverlap: 0,
    decorationFaceOverlap: 0,
  }

  // 1) 몸통: 주 감정의 음영과 색만 사용한다. 보조 감정은 외부 이펙트로 분리한다.
  const tones = shadeBody(mask)
  const pattern: PatternKind = 'none'
  placeHighlight(mask, tones)
  for (let i = 0; i < N * N; i += 1) {
    if (!mask[i]) continue
    const ramp: Ramp = palette.body
    canvas.pixels[i] = ramp[tones[i]]
  }
  // 2) 외곽선 (1픽셀, 상하좌우 인접)
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (mask[at(x, y)]) continue
      if (bodyAt(mask, x - 1, y) || bodyAt(mask, x + 1, y) || bodyAt(mask, x, y - 1) || bodyAt(mask, x, y + 1)) {
        canvas.pixels[at(x, y)] = palette.body[TONE.outline]
      }
    }
  }

  // 3) 선택형 동물 귀. 몸통 마스크는 건드리지 않고 검증된 작은 픽셀만 덧그린다.
  if (selected.animalFeature) {
    drawAnimalFeature(canvas, layers.animalFeature, selected.animalFeature, mask, palette)
  }

  // 4) 표정: 볼터치 → 눈썹 → 눈 → 입 (각각 독립 레이어)
  const expression = expressionFor(spec.primary.key, level)
  const { eyeY, gap } = silhouette.face
  const putFace = (x: number, y: number, color: string) => {
    if (!insetAt(mask, x, y)) issues.faceOutside += 1
    if (inside(x, y) && layers.face[at(x, y)]) issues.faceOverlap += 1
    if (inside(x, y)) layers.face[at(x, y)] = 1
    canvas.set(x, y, color)
  }
  const faceColor = (key: string) => (key === 's' ? palette.body[TONE.shadow] : FACE_COLORS[key])
  const drawPair = (left: string[], right: string[] | undefined, top: number, eyeWidth: number) => {
    const width = left[0].length
    const x0 = 32 - gap - eyeWidth + Math.floor((eyeWidth - width) / 2)
    forEachSpritePixel(left, x0, top, (x, y, key) => putFace(x, y, faceColor(key)))
    const rightRows = right ?? mirrorSprite(left)
    const rightX0 = N - x0 - rightRows[0].length
    forEachSpritePixel(rightRows, rightX0, top, (x, y, key) => putFace(x, y, faceColor(key)))
  }

  const eyeWidth = expression.eyes[0].length
  const eyeTop = expression.eyes.length <= 2 ? eyeY - 1 : eyeY - 2
  if (expression.blush) {
    const cheekX = 32 - gap - eyeWidth - 2
    for (const x of [cheekX, cheekX + 1, cheekX + 2]) {
      putFace(x, eyeY + 3, palette.blush)
      putFace(N - 1 - x, eyeY + 3, palette.blush)
    }
  }
  const browRows = expression.brows
  if (browRows) {
    drawPair(browRows, expression.browsRight ?? undefined, eyeY - 3 - browRows.length, eyeWidth)
  }
  drawPair(expression.eyes, expression.eyesRight, eyeTop, eyeWidth)
  const mouthWidth = expression.mouth[0].length
  forEachSpritePixel(expression.mouth, 32 - mouthWidth / 2, eyeY + 4, (x, y, key) => putFace(x, y, faceColor(key)))

  // 4) 선택형 소품과 이펙트. 둘 다 null이 정상적인 완성 상태다.
  const decoration = selected.decoration
  if (decoration) drawDecoration(canvas, layers.decoration, decoration, silhouette, palette)

  const effectId = selected.effect
  const effectCount = effectId ? 1 : 0
  const effects: EffectId[] = []
  const slots = slotsFor(mask)
  const order = rand() < 0.5 ? [0, 1, 2, 3, 4] : [1, 0, 3, 2, 4]
  if (effectId) {
    const [big, small] = EFFECT_SPRITES[effectId]
    for (const slotIndex of order) {
      if (effects.length >= effectCount) break
      const sprite = effects.length === 0 ? big : small
      const { w, h } = spriteSize(sprite)
      const spot = findSlot(canvas, slots[slotIndex], w, h)
      if (!spot) continue
      stampSprite(canvas, layers.effect, sprite, spot.x, spot.y)
      effects.push(effectId)
    }
  }

  issues.clipped = canvas.clipped
  for (let i = 0; i < N * N; i += 1) {
    if (layers.hair[i] && layers.face[i]) issues.hairFaceOverlap += 1
    if (layers.animalFeature[i] && layers.face[i]) issues.animalFeatureFaceOverlap += 1
    if ((layers.decoration[i] || layers.effect[i]) && layers.face[i]) issues.decorationFaceOverlap += 1
  }
  return {
    size: N,
    pixels: canvas.pixels,
    silhouette: silhouetteId,
    level,
    palette,
    pattern,
    hair: selected.hair,
    animalFeature: selected.animalFeature,
    decoration,
    effects,
    secondaryEffect: secondary?.key ?? null,
    rendererVersion: 'pixel-v5',
    complexity: selected.complexity,
    layers,
    issues,
  }
}

function drawAnimalFeature(
  canvas: PixelCanvas,
  layer: Uint8Array,
  feature: AnimalFeatureId,
  mask: Uint8Array,
  palette: CharacterPalette,
) {
  const top = topAt(mask, 32)
  const colors = { k: palette.body[TONE.outline], b: palette.body[TONE.base], l: palette.body[TONE.light] }
  const sprite: PixelSprite = feature === 'cat_ears'
    ? { rows: ['..k...', '.kbk..', 'kblbk.', 'kbbbbk'], colors, outline: false }
    : { rows: ['.kkkk.', 'kbbbbk', 'kblbbk', '.kkkk.'], colors, outline: false }
  const { w, h } = spriteSize(sprite)
  const y = Math.max(1, top - h + 2)
  stampSprite(canvas, layer, sprite, 20 - Math.floor(w / 2), y)
  stampSprite(canvas, layer, sprite, 44 - Math.floor(w / 2), y, true)
}

function drawDecoration(
  canvas: PixelCanvas,
  layer: Uint8Array,
  decoration: DecorationId,
  silhouette: Silhouette,
  palette: CharacterPalette,
) {
  const mask = silhouette.mask
  const bounds = maskBounds(mask)
  const anchor = DECORATION_ANCHOR[decoration]

  if (decoration === 'headphones') {
    drawHeadphones(canvas, layer, silhouette)
    return
  }
  const sprite = detailedDecorationSprite(ITEM_SPRITES[decoration], anchor)
  const { w, h } = spriteSize(sprite)

  if (anchor === 'hand') {
    const handY = bounds.maxY - Math.round((bounds.maxY - bounds.minY) * 0.35)
    const edge = rowSpan(mask, handY).max
    const x0 = Math.min(edge - 2, N - 2 - w)
    const y0 = Math.max(2, Math.min(handY - Math.floor(h / 2), N - 2 - h))
    stampSprite(canvas, layer, sprite, x0, y0)
    // 소품을 감싸 쥔 작은 손: 소품 쪽으로만 외곽선을 두르고 몸통 쪽은 이어 붙인다.
    const pawY = y0 + h - 4
    const bodyOnly = mask.map((value, i) => (value && !layer[i] ? 1 : 0))
    stampPixels(
      canvas,
      layer,
      [
        { x: x0, y: pawY, color: palette.body[TONE.light] },
        { x: x0 + 1, y: pawY, color: palette.body[TONE.base] },
        { x: x0, y: pawY + 1, color: palette.body[TONE.base] },
        { x: x0 + 1, y: pawY + 1, color: palette.body[TONE.shadow] },
      ],
      palette.body[TONE.outline],
      bodyOnly,
    )
    return
  }

  if (anchor === 'head') {
    const x0 = Math.round(32 - w / 2)
    const y0 = Math.max(1, topAt(mask, 32) - h + 1)
    stampSprite(canvas, layer, sprite, x0, y0)
    return
  }

  const slot = findSlot(canvas, slotsFor(mask)[0], w, h) ?? findSlot(canvas, slotsFor(mask)[1], w, h)
  if (slot) stampSprite(canvas, layer, sprite, slot.x, slot.y)
}

function drawHeadphones(canvas: PixelCanvas, layer: Uint8Array, silhouette: Silhouette) {
  const mask = silhouette.mask
  const cupRow = silhouette.face.eyeY - 3
  const { min: left, max: right } = rowSpan(mask, cupRow)
  const cupTop = cupRow - 3
  // 머리 윤곽을 따라가는 밴드 (외곽선 바로 위)
  const heights = new Map<number, number>()
  for (let x = left - 1; x <= right + 1; x += 1) {
    heights.set(x, x >= left && x <= right ? Math.min(topAt(mask, x), cupRow) - 2 : cupTop - 1)
  }
  const band = new Map<string, { x: number; y: number }>()
  const add = (x: number, y: number) => band.set(`${x},${y}`, { x, y })
  for (let x = left - 1; x <= right + 1; x += 1) {
    const y = heights.get(x)!
    add(x, y)
    add(x, y - 1)
    const previous = heights.get(x - 1)
    if (previous !== undefined) {
      for (let fill = Math.min(previous, y); fill <= Math.max(previous, y); fill += 1) add(x, fill)
    }
  }
  const columnTop = new Map<number, number>()
  for (const { x, y } of band.values()) columnTop.set(x, Math.min(columnTop.get(x) ?? N, y))
  stampPixels(
    canvas,
    layer,
    [...band.values()].map(({ x, y }) => ({
      x, y, color: columnTop.get(x) === y ? HEADPHONE_COLORS.bandLight : HEADPHONE_COLORS.band,
    })),
    DECORATION_OUTLINE,
  )
  stampSprite(canvas, layer, HEADPHONE_CUP, left - 2, cupTop)
  stampSprite(canvas, layer, HEADPHONE_CUP, right, cupTop, true)
}

/** 픽셀 배열 → RGBA 바이트 (투명 배경 유지) */
export function toRgba(pixels: (string | null)[]) {
  const data = new Uint8ClampedArray(pixels.length * 4)
  pixels.forEach((color, i) => {
    if (!color) return
    data[i * 4] = parseInt(color.slice(1, 3), 16)
    data[i * 4 + 1] = parseInt(color.slice(3, 5), 16)
    data[i * 4 + 2] = parseInt(color.slice(5, 7), 16)
    data[i * 4 + 3] = 255
  })
  return data
}
