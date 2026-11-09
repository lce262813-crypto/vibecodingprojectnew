import { describe, expect, it } from 'vitest'

import { EMOTION_EFFECT_PALETTE, EMOTION_EFFECTS, composeCharacterWithEmotionEffect } from './emotionEffects'
import { EMOTION_COLOR_SEEDS, EMOTION_KEYS } from './palette'
import { renderCharacter } from './renderCharacter'

describe('emotion effect sprites', () => {
  it('keeps all sixteen source bitmaps at exactly 16 by 16 with the approved palette', () => {
    expect(Object.keys(EMOTION_EFFECTS)).toEqual(EMOTION_KEYS)
    const allowed = new Set(['.', ...Object.keys(EMOTION_EFFECT_PALETTE)])
    for (const emotion of EMOTION_KEYS) {
      const rows = EMOTION_EFFECTS[emotion]
      expect(rows, emotion).toHaveLength(16)
      for (const row of rows) {
        expect(row, `${emotion}/${row}`).toHaveLength(16)
        for (const key of row) expect(allowed.has(key), `${emotion}/${key}`).toBe(true)
      }
    }
  })

  it('renders every effect without clipping and keeps body pixels in front', () => {
    for (const emotion of EMOTION_KEYS) {
      const character = renderCharacter({
        primary: { key: emotion, score: 50 },
        seed: EMOTION_COLOR_SEEDS[emotion].seed,
        features: { decoration: null, effect: 'sparkle' },
      })
      const composition = composeCharacterWithEmotionEffect(character, emotion)
      expect(composition.width, emotion).toBe(80)
      expect(composition.height, emotion).toBe(64)
      expect(composition.clipped, emotion).toBe(0)
      for (let y = 0; y < character.size; y += 1) {
        for (let x = 0; x < character.size; x += 1) {
          const source = y * character.size + x
          if (!character.layers.body[source]) continue
          expect(composition.pixels[y * composition.width + x], `${emotion}/${x},${y}`).toBe(character.pixels[source])
        }
      }
    }
  })

  it('creates a deterministic two-frame one-pixel vertical loop', () => {
    const character = renderCharacter({
      primary: { key: 'joy', score: 50 }, seed: 1101,
      features: { decoration: null, effect: null },
    })
    const down = composeCharacterWithEmotionEffect(character, 'joy', false)
    const up = composeCharacterWithEmotionEffect(character, 'joy', true)
    expect(down.pixels).not.toEqual(up.pixels)
    expect(composeCharacterWithEmotionEffect(character, 'joy', false).pixels).toEqual(down.pixels)
    expect(composeCharacterWithEmotionEffect(character, 'joy', true).pixels).toEqual(up.pixels)
  })

  it('maps a secondary emotion to its effect without changing the primary body palette', () => {
    const primaryOnly = renderCharacter({ primary: { key: 'joy', score: 70 }, seed: 77 })
    const combined = renderCharacter({
      primary: { key: 'joy', score: 70 },
      secondary: { key: 'fatigue', score: 30 },
      seed: 77,
    })
    expect(combined.palette.body).toEqual(primaryOnly.palette.body)
    expect(combined.secondaryEffect).toBe('fatigue')
    expect(composeCharacterWithEmotionEffect(combined, combined.secondaryEffect!).pixels)
      .not.toEqual(combined.pixels)
  })

  it('uses a red four-way mark for anger and a dark tangled scribble for irritation', () => {
    const usedKeys = (rows: readonly string[]) => new Set(rows.join('').replaceAll('.', ''))
    expect(usedKeys(EMOTION_EFFECTS.anger)).toEqual(new Set(['r']))
    expect(usedKeys(EMOTION_EFFECTS.irritation)).toEqual(new Set(['k']))
    expect(EMOTION_EFFECTS.anger).not.toEqual(EMOTION_EFFECTS.irritation)
  })

  it('uses a ribbon and round gold medal instead of a star for pride', () => {
    const usedKeys = new Set(EMOTION_EFFECTS.pride.join('').replaceAll('.', ''))
    expect(usedKeys).toEqual(new Set(['C', 'c', 'k', 'y', 'w', 'o']))
    expect(EMOTION_EFFECTS.pride.join('')).not.toContain('kkkkkyyykkkkk')
    for (const row of EMOTION_EFFECTS.pride.slice(6, 14)) {
      const outline = [...row].map((key, index) => key === 'k' ? index : -1).filter((index) => index >= 0)
      expect(outline, row).toEqual(outline.map((index) => 15 - index).reverse())
    }
  })
})
