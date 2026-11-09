// Second round of concepts. Characters walk around the room, so pose and face never carry strength:
// every sprite shares one walk cycle and one face per emotion. Strength lives in colour depth,
// a body feature that grows, and the symbols around the character.
import type { EmotionKey } from '../pixel/palette'
import { COLORS, GROUP_OF, Grid, INK, SINKS, SKIN, darken, drawFace, faceFor, levelFor, lighten, part, type ConceptSpec, type Group, type Level } from './kit'

const C = 19
const CX = C + 0.5
const HAIR = ['#5b4038', '#3f3a4d', '#8a5a3c', '#2f2a3a']

export type BodyShape = 'round' | 'ears' | 'heart' | 'flat' | 'wave' | 'spiky' | 'drop' | 'bean' | 'mochi' | 'star'

export const SHAPE_LABELS: Record<BodyShape, string> = {
  round: '둥근형', ears: '귀형', heart: '하트형', flat: '납작형', wave: '물결형',
  spiky: '뾰족형', drop: '물방울형', bean: '길쭉형', mochi: '말랑네모형', star: '별형',
}

export const SHAPE_OF: Record<EmotionKey, BodyShape> = {
  joy: 'round', pride: 'star', moved: 'ears', excitement: 'heart', shyness: 'heart', calm: 'flat', fatigue: 'flat',
  lethargy: 'mochi', sadness: 'wave', loneliness: 'wave', disappointment: 'mochi', anger: 'spiky', irritation: 'spiky',
  anxiety: 'drop', embarrassment: 'drop', confusion: 'bean',
}

/** One symbol per emotion, used for the particles and badges so a meaning can be learned once. */
export const SYMBOLS: Record<EmotionKey, string[]> = {
  joy: ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
  excitement: ['##.##', '#####', '#####', '.###.', '..#..'],
  calm: ['..###', '.####', '.###.', '#.#..', '#....'],
  pride: ['..#..', '#####', '.###.', '.###.', '##.##'],
  moved: ['.#.#.', '#####', '.###.', '#####', '.#.#.'],
  sadness: ['..#..', '.###.', '.###.', '#####', '.###.'],
  anger: ['.#...', '.##.#', '#####', '#####', '.###.'],
  irritation: ['...##', '..##.', '.####', '..##.', '.##..'],
  anxiety: ['#..#.', '.##.#', '.....', '#..#.', '.##.#'],
  loneliness: ['.###.', '##...', '##...', '##...', '.###.'],
  disappointment: ['..#..', '..#..', '#.#.#', '.###.', '..#..'],
  embarrassment: ['..#..', '..#..', '..#..', '.....', '..#..'],
  confusion: ['.###.', '#...#', '..##.', '.....', '..#..'],
  shyness: ['#...#', '##.##', '.###.', '##.##', '#...#'],
  fatigue: ['#####', '...#.', '..#..', '.#...', '#####'],
  lethargy: ['.....', '.....', '#.#.#', '.....', '.....'],
}

/** Paler at low strength, fully saturated at the top. */
export function toneFor(key: EmotionKey, lv: Level) {
  const base = COLORS[key]
  if (lv === 5) {
    const n = parseInt(base.slice(1), 16)
    const parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    const mean = (parts[0] + parts[1] + parts[2]) / 3
    return `#${parts.map((v) => Math.max(0, Math.min(255, Math.round(mean + (v - mean) * 1.3))).toString(16).padStart(2, '0')).join('')}`
  }
  return lighten(base, [0.6, 0.42, 0.22, 0][lv - 1])
}

const FIXED_LEVEL: Level = 4
const faceOf = (key: EmotionKey) => faceFor(key, FIXED_LEVEL)

/** Four-beat walk: stand, left step, stand, right step. A paused character stands. */
export function stride(tick: number, walking: boolean) {
  const beat = walking ? tick % 4 : 0
  return { bob: beat % 2 === 1 ? -1 : 0, left: beat === 1 ? -2 : 0, right: beat === 3 ? -2 : 0, swing: beat === 1 ? 1 : beat === 3 ? -1 : 0 }
}

