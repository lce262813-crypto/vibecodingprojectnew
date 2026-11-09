// Five separate answers to one question: how should a character show an emotion's strength,
// its size, and a second emotion at the same time? Each renderer returns a 40 × 40 grid.
import type { EmotionKey } from '../pixel/palette'
import { COLORS, GROUP_OF, Grid, INK, SINKS, SKIN, darken, drawFace, faceFor, levelFor, lighten, part, type ConceptSpec, type Group } from './kit'

const C = 19 // left of the two centre columns
const CX = C + 0.5
const LEAF = '#7cc47f'
const STEM = '#5fae6a'
const HAIR = ['#5b4038', '#3f3a4d', '#8a5a3c', '#2f2a3a']

function shadow(g: Grid, w: number) {
  g.rect(C + 1 - Math.round(w / 2), 38, w, 1, '#e4dcec')
}

/* A. 날씨 사람: the person carries the main emotion; the weather above carries the second one. */
const CLOUDS: Partial<Record<EmotionKey, string>> = {
  anger: '#6d6780', irritation: '#a59aa3', sadness: '#a9bdd6', disappointment: '#b4aeb0', fatigue: '#c9cbd8',
  lethargy: '#cfd8d0', anxiety: '#c4b8ea', loneliness: '#3f4f73', confusion: '#dcc0ea', shyness: '#fbd3e6',
  excitement: '#ffd0e2', moved: '#fff0e0', calm: '#e6f7ee',
}

function weather(g: Grid, key: EmotionKey, score: number) {
  const size = score < 35 ? 0 : score < 65 ? 1 : 2
  const rx = [4, 6, 8][size]
  const cy = 5
  if (key === 'joy' || key === 'pride' || key === 'embarrassment') {
    const sun = key === 'embarrassment' ? '#ff9a6b' : key === 'pride' ? '#ffc94d' : '#ffd84d'
    const r = [2, 3, 4][size]
    g.rect(C, cy - r - 2, 2, 1, sun); g.rect(C, cy + r + 2, 2, 1, sun)
    g.rect(C - r - 2, cy, 1, 1, sun); g.rect(C + r + 3, cy, 1, 1, sun)
    g.add(part((p) => { p.disc(CX, cy, r + 0.4, r + 0.4, sun); p.rim(darken(sun, 0.12)) }))
    return
  }
  const cloud = CLOUDS[key] ?? '#ffffff'
  g.add(part((p) => {
    p.disc(CX, cy, rx, 3.4, cloud)
    p.disc(C - rx / 2, cy + 0.6, rx / 2 + 0.6, 2.8, cloud)
    p.disc(C + 1 + rx / 2, cy + 0.6, rx / 2 + 0.6, 2.8, cloud)
    p.rim(darken(cloud, 0.12))
  }))
  const y = cy + 4
  if (key === 'sadness' || key === 'disappointment') {
    for (let i = 0; i <= size + 1; i += 1) g.rect(C - rx + 2 + i * Math.floor((2 * rx - 2) / (size + 2)) + 1, y + 1 + (i % 2), 1, 2, '#669fe3')
  }
  if (key === 'anger') g.stamp(['.##', '##.', '.##', '#..'], C, y, { '#': '#ffd84d' })
  if (key === 'irritation') g.stamp(['#.#.#', '.#.#.'], C - 2, cy, { '#': '#e8793e' })
  if (key === 'excitement' || key === 'shyness') g.stamp(['#.#', '###', '.#.'], C, cy - 1, { '#': key === 'shyness' ? '#ec7fae' : '#ef4a64' })
  if (key === 'fatigue' || key === 'lethargy') g.stamp(['###', '.#.', '###'], C, cy - 1, { '#': '#6d6f88' })
  if (key === 'anxiety') g.stamp(['#.#.#', '.#.#.'], C - 2, cy, { '#': '#6f58c0' })
  if (key === 'confusion') g.stamp(['###', '..#', '.#.', '...', '.#.'], C, cy - 2, { '#': '#8a3fa8' })
  if (key === 'loneliness') g.stamp(['.##', '#..', '#..', '.##'], C, cy - 2, { '#': '#ffe9a8' })
  if (key === 'moved') { g.rect(C - 2, cy + 1, 6, 1, '#f58a9c'); g.rect(C - 1, cy, 4, 1, '#ffd84d') }
  if (key === 'calm') g.rect(C - 1, cy, 4, 1, '#72d3a4')
}

