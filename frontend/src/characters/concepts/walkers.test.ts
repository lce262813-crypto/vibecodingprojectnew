import { describe, expect, it } from 'vitest'

import { EMOTION_KEYS } from '../pixel/palette'
import type { ConceptSpec, Grid } from './kit'
import { SHAPE_LABELS, SYMBOLS, renderCostumePerson, renderHatPerson, renderShapeFriend, type BodyShape } from './walkers'

const RENDERERS = [renderShapeFriend, renderHatPerson, renderCostumePerson]
const spec = (score: number): ConceptSpec => ({ primary: { key: 'joy', score }, secondary: null })
const pixels = (grid: Grid) => grid.px.join('|')
/** Which foot pixels are filled, ignoring colour and the particles at the edges. */
const footprint = (grid: Grid) => {
  const rows: string[] = []
  for (let y = 33; y < 38; y += 1) for (let x = 12; x < 28; x += 1) rows.push(grid.get(x, y) ? '#' : '.')
  return rows.join('')
}

describe('walking characters', () => {
  it('draws every emotion, and every body shape', () => {
    for (const render of RENDERERS) for (const key of EMOTION_KEYS) {
      expect(render({ primary: { key, score: 75 }, secondary: { key: 'calm', score: 50 } }).px.filter(Boolean).length).toBeGreaterThan(100)
    }
    for (const shape of Object.keys(SHAPE_LABELS) as BodyShape[]) {
      expect(renderShapeFriend(spec(60), 1, true, shape).px.filter(Boolean).length).toBeGreaterThan(100)
    }
  })

  it('has one symbol for each emotion', () => {
    const drawn = EMOTION_KEYS.map((key) => SYMBOLS[key].join(''))
    expect(new Set(drawn).size).toBe(EMOTION_KEYS.length)
  })

  it('walks with moving feet and stands still when paused', () => {
    for (const render of RENDERERS) {
      expect(pixels(render(spec(70), 1, true))).not.toBe(pixels(render(spec(70), 3, true)))
      expect(footprint(render(spec(70), 1, false))).toBe(footprint(render(spec(70), 3, false)))
    }
  })

  it('keeps the same legs at every strength, so strength never changes the pose', () => {
    for (const render of [renderHatPerson]) {
      for (const tick of [0, 1, 2, 3]) expect(footprint(render(spec(10), tick))).toBe(footprint(render(spec(95), tick)))
    }
  })

  it('changes the picture with strength and with a second emotion', () => {
    for (const render of RENDERERS) {
      expect(pixels(render(spec(95), 0))).not.toBe(pixels(render(spec(10), 0)))
      expect(pixels(render({ ...spec(50), secondary: { key: 'sadness', score: 50 } }, 0))).not.toBe(pixels(render(spec(50), 0)))
    }
  })
})
