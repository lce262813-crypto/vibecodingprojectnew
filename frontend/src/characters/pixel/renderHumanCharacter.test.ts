import { describe, expect, it } from 'vitest'

import { EMOTION_KEYS, buildPalette } from './palette'
import { renderHumanCharacter } from './renderHumanCharacter'

describe('renderHumanCharacter', () => {
  it('renders every primary emotion as a safe deterministic human sprite', () => {
    for (const [index, emotion] of EMOTION_KEYS.entries()) {
      const spec = { primary: { key: emotion, score: 70 }, secondary: { key: 'calm' as const, score: 45 }, seed: index + 1 }
      const first = renderHumanCharacter(spec)
      const second = renderHumanCharacter(spec)
      expect(first.rendererVersion).toBe('human-v1')
      expect(first.size).toBe(64)
      expect(first.pixels).toEqual(second.pixels)
      expect(first.issues.clipped).toBe(0)
      expect(first.issues.faceOutside).toBe(0)
      expect(first.pixels.some(Boolean)).toBe(true)
    }
  })

  it('keeps primary hair and color while secondary emotion changes the face', () => {
    const sadFace = renderHumanCharacter({ primary: { key: 'joy', score: 75 }, secondary: { key: 'sadness', score: 65 }, seed: 5 })
    const angryFace = renderHumanCharacter({ primary: { key: 'joy', score: 75 }, secondary: { key: 'anger', score: 65 }, seed: 5 })
    expect(sadFace.silhouette).toBe(angryFace.silhouette)
    expect(sadFace.palette).toEqual(angryFace.palette)
    expect([...sadFace.layers.hair]).toEqual([...angryFace.layers.hair])
    expect(sadFace.pixels).not.toEqual(angryFace.pixels)
  })

  it('retains the five-level intensity palette and expression behavior', () => {
    const weak = renderHumanCharacter({ primary: { key: 'anger', score: 15 }, secondary: null })
    const strong = renderHumanCharacter({ primary: { key: 'anger', score: 95 }, secondary: null })
    expect(weak.level).toBe(1)
    expect(strong.level).toBe(5)
    expect(weak.palette.body).not.toEqual(strong.palette.body)
    expect(weak.pixels).not.toEqual(strong.pixels)
  })

  it('keeps all 80 emotion/intensity faces inside the short human face and preserves the hair palette', () => {
    for (const emotion of EMOTION_KEYS) {
      for (const score of [10,30,50,70,90]) {
        const result = renderHumanCharacter({ primary: { key: 'excitement', score: 65 }, secondary: { key: emotion, score } })
        expect(result.issues.faceOutside, `${emotion}:${score}`).toBe(0)
        expect(result.issues.clipped, `${emotion}:${score}`).toBe(0)
        expect(result.palette).toEqual(buildPalette({ key: 'excitement', score: 65 }))
        expect(result.pixels.every(color => color === null || /^#[a-f\d]{6}$/i.test(color))).toBe(true)
      }
    }
  })
})
