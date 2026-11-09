import { describe, expect, it } from 'vitest'

import { EMOTION_KEYS } from '../pixel/palette'
import type { ConceptSpec, Grid } from './kit'
import { renderCostumeFriend, renderHeartPlant, renderMarbleJelly, renderMoodBottle, renderWeatherPerson } from './renderers'

const RENDERERS = [renderWeatherPerson, renderCostumeFriend, renderHeartPlant, renderMoodBottle, renderMarbleJelly]
const pixels = (grid: Grid) => grid.px.join('|')

describe('character concepts', () => {
  it('draws every emotion with every concept', () => {
    for (const render of RENDERERS) for (const key of EMOTION_KEYS) {
      expect(render({ primary: { key, score: 75 }, secondary: null }).px.filter(Boolean).length).toBeGreaterThan(100)
    }
  })

  it('changes with strength and with a second emotion', () => {
    const base: ConceptSpec = { primary: { key: 'joy', score: 30 }, secondary: null }
    for (const render of RENDERERS) {
      expect(pixels(render({ ...base, primary: { key: 'joy', score: 95 } }))).not.toBe(pixels(render(base)))
      expect(pixels(render({ ...base, secondary: { key: 'sadness', score: 50 } }))).not.toBe(pixels(render(base)))
    }
  })

  it('gives the same picture for the same input', () => {
    const spec: ConceptSpec = { primary: { key: 'anger', score: 80 }, secondary: { key: 'fatigue', score: 40 } }
    for (const render of RENDERERS) expect(pixels(render(spec))).toBe(pixels(render(spec)))
  })
})
