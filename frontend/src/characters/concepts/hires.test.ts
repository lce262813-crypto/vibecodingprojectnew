import { describe, expect, it } from 'vitest'

import { EMOTION_KEYS } from '../pixel/palette'
import { SECONDARY_MODES, hiFaceFor, rampFrom, renderHiFriend, type HiGrid } from './hires'
import type { ConceptSpec } from './kit'

const pixels = (grid: HiGrid) => grid.px.join('|')
const pair = (score: number): ConceptSpec => ({ primary: { key: 'joy', score: 70 }, secondary: { key: 'sadness', score } })

describe('high-resolution friends', () => {
  it('defines five different faces for every emotion', () => {
    for (const key of EMOTION_KEYS) {
      const faces = ([1, 2, 3, 4, 5] as const).map((level) => JSON.stringify(hiFaceFor(key, level)))
      expect(new Set(faces).size).toBe(5)
    }
  })

  it('draws every emotion at every strength', () => {
    for (const key of EMOTION_KEYS) for (const score of [10, 30, 50, 70, 95]) {
      expect(renderHiFriend({ primary: { key, score }, secondary: null }).px.filter(Boolean).length).toBeGreaterThan(400)
    }
  })

  it('uses seven distinct tones so bodies are not flat', () => {
    for (const hex of ['#ffd84d', '#669fe3', '#e5484d']) expect(new Set(rampFrom(hex).tones).size).toBe(7)
    const colors = new Set(renderHiFriend({ primary: { key: 'calm', score: 70 }, secondary: null }).px.filter(Boolean))
    expect(colors.size).toBeGreaterThan(8)
  })

  it('shows three different steps of the second emotion in each mode', () => {
    for (const mode of SECONDARY_MODES) {
      const steps = [20, 50, 85].map((score) => pixels(renderHiFriend(pair(score), { tick: 0, mode })))
      expect(new Set(steps).size).toBe(3)
    }
  })

  it('reuses a finished frame for the same input', () => {
    expect(renderHiFriend(pair(50), { tick: 3 })).toBe(renderHiFriend(pair(50), { tick: 3 }))
  })
})