export function shifted(g: Grid, dy: number) {
  if (!dy) return g
  const out = new Grid()
  g.px.forEach((c, i) => { if (c) out.set(i % 40, Math.floor(i / 40) + dy, c) })
  return out
}

export function feet(g: Grid, tick: number, walking: boolean, color: string, floor = 34, w = 5) {
  const s = stride(tick, walking)
  g.add(part((p) => {
    p.rect(C - 1 - w, floor + 1 + s.left, w, 3, color)
    p.rect(C + 2, floor + 1 + s.right, w, 3, color)
  }))
}

const PARTICLE_SPOTS = [[1, 22], [34, 14], [34, 27], [1, 8]]

function particles(g: Grid, key: EmotionKey, lv: Level, tick: number) {
  const color = darken(COLORS[key], 0.08)
  const dir = SINKS.has(key) ? 1 : -1
  PARTICLE_SPOTS.slice(0, lv - 1).forEach(([x, y], i) => {
    const drift = [0, 1, 2, 1][Math.floor((tick + i * 3) / 2) % 4]
    g.stamp(SYMBOLS[key], x, y + dir * drift, { '#': color })
  })
}

/* 1. 몸 형태 친구: the earlier body shapes, drawn with limbs, shading and a scarf for the second emotion. */
export function bodyMask(shape: BodyShape, rx: number, ry: number, floor: number, lv: number, color: string) {
  const grow = lv
  return part((p) => {
    const cy = floor - ry + 1
    if (shape === 'mochi') {
      for (let y = 0; y < 40; y += 1) for (let x = 0; x < 40; x += 1) {
        if (Math.abs((x - CX) / rx) ** 3.2 + Math.abs((y - cy) / ry) ** 3.2 <= 1) p.set(x, y, color)
      }
    } else if (shape === 'star') {
      for (let y = 0; y < 40; y += 1) for (let x = 0; x < 40; x += 1) {
        const dx = (x - CX) / rx; const dy = (y - cy) / ry
        const reach = 0.92 + (0.1 + grow * 0.035) * Math.cos(5 * (Math.atan2(dy, dx) + Math.PI / 2))
        if (Math.hypot(dx, dy) <= reach && y <= floor) p.set(x, y, color)
      }
    } else if (shape === 'heart') {
      const lobe = rx * 0.58
      p.disc(CX - rx * 0.46, cy - ry * 0.3, lobe, ry * 0.62 + grow * 0.25, color)
      p.disc(CX + rx * 0.46, cy - ry * 0.3, lobe, ry * 0.62 + grow * 0.25, color)
      for (let y = Math.round(cy - ry * 0.3); y <= floor; y += 1) {
        const t = (y - (cy - ry * 0.3)) / (floor - (cy - ry * 0.3))
        const half = rx * (1 - t * t * 0.55)
        p.rect(Math.ceil(CX - half), y, Math.floor(half * 2) + 1, 1, color)
      }
    } else {
      p.disc(CX, cy, rx, ry, color)
    }
    if (shape === 'ears') for (const s of [-1, 1]) p.disc(CX + s * rx * 0.62, cy - ry * 0.85 - grow * 0.5, 2.8, 2.6 + grow * 0.9, color)
    if (shape === 'spiky') {
      for (const i of [-2, -1, 0, 1, 2]) {
        const x = CX + i * rx * 0.4
        const base = cy - ry * Math.sqrt(Math.max(0, 1 - (x - CX) ** 2 / (rx * rx))) + 1
        const h = 1 + grow * (i === 0 ? 1.2 : 0.9)
        for (let t = 0; t <= h; t += 1) { const half = 3 * (1 - t / (h + 1)); p.rect(Math.ceil(x - half), Math.round(base - t), Math.floor(half * 2) + 1, 1, color) }
      }
    }
    if (shape === 'drop') {
      const h = 3 + grow * 1.4
      const baseY = cy - ry * 0.7
      for (let t = 0; t <= h; t += 1) { const half = rx * 0.68 * (1 - t / (h + 1)); p.rect(Math.ceil(CX - half), Math.round(baseY - t), Math.floor(half * 2) + 1, 1, color) }
    }
    if (shape === 'wave') {
      const x0 = Math.ceil(CX - rx); const x1 = Math.floor(CX + rx)
      p.rect(x0, Math.round(cy), x1 - x0 + 1, floor - Math.round(cy) + 1, color)
      const deep = grow >= 4 ? 2 : 1
      for (let x = x0; x <= x1; x += 1) if ((x - x0) % 6 < 3) p.rect(x, floor + 1, 1, deep, color); else p.px[floor * 40 + x] = null
    }
  })
}

