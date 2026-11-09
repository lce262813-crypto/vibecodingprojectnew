import { describe, expect, it } from 'vitest'

import { decorationForKeywords, EFFECT_SPRITES, type DecorationId } from './decorations'
import { EMOTION_COLOR_SEEDS, EMOTION_KEYS } from './palette'
import { renderCharacter } from './renderCharacter'
import { renderStoredPixelCharacter } from './renderStoredCharacter'
import { SILHOUETTES, SILHOUETTE_IDS, analyzeMask } from './silhouettes'

const KEYWORD_FOR: Record<DecorationId, string> = {
  coffee: '카페 라떼', drink: '버블티', beer: '맥주', book: '시험 공부', headphones: '음악',
  flower: '꽃 산책', heart: '친구', gamepad: '게임', medal: '대회에서 우승', bag: '여행',
  umbrella: '우산', sleepCap: '수면',
  briefcase: '회사 회의', pencil: '일기 메모', camera: '풍경 사진', ticket: '영화 예매',
  gift: '깜짝 선물', cake: '생일 케이크', phone: '친구와 통화', medicine: '감기약',
  paw: '고양이', meal: '저녁 식사', sneaker: '달리기 운동', paintbrush: '수채화 그림',
  pizza: '페퍼로니 피자', burger: '수제 햄버거', chicken: '친구와 치킨', sushi: '회전초밥',
  fruit: '달콤한 딸기', icecream: '젤라또 아이스크림', wine: '와인 한 잔', cocktail: '하이볼',
  key: '새집 열쇠', letter: '손편지', laptop: '노트북 코딩', shopping: '주말 쇼핑',
  plant: '화분 분갈이', beach: '바닷가 조개', house: '집들이', money: '월급날 저축',
}

describe('silhouette masks', () => {
  it('hides props from stored characters while preserving their saved appearance data', () => {
    const rendered = renderStoredPixelCharacter({
      appearance: {
        renderer_version: 'pixel-v5',
        render_spec: {
          seed: 123, primary_emotion: 'joy', primary_intensity: 80,
          secondary_emotion: null, secondary_intensity: 0,
          silhouette_id: 'round', decoration_id: 'coffee', objects: ['커피'],
        },
      },
    })
    expect(rendered).not.toBeNull()
    expect(rendered!.layers.decoration.every((pixel) => pixel === 0)).toBe(true)
  })

  it('preserves the original eight silhouettes and adds heart and star', () => {
    expect(SILHOUETTE_IDS).toEqual(['round', 'drop', 'flat', 'wave', 'bean', 'spiky', 'ears', 'mochi', 'heart', 'star'])
  })

  it.each(SILHOUETTE_IDS)('%s is one clean, symmetric piece with no holes', (id) => {
    const report = analyzeMask(SILHOUETTES[id].mask)
    expect(report).toMatchObject({
      components: 1, holes: 0, spurs: 0, notches: 0, symmetric: true, hasMargin: true,
    })
    expect(report.pixels).toBeGreaterThan(600)
  })
})