export function renderWeatherPerson(spec: ConceptSpec) {
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const sinks = SINKS.has(key)
  const color = COLORS[key]
  const g = new Grid()
  const hair = HAIR[(key.length + key.charCodeAt(0)) % HAIR.length]
  const headR = [6.5, 7, 7.5, 8, 8.5][lv - 1]
  const jump = !sinks && lv === 5 ? 2 : 0
  const seated = sinks && lv === 5
  const sunk = sinks ? Math.max(0, lv - 2) : 0 // A heavy feeling settles the whole body lower.
  const bodyTop = 27 + sunk - jump
  const bodyBottom = 34 - jump + (seated ? 3 : 0)
  shadow(g, jump ? 8 : 14)
  if (!seated) g.add(part((p) => { p.rect(C - 3, bodyBottom, 3, 3, '#5a5470'); p.rect(C + 1, bodyBottom, 3, 3, '#5a5470') }))
  else g.add(part((p) => { p.rect(C - 8, 35, 6, 2, '#5a5470'); p.rect(C + 3, 35, 6, 2, '#5a5470') }))
  // Arms lift with a rising feeling and hang with a sinking one.
  const lift = sinks ? 0 : [0, 1, 3, 8, 15][lv - 1]
  const handY = bodyTop + 5 - lift
  const spread = sinks ? 1 : [1, 2, 4, 8, 9][lv - 1]
  g.add(part((p) => {
    p.line(C - 5, bodyTop + 1, C - 5 - spread, handY, darken(color, 0.08), 2)
    p.line(C + 5, bodyTop + 1, C + 5 + spread, handY, darken(color, 0.08), 2)
    p.rect(C - 5 - spread, handY + 2, 2, 1, SKIN)
    p.rect(C + 5 + spread, handY + 2, 2, 1, SKIN)
  }))
  g.add(part((p) => { p.rect(C - 4, bodyTop, 10, bodyBottom - bodyTop, color); p.rim(darken(color)) }))
  const headY = bodyTop - headR + 2
  g.add(part((p) => {
    p.disc(CX, headY, headR, headR - 0.3, hair)
    p.disc(CX, headY + 1.6, headR - 1, headR - 1.7, SKIN)
    for (let y = Math.round(headY + 3); y < 40; y += 1) for (let x = 0; x < 40; x += 1) if (p.get(x, y) === hair) p.set(x, y, SKIN)
  }))
  drawFace(g, C, Math.round(headY), faceFor(key, lv), 2, 3)
  if (spec.secondary) weather(g, spec.secondary.key, spec.secondary.score)
  return g
}

/* B. 인형탈 친구: a costume shows the main emotion; a tiny friend climbs higher as the second one grows. */
function ears(p: Grid, group: Group, top: number, lv: number, color: string) {
  const grow = Math.min(lv, 4)
  const inner = lighten(color, 0.45)
  if (group === 'achievement') for (const x of [C - 6, C + 7]) { p.disc(x, top + 1, 3.4, 3.4, color); p.disc(x, top + 1, 1.5, 1.5, inner) }
  if (group === 'flutter') for (const x of [C - 6, C + 4]) { p.rect(x, top - 3 - grow, 4, 8 + grow, color); p.rect(x + 1, top - 2 - grow, 2, 6 + grow, inner) }
  if (group === 'lowEnergy') for (const x of [C - 10, C + 9]) p.disc(x + 1, top + 5, 3, 2.4, color)
  if (group === 'loss') { p.rect(C - 11, top + 1, 5, 5 + grow, darken(color, 0.1)); p.rect(C + 7, top + 1, 5, 5 + grow, darken(color, 0.1)) }
  if (group === 'anger') {
    for (let i = 0; i < 3 + grow; i += 1) {
      const w = Math.max(3 - Math.floor(i / 2), 1)
      p.rect(C - 7 + (3 - w), top + 2 - i, w, 1, '#fff1d6')
      p.rect(C + 6, top + 2 - i, w, 1, '#fff1d6')
    }
  }
  if (group === 'tension') for (const x of [C - 4, C + 5]) { p.rect(x, top - 1 - grow, 1, 3 + grow, INK); p.disc(x, top - 2 - grow, 1.6, 1.6, inner) }
}