const SHAPE_SCALE: Partial<Record<BodyShape, [number, number]>> = { flat: [2.5, -2.5], bean: [-2.5, 2.5], wave: [-0.5, 0] }

export function renderShapeFriend(spec: ConceptSpec, tick = 1, walking = true, shapeOverride?: BodyShape) {
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const shape = shapeOverride ?? SHAPE_OF[key]
  const tone = toneFor(key, lv)
  const s = stride(tick, walking)
  const [wAdd, hAdd] = SHAPE_SCALE[shape] ?? [0, 0]
  const rx = 9.5 + score * 0.04 + wAdd
  const ry = 8.5 + score * 0.04 + hAdd
  const floor = 34
  const cy = floor - ry + 1
  const g = new Grid()
  g.rect(C + 1 - Math.round(rx), 38, Math.round(rx * 2), 1, '#00000018')
  feet(g, tick, walking, darken(tone, 0.2))
  const upper = new Grid()
  upper.add(part((p) => {
    p.rect(Math.round(CX - rx) - 2, Math.round(cy + 2 + s.swing), 3, 4, darken(tone, 0.08))
    p.rect(Math.round(CX + rx) - 1, Math.round(cy + 2 - s.swing), 3, 4, darken(tone, 0.08))
  }))
  const body = bodyMask(shape, rx, ry, floor, lv, tone)
  const light = lighten(tone, 0.5)
  body.rim(darken(tone))
  for (let y = 0; y < 40; y += 1) for (let x = 0; x < 40; x += 1) {
    if (body.get(x, y) === tone && ((x - CX + rx * 0.45) / (rx * 0.32)) ** 2 + ((y - cy + ry * 0.55) / (ry * 0.2)) ** 2 <= 1) body.set(x, y, light)
  }
  const faceY = Math.round(cy - 3)
  if (spec.secondary) {
    const sec = COLORS[spec.secondary.key]
    const size = spec.secondary.score < 35 ? 0 : spec.secondary.score < 65 ? 1 : 2
    const y = faceY + 7
    for (let dy = 0; dy < 2 + (size > 0 ? 1 : 0); dy += 1) for (let x = 0; x < 40; x += 1) {
      if (body.get(x, y + dy)) body.set(x, y + dy, (x + dy) % 4 === 0 ? lighten(sec, 0.5) : sec)
    }
    upper.add(body)
    const tailLen = [3, 5, 8][size]
    upper.add(part((p) => p.line(Math.round(CX + rx * 0.55), y + 1, Math.round(CX + rx * 0.55) + 2 + s.swing, y + 1 + tailLen, darken(sec, 0.08), 2)))
  } else {
    upper.add(body)
  }
  drawFace(upper, C, faceY, faceOf(key), 3, 3)
  g.add(shifted(upper, s.bob), false)
  particles(g, key, lv, tick)
  return g
}