describe('renderCharacter', () => {
  it('places the heart face higher without changing other silhouette anchors', () => {
    expect(SILHOUETTES.heart.face.eyeY).toBe(35)
    expect(SILHOUETTES.round.face.eyeY).toBe(39)
    expect(SILHOUETTES.star.face.eyeY).toBe(41)
  })

  it('uses the six approved emotion-group silhouettes', () => {
    const expected = {
      joy: 'round', pride: 'round', moved: 'round',
      excitement: 'heart', shyness: 'heart',
      calm: 'flat', fatigue: 'flat', lethargy: 'flat',
      sadness: 'wave', loneliness: 'wave', disappointment: 'wave',
      anger: 'spiky', irritation: 'spiky',
      anxiety: 'drop', embarrassment: 'drop', confusion: 'drop',
    } as const
    for (const [key, silhouette] of Object.entries(expected)) {
      expect(renderCharacter({ primary: { key: key as keyof typeof expected, score: 50 }, seed: 1 }).silhouette).toBe(silhouette)
    }
  })

  it('keeps every expression inside the body for every silhouette and level', () => {
    for (const silhouette of SILHOUETTE_IDS) {
      for (const key of EMOTION_KEYS) {
        for (const score of [10, 30, 50, 70, 90]) {
          const result = renderCharacter({ primary: { key, score }, silhouette, seed: 1 })
          expect(result.issues, `${silhouette}/${key}/${score}`).toMatchObject({
            clipped: 0, faceOutside: 0, faceOverlap: 0,
            hairFaceOverlap: 0, decorationFaceOverlap: 0,
          })
        }
      }
    }
  })

  it('uses only opaque hard-edged colors and keeps the background transparent', () => {
    const result = renderCharacter({ primary: { key: 'joy', score: 80 }, keywords: ['카페'] })
    expect(result.pixels).toHaveLength(64 * 64)
    expect(result.pixels[0]).toBeNull()
    for (const color of result.pixels) {
      if (color !== null) expect(color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('shades every body with at least five tones', () => {
    for (const key of EMOTION_KEYS) {
      const result = renderCharacter({ primary: { key, score: 60 }, seed: 2 })
      const bodyColors = new Set(
        result.pixels.filter((_, i) => result.layers.body[i] && !result.layers.face[i]),
      )
      for (const tone of result.palette.body.slice(0, 5)) expect(bodyColors).toContain(tone)
    }
  })

  it('changes color and expression with intensity', () => {
    const soft = renderCharacter({ primary: { key: 'anger', score: 30 }, seed: 4 })
    const strong = renderCharacter({ primary: { key: 'anger', score: 90 }, seed: 4 })
    expect(soft.silhouette).toBe(strong.silhouette)
    expect(soft.palette.body[2]).not.toBe(strong.palette.body[2])
    expect([soft.level, strong.level]).toEqual([2, 5])
    expect(soft.complexity.budget).toBeLessThan(strong.complexity.budget)
  })

  it('gives different emotions clearly different base colors', () => {
    const bases = EMOTION_KEYS.map((key) => renderCharacter({ primary: { key, score: 60 } }).palette.body[2])
    expect(new Set(bases).size).toBe(EMOTION_KEYS.length)
  })

  it('uses the approved unique color seed at medium intensity', () => {
    expect(EMOTION_KEYS.map((key) => EMOTION_COLOR_SEEDS[key].seed)).toEqual(
      Array.from({ length: 16 }, (_, index) => 1101 + index),
    )
    for (const key of EMOTION_KEYS) {
      const result = renderCharacter({ primary: { key, score: 50 }, seed: 1 })
      expect(result.palette.body[2], key).toBe(EMOTION_COLOR_SEEDS[key].base)
    }
  })

  it('keeps the primary color unchanged and records the secondary emotion as an effect', () => {
    for (const [primaryScore, secondaryScore] of [[90, 10], [70, 30], [55, 45]]) {
      const primaryOnly = renderCharacter({ primary: { key: 'joy', score: primaryScore }, seed: 5 })
      const mixed = renderCharacter({
        primary: { key: 'joy', score: primaryScore },
        secondary: { key: 'sadness', score: secondaryScore },
        seed: 5,
      })
      expect(mixed.palette.body).toEqual(primaryOnly.palette.body)
      expect(mixed.pattern).toBe('none')
      expect(mixed.secondaryEffect).toBe('sadness')
    }
  })

  it('detects diary-keyword candidates but allows both decoration and effect to be absent', () => {
    for (const [decoration, keyword] of Object.entries(KEYWORD_FOR)) {
      expect(decorationForKeywords([keyword]), `${decoration}/${keyword}`).toBe(decoration)
    }
    expect(decorationForKeywords(['오늘 카페에서 라떼'])).toBe('coffee')
    expect(decorationForKeywords(['도서관', '커피'])).toBe('book')
    expect(decorationForKeywords(['한강 산책'])).toBe('flower')
    expect(decorationForKeywords(['회사에서 야근했다'])).toBe('briefcase')
    expect(decorationForKeywords(['강아지와 놀았다'])).toBe('paw')
    expect(decorationForKeywords(['생일 케이크를 먹었다'])).toBe('cake')
    expect(decorationForKeywords(['청소'])).toBeNull()

    const plain = renderCharacter({
      primary: { key: 'joy', score: 30 }, keywords: ['청소'],
      features: { decoration: null, effect: null },
    })
    expect(plain.decoration).toBeNull()
    expect(plain.effects).toEqual([])

    const forced = renderCharacter({
      primary: { key: 'joy', score: 30 },
      features: { decoration: null, effect: 'sparkle' },
    })
    expect(forced.effects).toEqual(['sparkle'])
  })

  it('places every decoration without clipping on every silhouette', () => {
    for (const silhouette of SILHOUETTE_IDS) {
      for (const [decoration, keyword] of Object.entries(KEYWORD_FOR)) {
        const result = renderCharacter({
          primary: { key: 'pride', score: 90 }, keywords: [keyword], silhouette,
          features: { decoration: decoration as DecorationId, effect: null },
        })
        expect(result.decoration).toBe(decoration)
        expect(result.issues.clipped, `${silhouette}/${decoration}`).toBe(0)
        expect(result.issues.decorationFaceOverlap, `${silhouette}/${decoration}`).toBe(0)
        expect(result.layers.decoration.some(Boolean), `${silhouette}/${decoration}`).toBe(true)
      }
    }
  })

  it('supports simple, item-only, effect-only, and combined characters without hair', () => {
    const base = { primary: { key: 'joy' as const, score: 90 }, keywords: ['카페'], seed: 44 }
    const cases = [
      { decoration: null, effect: null },
      { decoration: 'coffee' as const, effect: null },
      { decoration: null, effect: 'sparkle' as const },
      { decoration: 'coffee' as const, effect: 'sparkle' as const },
    ].map((features) => renderCharacter({ ...base, features }))

    expect(cases.map(({ hair, decoration, effects }) => [hair, decoration, effects.length])).toEqual([
      [null, null, 0], [null, 'coffee', 0], [null, null, 1], [null, 'coffee', 1],
    ])
    for (const result of cases) expect(result.complexity.used).toBeLessThanOrEqual(result.complexity.budget)
  })

  it('keeps optional animal features on a separate layer without changing the body mask', () => {
    const base = renderCharacter({
      primary: { key: 'joy', score: 60 }, seed: 8,
      features: { animalFeature: null, decoration: null, effect: null },
    })
    for (const animalFeature of ['cat_ears', 'bear_ears'] as const) {
      const featured = renderCharacter({
        primary: { key: 'joy', score: 60 }, seed: 8,
        features: { animalFeature, decoration: null, effect: null },
      })
      expect(featured.animalFeature).toBe(animalFeature)
      expect(featured.layers.body).toEqual(base.layers.body)
      expect(featured.layers.animalFeature.some(Boolean)).toBe(true)
      expect(featured.issues.animalFeatureFaceOverlap).toBe(0)
      expect(featured.issues.clipped).toBe(0)
    }
  })

  it('never generates hair and keeps diary items optional across seeds', () => {
    const results = Array.from({ length: 80 }, (_, seed) => renderCharacter({
      primary: { key: 'excitement', score: 80 }, keywords: ['카페'], seed,
    }))
    expect(results.every((result) => result.hair === null)).toBe(true)
    expect(results.every((result) => !result.layers.hair.some(Boolean))).toBe(true)
    expect(results.some((result) => result.decoration === null)).toBe(true)
    expect(results.some((result) => result.decoration !== null)).toBe(true)
    expect(results.every((result) => result.effects.length === 0)).toBe(true)
  })

  it('does not infer a primary-emotion effect without a secondary emotion', () => {
    for (const key of ['confusion', 'anxiety'] as const) {
      const results = Array.from({ length: 100 }, (_, seed) => renderCharacter({
        primary: { key, score: 70 }, seed,
      }))
      expect(results.every((result) => result.effects.length === 0)).toBe(true)
      expect(results.every((result) => result.secondaryEffect === null)).toBe(true)
    }
  })

  it('uses clearly different pixel silhouettes and colors for tears and sweat', () => {
    expect(EFFECT_SPRITES.tear[0].rows).not.toEqual(EFFECT_SPRITES.sweat[0].rows)
    expect(EFFECT_SPRITES.tear[0].colors).not.toEqual(EFFECT_SPRITES.sweat[0].colors)

    const base = { primary: { key: 'sadness' as const, score: 80 }, seed: 77 }
    const tear = renderCharacter({ ...base, features: { decoration: null, effect: 'tear' } })
    const sweat = renderCharacter({ ...base, features: { decoration: null, effect: 'sweat' } })
    expect(tear.pixels).not.toEqual(sweat.pixels)
  })

  it('is deterministic and ignores unknown silhouettes', () => {
    const spec = { primary: { key: 'calm' as const, score: 64 }, keywords: ['음악'] }
    expect(renderCharacter(spec).pixels).toEqual(renderCharacter(spec).pixels)
    const forced = renderCharacter({ ...spec, silhouette: 'blob' as never })
    expect(SILHOUETTE_IDS).toContain(forced.silhouette)
    expect(renderCharacter(spec).rendererVersion).toBe('pixel-v5')
  })
})