function buddy(g: Grid, key: EmotionKey, x: number, y: number, r: number, score: number) {
  const color = COLORS[key]
  const face = faceFor(key, levelFor(score))
  g.add(part((p) => { p.disc(x + 0.5, y, r, r - 0.5, color); p.rim(darken(color)) }))
  g.rect(x - 2, y - 1, 1, 2, INK)
  g.rect(x + 3, y - 1, 1, 2, INK)
  const down = face.mouth === 'frown' || face.mouth === 'wobble' || face.mouth === 'grit'
  g.rect(x, y + (down ? 2 : 1), 2, 1, INK)
}

export function renderCostumeFriend(spec: ConceptSpec) {
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const color = COLORS[key]
  const group = GROUP_OF[key]
  const g = new Grid()
  const rx = [8, 9, 10, 11, 12][lv - 1]
  const top = 15 - lv
  shadow(g, rx * 2 - 2)
  g.add(part((p) => { p.rect(C - 6, 34, 5, 4, darken(color, 0.1)); p.rect(C + 2, 34, 5, 4, darken(color, 0.1)) }))
  g.add(part((p) => ears(p, group, top, lv, color)))
  const lift = SINKS.has(key) ? 0 : (lv - 1) * 2
  g.add(part((p) => {
    p.line(C - rx, 25, C - rx - 2, 30 - lift, darken(color, 0.08), 3)
    p.line(C + 1 + rx, 25, C + rx, 30 - lift, darken(color, 0.08), 3)
  }))
  g.add(part((p) => { p.disc(CX, (top + 36) / 2, rx, (36 - top) / 2 + 0.5, color); p.rim(darken(color)) }))
  const faceY = top + 8
  g.add(part((p) => p.disc(CX, faceY, 7, 5.6, SKIN)))
  drawFace(g, C, faceY - 1, faceFor(key, lv), 2, 3)
  const pocket = lighten(color, 0.35)
  g.rect(C - 3, 31, 8, 4, pocket)
  if (spec.secondary) {
    const s = spec.secondary
    if (s.score < 35) { buddy(g, s.key, C, 30, 3.6, s.score); g.rect(C - 3, 33, 8, 2, pocket) }
    else if (s.score < 65) buddy(g, s.key, Math.min(Math.max(C + rx + 1, 31), 34), 24, 4.6, s.score)
    else buddy(g, s.key, C, Math.max(top - 3, 6), 5.6, s.score)
  }
  return g
}

/* C. 마음 화분: the plant grows with the main emotion; the second one blooms on a side branch and tints the pot. */
function bloom(p: Grid, x: number, y: number, group: Group, color: string, lv: number) {
  const dark = darken(color, 0.15)
  const r = lv >= 5 ? 6 : 4.4
  if (lv <= 2) {
    p.rect(x - 3, y, 3, 2, LEAF); p.rect(x + 2, y, 3, 2, LEAF)
    if (lv === 2) { p.rect(x - 4, y + 3, 4, 2, LEAF); p.rect(x + 2, y + 3, 4, 2, LEAF) }
    return
  }
  if (lv === 3) { p.disc(x + 0.5, y, 3, 3.6, color); p.rect(x - 1, y + 2, 4, 2, LEAF); return }
  if (group === 'achievement') {
    for (let a = 0; a < 8; a += 1) p.disc(x + 0.5 + Math.cos(a * 0.785) * r, y + Math.sin(a * 0.785) * r, 2.2, 2.2, color)
    p.disc(x + 0.5, y, r * 0.55, r * 0.55, '#c98a3a')
  }
  if (group === 'flutter') {
    p.disc(x - 2, y - 1, r * 0.72, r * 0.72, color); p.disc(x + 3, y - 1, r * 0.72, r * 0.72, color)
    for (let i = 0; i < 6; i += 1) p.rect(x - 5 + i, y + i, 12 - 2 * i, 1, color)
  }
  if (group === 'lowEnergy') { p.disc(x + 0.5, y, r, r * 0.62, color); p.disc(x + 0.5, y - 3, r * 0.55, r * 0.55, lighten(color, 0.35)) }
  if (group === 'loss') { p.disc(x + 0.5, y + 1, r * 0.85, r * 0.9, color); for (let i = 0; i < 3; i += 1) p.rect(x - 3 + i * 3, y + 4 + (i % 2), 2, 3, dark) }
  if (group === 'anger') {
    p.disc(x + 0.5, y, r * 0.72, r * 0.72, color)
    for (let a = 0; a < 8; a += 1) p.line(x + 0.5 + Math.cos(a * 0.785) * r * 0.7, y + Math.sin(a * 0.785) * r * 0.7, x + 0.5 + Math.cos(a * 0.785) * (r + 2), y + Math.sin(a * 0.785) * (r + 2), dark)
  }
  if (group === 'tension') { p.disc(x + 0.5, y, r * 0.85, r * 0.85, color); p.line(x - 1, y - 2, x + 2, y - 2, dark); p.line(x + 2, y - 2, x + 2, y + 1, dark); p.line(x + 2, y + 1, x, y + 1, dark) }
}