/* 2. 감정 모자 사람: the hat and clothes say what the feeling is; a small cloud carries the second one. */
function hatTopper(p: Grid, group: Group, top: number, lv: number, tone: string) {
  const h = lv + 1
  if (group === 'achievement') {
    // Three points that taper upward, set on a band, so it reads as a crown and not as ears.
    p.rect(C - 7, top + 1, 16, 2, '#ffcf3f')
    for (const x of [C - 6, C, C + 6]) for (let t = 0; t < h; t += 1) {
      const half = Math.ceil((h - t) / h * 2)
      p.rect(x + 1 - half, top - t, half * 2, 1, '#ffcf3f')
    }
  }
  if (group === 'flutter') {
    const r = 1.6 + lv * 0.5
    p.disc(C - 3, top - 1, r, r, tone); p.disc(C + 4, top - 1, r, r, tone); p.rect(C, top - 2, 2, 3, darken(tone, 0.2))
  }
  if (group === 'lowEnergy') {
    p.line(C + 2, top, C + 2 + h, top + 1, tone, 3); p.disc(C + 4 + h, top + 3, 2.2, 2.2, WHITE_POM)
  }
  if (group === 'loss') p.rect(C - 7 - lv, top + 7, 16 + lv * 2, 2, darken(tone, 0.1))
  if (group === 'anger') {
    const flame = ['#ffd84d', '#ff9a3d', '#e5484d']
    for (let i = 0; i < 3; i += 1) for (const x of [C - 6, C, C + 6]) {
      const height = h + 2 - i * 2 + (x === C ? 2 : 0)
      if (height > 0) p.rect(x - 1 + i, top + 1 - height, 4 - i * 2 || 1, height, flame[2 - i])
    }
  }
  if (group === 'tension') {
    p.rect(C, top - h, 2, h + 1, INK); p.disc(CX, top - h - 1, 2.2, 2.2, tone)
  }
}

const WHITE_POM = '#fff8f0'

function cloudFor(g: Grid, key: EmotionKey, score: number, bob: number) {
  const rx = score < 35 ? 5 : score < 65 ? 6 : 7.5
  const cx = 31
  const cy = 7 + bob
  const color = lighten(COLORS[key], 0.25)
  g.add(part((p) => {
    p.disc(cx, cy, rx, 3.8, color)
    p.disc(cx - rx * 0.5, cy + 0.8, rx * 0.55, 3, color)
    p.disc(cx + rx * 0.5, cy + 0.8, rx * 0.55, 3, color)
    p.rim(darken(color, 0.12))
  }))
  g.stamp(SYMBOLS[key], cx - 2, cy - 2, { '#': darken(COLORS[key], 0.45) })
}

export function renderHatPerson(spec: ConceptSpec, tick = 1, walking = true) {
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const tone = toneFor(key, lv)
  const group = GROUP_OF[key]
  const s = stride(tick, walking)
  const hair = HAIR[(key.length + key.charCodeAt(0)) % HAIR.length]
  const g = new Grid()
  g.rect(C - 7, 38, 16, 1, '#00000018')
  feet(g, tick, walking, '#5a5470', 34, 4)
  const upper = new Grid()
  upper.add(part((p) => {
    p.rect(C - 7, 28 + s.swing, 3, 5, darken(tone, 0.08))
    p.rect(C + 5, 28 - s.swing, 3, 5, darken(tone, 0.08))
  }))
  upper.add(part((p) => { p.rect(C - 4, 27, 10, 8, tone); p.rect(C - 1, 27, 4, 8, lighten(tone, 0.35)); p.rim(darken(tone)) }))
  const headY = 20
  upper.add(part((p) => {
    p.disc(CX, headY, 8, 7.6, hair)
    p.disc(CX, headY + 1.6, 7, 5.9, SKIN)
    for (let y = headY + 3; y < 40; y += 1) for (let x = 0; x < 40; x += 1) if (p.get(x, y) === hair) p.set(x, y, SKIN)
  }))
  drawFace(upper, C, headY + 1, faceOf(key), 2, 3)
  const capTop = headY - 9
  upper.add(part((p) => hatTopper(p, group, capTop, lv, tone)))
  upper.add(part((p) => {
    p.disc(CX, headY - 3, 8.5, 6.6, tone)
    for (let y = headY - 1; y < 40; y += 1) p.rect(0, y, 40, 1, '')
    p.rect(C - 8, headY - 2, 18, 2, darken(tone, 0.16))
    p.rim(darken(tone, 0.1))
  }))
  upper.stamp(SYMBOLS[key], C - 2, capTop + 2, { '#': lv >= 3 ? lighten(tone, 0.8) : darken(tone, 0.4) })
  g.add(shifted(upper, s.bob), false)
  particles(g, key, lv, tick)
  if (spec.secondary) cloudFor(g, spec.secondary.key, spec.secondary.score, s.bob)
  return g
}

