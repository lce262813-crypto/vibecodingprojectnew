import { ITEM_SPRITES, HEADPHONE_CUP, type DecorationId } from './decorations'
import { EMOTION_EFFECTS, EMOTION_EFFECT_PALETTE } from './emotionEffects'
import { EMOTION_KEYS, type EmotionKey } from './palette'
import { renderHumanCharacter } from './renderHumanCharacter'
import type { CharacterSpec } from './renderCharacter'

export interface ReviewDesign {
  relationship_type?: string
  relationship_sequence?: string[]
  expression_intensity?: number
  effect_emotions?: Array<{ emotion: string; intensity: number }>
}

// Versioned wrapper: never change the pixels of existing human-v1 records.
export function renderReviewedCharacter(spec: CharacterSpec, design: ReviewDesign) {
  const result = renderHumanCharacter({ ...spec, secondary: null })
  result.rendererVersion = 'human-review-v1'
  const n = result.size
  function stamp(rows: readonly string[], colors: Record<string, string>, x: number, y: number, layer: 'effect' | 'decoration') {
    const cells: Array<[number, string]> = []
    rows.forEach((row, dy) => [...row].forEach((key, dx) => {
      if (key !== '.' && colors[key]) cells.push([(y + dy) * n + x + dx, colors[key]])
    }))
    if (y < 0 || x < 0 || y + rows.length > n || x + Math.max(...rows.map(row => row.length)) > n) return false
    // Whole sprite placement: no partial icon clipping, no face/hair/other prop overwrite.
    if (cells.some(([i]) => result.pixels[i] !== null)) return false
    for (const [i, color] of cells) { result.pixels[i] = color; result.layers[layer][i] = 1 }
    return true
  }
  const others = (design.effect_emotions ?? []).filter(item => EMOTION_KEYS.includes(item.emotion as EmotionKey)).slice(0, 2)
  if (design.relationship_type !== 'SINGLE') others.forEach((item, index) => {
    const emotion = item.emotion as EmotionKey
    const colors = Object.fromEntries(Object.entries(EMOTION_EFFECT_PALETTE).map(([key, value]) => {
      const blend = Math.max(0, 4 - item.intensity) * 0.1
      const color = '#' + [1, 3, 5].map(offset => Math.round(parseInt(value.slice(offset, offset + 2), 16) * (1 - blend) + 255 * blend).toString(16).padStart(2, '0')).join('')
      return [key, color]
    }))
    stamp(EMOTION_EFFECTS[emotion], colors, index === 0 ? 48 : 0, 2, 'effect')
  })
  if (design.relationship_type === 'TRANSITION') {
    stamp(['....k...', '.....k..', 'kkkkkkk.', '.....k..', '....k...'], { k: '#6d589c' }, 0, 23, 'effect')
  } else if (design.relationship_type === 'CONTRAST') {
    // Two separated brackets express contrast, not an invented second emotion.
    stamp(['kk....kk', 'k......k', 'k......k', 'kk....kk'], { k: '#6d589c' }, 0, 23, 'effect')
  }
  const decoration = spec.features?.decoration as DecorationId | null | undefined
  const sprite = decoration === 'headphones' ? HEADPHONE_CUP : decoration ? ITEM_SPRITES[decoration] : null
  if (sprite) {
    const width = Math.max(...sprite.rows.map(row => row.length))
    for (const [x, y] of [[n - width, n - sprite.rows.length], [0, n - sprite.rows.length]]) {
      if (stamp(sprite.rows, sprite.colors, x, y, 'decoration')) { result.decoration = decoration!; break }
    }
  }
  return result
}