export function renderHeartPlant(spec: ConceptSpec) {
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const color = COLORS[key]
  const group = GROUP_OF[key]
  const g = new Grid()
  const potColor = spec.secondary ? lighten(COLORS[spec.secondary.key], 0.15) : '#e9b48c'
  const stemH = Math.round(3 + score / 100 * 13)
  const topY = 25 - stemH
  const bent = group === 'loss' && lv >= 3
  g.add(part((p) => { p.rect(C, topY, 2, stemH + 2, STEM); if (bent) p.rect(C + 2, topY, 3, 2, STEM) }))
  g.add(part((p) => bloom(p, C + (bent ? 4 : 0), topY - (lv >= 3 ? 1 : 0), group, color, lv)))
  if (spec.secondary) {
    const s = spec.secondary
    const y = 20
    const r = s.score < 35 ? 1.8 : s.score < 65 ? 2.8 : 3.8
    const tone = COLORS[s.key]
    g.add(part((p) => { p.rect(C - 7, y + 2, 7, 1, STEM); p.disc(C - 8, y, r, r, tone); p.set(C - 8, y, lighten(tone, 0.6)) }))
  }
  shadow(g, 18)
  g.add(part((p) => {
    p.rect(C - 9, 25, 20, 3, potColor)
    for (let y = 28; y < 38; y += 1) { const i = Math.floor((y - 28) / 4); p.rect(C - 8 + i, y, 18 - 2 * i, 1, potColor) }
    p.rim(darken(potColor, 0.16))
  }))
  drawFace(g, C, 30, faceFor(key, lv), 2, 3)
  return g
}

/* D. 마음 병: liquid height is the main emotion's size; a floating layer is the second; bubbles and the cork show strength. */
const BUBBLES = [[14, 33], [25, 30], [20, 34], [13, 26], [27, 24], [17, 22], [24, 19], [15, 17]]

export function renderMoodBottle(spec: ConceptSpec) {
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const color = COLORS[key]
  const g = new Grid()
  const glass = '#eaf4fa'
  const left = 8; const w = 24; const top = 12; const bottom = 37
  shadow(g, 22)
  const shape = part((p) => {
    p.rect(left + 1, top, w - 2, bottom - top, glass)
    p.rect(left, top + 1, w, bottom - top - 2, glass)
    p.rect(C - 4, 7, 10, 5, glass)
  })
  const inner = bottom - top - 2
  const mainH = Math.max(2, Math.round(score / 100 * (inner - 2)))
  const secH = spec.secondary ? Math.max(1, Math.round(spec.secondary.score / 100 * inner * 0.5)) : 0
  const mainTop = bottom - 1 - mainH
  const rough = lv >= 4 && !SINKS.has(key)
  for (let y = top; y < bottom; y += 1) for (let x = 0; x < 40; x += 1) {
    if (!shape.get(x, y)) continue
    const wave = rough && x % 6 < 3 ? 1 : 0
    if (y >= mainTop + wave) shape.set(x, y, color)
    else if (spec.secondary && y >= mainTop - secH + wave) shape.set(x, y, lighten(COLORS[spec.secondary.key], 0.1))
  }
  for (let y = top + 2; y < bottom - 2; y += 1) shape.set(left + 2, y, lighten(shape.get(left + 2, y) ?? glass, 0.6))
  BUBBLES.slice(0, (lv - 1) * 2).forEach(([x, y]) => {
    const under = shape.get(x, y)
    if (under) shape.rect(x, y - 1, 2, 2, lighten(under, 0.55))
  })
  g.add(shape)
  const pop = lv === 5 && !SINKS.has(key)
  g.add(part((p) => { const y = pop ? 0 : 3; p.rect(C - 3, y, 8, 4, '#c98f5e'); p.rect(C - 3, y + 3, 8, 1, '#a9713f') }))
  if (pop) { g.set(C - 6, 5, color); g.set(C + 7, 5, color); g.set(C - 5, 2, color); g.set(C + 8, 2, color) }
  drawFace(g, C, 21, faceFor(key, lv), 3, 4)
  return g
}