/* 3. 감정 인형탈: the costume and belly badge say what it is; a small friend rides along for the second one. */
function ears(p: Grid, group: Group, top: number, lv: number, color: string) {
  const grow = Math.min(lv, 5)
  const inner = lighten(color, 0.5)
  if (group === 'achievement') for (const x of [C - 6, C + 7]) { p.disc(x, top + 1, 2.4 + grow * 0.4, 2.4 + grow * 0.4, color); p.disc(x, top + 1, 1.5, 1.5, inner) }
  if (group === 'flutter') for (const x of [C - 6, C + 4]) { p.rect(x, top - 2 - grow, 4, 7 + grow, color); p.rect(x + 1, top - 1 - grow, 2, 5 + grow, inner) }
  if (group === 'lowEnergy') for (const s of [-1, 1]) p.disc(CX + s * 10, top + 5, 2 + grow * 0.45, 2.4, color)
  if (group === 'loss') { p.rect(C - 11, top + 2, 5, 3 + grow * 1.4, darken(color, 0.12)); p.rect(C + 7, top + 2, 5, 3 + grow * 1.4, darken(color, 0.12)) }
  if (group === 'anger') {
    for (let i = 0; i < 2 + grow; i += 1) {
      const w = Math.max(3 - Math.floor(i / 2), 1)
      p.rect(C - 7 + (3 - w), top + 2 - i, w, 1, '#fff1d6')
      p.rect(C + 6, top + 2 - i, w, 1, '#fff1d6')
    }
  }
  if (group === 'tension') for (const x of [C - 6, C + 5]) { for (let i = 0; i < 3 + grow; i += 1) p.rect(x + (x < C ? -Math.floor(i / 3) : Math.floor(i / 3)), top + 2 - i, 3 - Math.min(Math.floor(i / 2), 2), 1, color) }
}

function buddy(g: Grid, key: EmotionKey, x: number, y: number, r: number) {
  const color = COLORS[key]
  g.add(part((p) => { p.disc(x + 0.5, y, r, r - 0.5, color); p.rim(darken(color)) }))
  g.rect(x - 2, y - 1, 1, 2, INK)
  g.rect(x + 3, y - 1, 1, 2, INK)
  g.rect(x, y + 1, 2, 1, INK)
}

export function renderCostumePerson(spec: ConceptSpec, tick = 1, walking = true) {
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const tone = toneFor(key, lv)
  const group = GROUP_OF[key]
  const s = stride(tick, walking)
  const rx = 9 + score * 0.03
  const top = 13
  const g = new Grid()
  g.rect(C + 1 - Math.round(rx), 38, Math.round(rx * 2), 1, '#00000018')
  feet(g, tick, walking, darken(tone, 0.18))
  const upper = new Grid()
  upper.add(part((p) => ears(p, group, top, lv, tone)))
  upper.add(part((p) => {
    p.rect(Math.round(CX - rx) - 2, 24 + s.swing, 3, 6, darken(tone, 0.08))
    p.rect(Math.round(CX + rx) - 1, 24 - s.swing, 3, 6, darken(tone, 0.08))
  }))
  upper.add(part((p) => {
    p.disc(CX, 19.5, rx, 7.5, tone)
    p.disc(CX, 26, rx, 8.8, tone)
    p.rim(darken(tone))
  }))
  upper.add(part((p) => p.disc(CX, 20, 6.8, 4.9, SKIN)))
  drawFace(upper, C, 18, faceOf(key), 2, 3)
  upper.add(part((p) => p.rect(C - 3, 27, 8, 7, lighten(tone, 0.7))), false)
  upper.stamp(SYMBOLS[key], C - 2, 28, { '#': darken(COLORS[key], 0.3) })
  if (spec.secondary) {
    const sec = spec.secondary
    if (sec.score < 35) buddy(upper, sec.key, Math.round(CX - rx) + 2, 33, 3.4)
    else if (sec.score < 65) buddy(upper, sec.key, Math.min(Math.round(CX + rx) + 3, 34), 21, 4.4)
    else buddy(upper, sec.key, C, 7, 5.4)
  }
  g.add(shifted(upper, s.bob), false)
  particles(g, key, lv, tick)
  return g
}
