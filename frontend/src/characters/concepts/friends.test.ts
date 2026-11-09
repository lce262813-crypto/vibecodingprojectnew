import { describe, expect, it } from 'vitest'

import { heldItemArt } from './heldItemArt'
import { DECORATION_IDS, decorationForKeywords, ITEM_SPRITES, ITEM_SPRITES_V2 } from '../pixel/decorations'
import { EMOTION_KEYS } from '../pixel/palette'
import { ACCESSORIES, renderFriend } from './friends'
import type { ConceptSpec, Grid } from './kit'

const pixels = (grid: Grid) => grid.px.join('|')
const withSecond = (score: number): ConceptSpec => ({ primary: { key: 'joy', score: 70 }, secondary: { key: 'sadness', score } })

describe('body-shape friends', () => {
  it('keeps the reference redraws within the original prop footprints', () => {
    for (const item of ['sleepCap', 'beer'] as const) {
      const original = ITEM_SPRITES[item]
      const revised = ITEM_SPRITES_V2[item]!
      expect(Math.max(...revised.rows.map((row) => row.length))).toBe(Math.max(...original.rows.map((row) => row.length)))
      expect(revised.rows.length).toBe(original.rows.length)
      const character = { primary: { key: 'joy' as const, score: 60 }, secondary: null }
      expect(pixels(renderFriend(character, { walking: false, item, itemArt: 'reference' })))
        .not.toBe(pixels(renderFriend(character, { walking: false, item, itemArt: 'original' })))
    }
  })

  it('shows a different expression at the lowest and highest strength of every emotion', () => {
    for (const key of EMOTION_KEYS) {
      // Face ink positions only, so body size and colour cannot make this pass by accident.
      const face = (score: number) => renderFriend({ primary: { key, score }, secondary: null }, { tick: 0, walking: false })
        .px.flatMap((color, i) => (color === '#2a1d33' ? [i] : [])).join(',')
      expect(face(10)).not.toBe('')
      expect(face(95)).not.toBe(face(10))
    }
  })

  it('draws each accessory differently, and only when there is a second emotion', () => {
    const drawn = ACCESSORIES.map((accessory) => pixels(renderFriend(withSecond(50), { tick: 0, accessory })))
    expect(new Set(drawn).size).toBe(ACCESSORIES.length)
    const alone: ConceptSpec = { primary: { key: 'joy', score: 70 }, secondary: null }
    const bare = ACCESSORIES.map((accessory) => pixels(renderFriend(alone, { tick: 0, accessory })))
    expect(new Set(bare).size).toBe(1)
  })

  it('adds colour detail without changing the silhouette or the face', () => {
    const spec: ConceptSpec = { primary: { key: 'joy', score: 70 }, secondary: null }
    const flat = renderFriend(spec, { tick: 0, walking: false })
    const soft = renderFriend(spec, { tick: 0, walking: false, soft: true })
    expect(new Set(soft.px.filter(Boolean)).size).toBeGreaterThan(new Set(flat.px.filter(Boolean)).size)
    expect(soft.px.map(Boolean)).toEqual(flat.px.map(Boolean))
    const faceInk = (grid: Grid) => grid.px.flatMap((color, i) => (color === '#2a1d33' ? [i] : []))
    expect(faceInk(soft)).toEqual(faceInk(flat))
  })

  it('animates soft characters through distinct walking frames', () => {
    const spec: ConceptSpec = { primary: { key: 'joy', score: 70 }, secondary: null }
    const frames = [0, 1, 2, 3].map((tick) => pixels(renderFriend(spec, { tick, walking: true, soft: true })))
    expect(new Set(frames).size).toBeGreaterThan(1)
  })

  it('dyes the body further as the second emotion grows', () => {
    const dyed = (score: number) => pixels(renderFriend(withSecond(score), { tick: 0, soft: true, accessory: 'dye' }))
    expect(new Set([dyed(20), dyed(50), dyed(85)]).size).toBe(3)
  })

  it('shows one to three same-sized balloons for the second emotion', () => {
    const filled = (score: number) => renderFriend(withSecond(score), { tick: 0, soft: true, accessory: 'balloon' }).px.filter(Boolean).length
    expect(filled(50)).toBeGreaterThan(filled(20))
    expect(filled(85)).toBeGreaterThan(filled(50))
    expect(filled(30)).toBe(filled(20))
    expect(filled(60)).toBe(filled(50))
  })

  it('shows all three balloons above the head of a strong character', () => {
    const spec: ConceptSpec = { primary: { key: 'joy', score: 95 }, secondary: { key: 'confusion', score: 85 } }
    const grid = renderFriend(spec, { tick: 0, walking: false, soft: true, accessory: 'balloon' })
    for (const x of [14, 23, 32]) {
      const lit = [-2, -1, 0, 1, 2].filter((dx) => grid.get(x + dx, 3) !== null)
      expect(lit.length).toBeGreaterThan(3)
    }
  })

  it('finds the coffee in a diary sentence', () => {
    expect(decorationForKeywords(['오늘 마신 커피가 너무 맛있었다'])).toBe('coffee')
    expect(decorationForKeywords(['아무 일도 없던 하루'])).toBeNull()
  })

  it('holds a keyword item only when there is no second emotion', () => {
    const alone: ConceptSpec = { primary: { key: 'joy', score: 70 }, secondary: null }
    for (const item of DECORATION_IDS) {
      expect(pixels(renderFriend(alone, { tick: 0, soft: true, item }))).not.toBe(pixels(renderFriend(alone, { tick: 0, soft: true })))
      expect(pixels(renderFriend(alone, { tick: 0, soft: false, item }))).not.toBe(pixels(renderFriend(alone, { tick: 0, soft: false })))
    }
    const both = withSecond(50)
    expect(pixels(renderFriend(both, { tick: 0, soft: true, item: 'coffee' }))).toBe(pixels(renderFriend(both, { tick: 0, soft: true })))
  })

  it('draws every server item at 12 cells, inside the canvas, as long as balloons are not shown', () => {
    const alone: ConceptSpec = { primary: { key: 'joy', score: 70 }, secondary: null }
    const plain = pixels(renderFriend(alone, { tick: 0, soft: true }))
    for (const id of [...DECORATION_IDS, 'donut', 'bubbletea']) {
      expect(heldItemArt(id)?.rows).toHaveLength(12)
      for (let tick = 0; tick < 4; tick += 1) {
        const grid = renderFriend(alone, { tick, soft: true, heldItem: id })
        for (let y = 0; y < 40; y += 1) expect(grid.get(39, y)).toBeNull()
      }
      expect(pixels(renderFriend(alone, { tick: 0, soft: true, heldItem: id }))).not.toBe(plain)
    }
    const both = withSecond(50)
    expect(pixels(renderFriend(both, { tick: 0, soft: true, heldItem: 'coffee' }))).toBe(pixels(renderFriend(both, { tick: 0, soft: true })))
  })

  it('ignores an item id it has no art for', () => {
    const alone: ConceptSpec = { primary: { key: 'joy', score: 70 }, secondary: null }
    expect(heldItemArt('unknown')).toBeNull()
    expect(pixels(renderFriend(alone, { tick: 0, soft: true, heldItem: 'unknown' }))).toBe(pixels(renderFriend(alone, { tick: 0, soft: true })))
  })

  it('keeps the item in the hand as the character walks', () => {
    const alone: ConceptSpec = { primary: { key: 'joy', score: 95 }, secondary: null }
    for (const item of DECORATION_IDS) for (let tick = 0; tick < 4; tick += 1) {
      const grid = renderFriend(alone, { tick, soft: true, item })
      for (let y = 0; y < 22; y += 1) expect(grid.get(39, y)).toBeNull()
    }
  })

  it('keeps every balloon on the canvas through the whole sway', () => {
    // A faint primary emotion has no particles, so anything at the edge can only be a balloon.
    const spec: ConceptSpec = { primary: { key: 'joy', score: 10 }, secondary: { key: 'confusion', score: 85 } }
    for (let tick = 0; tick < 8; tick += 1) {
      const grid = renderFriend(spec, { tick, soft: true, accessory: 'balloon' })
      for (let i = 0; i < 40; i += 1) {
        expect(grid.get(39, i)).toBeNull()
        expect(grid.get(i, 0)).toBeNull()
      }
    }
  })

  it('grows each accessory with the second emotion', () => {
    for (const accessory of ACCESSORIES) {
      expect(pixels(renderFriend(withSecond(20), { tick: 0, accessory }))).not.toBe(pixels(renderFriend(withSecond(85), { tick: 0, accessory })))
    }
  })
})