/* E. 두 색 젤리: the body evolves with strength; its marbling is the exact mix of the two emotions. */
export function renderMarbleJelly(spec: ConceptSpec) {
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const color = COLORS[key]
  const group = GROUP_OF[key]
  const g = new Grid()
  const rx = 7 + score / 100 * 10
  const ry = 5.5 + score / 100 * 9
  const floor = 37
  const cy = floor - ry
  shadow(g, Math.round(rx * 2))
  const body = part((p) => {
    p.disc(CX, cy, rx, ry, color)
    const x0 = Math.ceil(CX - rx); const x1 = Math.floor(CX + rx)
    p.rect(x0, Math.round(cy), x1 - x0 + 1, floor - Math.round(cy) + 1, color)
    // Tuck the bottom corners in so it sits like a soft jelly, not a bell.
    for (const [row, inset] of [[floor, 3], [floor - 1, 1]]) for (let i = 0; i < inset; i += 1) { p.px[row * 40 + x0 + i] = null; p.px[row * 40 + x1 - i] = null }
  })
  body.rim(darken(color, 0.18))
  if (spec.secondary) {
    const ratio = spec.secondary.score / (spec.secondary.score + score)
    const tone = COLORS[spec.secondary.key]
    const faceTop = cy + ry * 0.1 - 3
    let total = 0
    const cells: { i: number; v: number }[] = []
    body.px.forEach((c, i) => {
      if (!c) return
      total += 1
      const x = i % 40; const y = Math.floor(i / 40)
      // The face keeps the main colour; wavy bands fill the rest in proportion to the mix.
      if (((x - CX) / 10) ** 2 + ((y - faceTop - 4) / 6.5) ** 2 <= 1) return
      cells.push({ i, v: Math.sin((y + Math.sin(x * 0.45) * 2.2) * 0.62) })
    })
    cells.sort((a, b) => b.v - a.v)
    cells.slice(0, Math.round(total * ratio)).forEach(({ i }) => { body.px[i] = tone })
  }
  const top = Math.round(cy - ry)
  if (lv >= 4) {
    g.add(part((p) => {
      if (group === 'anger') { p.line(C - 6, top + 3, C - 8, top - 3, '#fff1d6', 2); p.line(C + 6, top + 3, C + 8, top - 3, '#fff1d6', 2) }
      if (group === 'achievement') p.stamp(['#.#.#', '#####', '#####'], C - 2, top - 2, { '#': '#ffcf3f' })
      if (group === 'flutter') p.stamp(['##.##', '#####', '.###.', '..#..'], C - 2, top - 3, { '#': '#ef6a8a' })
      if (group === 'lowEnergy') { p.rect(C, top - 3, 2, 4, STEM); p.rect(C + 2, top - 4, 3, 2, LEAF) }
      if (group === 'loss') p.disc(CX, top - 2, 6, 2, '#b6c3d4')
      if (group === 'tension') { p.line(C, top + 1, C - 2, top - 3, INK); p.line(C + 1, top + 1, C + 3, top - 3, INK) }
    }))
  }
  g.add(body)
  g.rect(Math.round(C - rx * 0.55), Math.round(cy - ry * 0.55), 2, 1, lighten(color, 0.75))
  drawFace(g, C, Math.round(cy + ry * 0.1), faceFor(key, lv), lv >= 3 ? 3 : 2, 3)
  return g
}
