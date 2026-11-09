// Third round: the body-shape friends with the original slime expressions (16 emotions × 5 levels)
// and a choice of accessories for the second emotion. Pose stays fixed so the walk cycle always works.
import { DECORATION_ANCHOR, DECORATION_OUTLINE, HEADPHONE_COLORS, ITEM_SPRITES, ITEM_SPRITES_V2, type DecorationId } from '../pixel/decorations'
import { FACE_COLORS, expressionFor, mirrorSprite } from '../pixel/faces'
import type { EmotionKey } from '../pixel/palette'
import { heldItemArt } from './heldItemArt'
import type { ItemArt } from './itemArt'
import { rampFrom, type Ramp } from './hires'
import { COLORS, Grid, SINKS, darken, levelFor, lighten, part, type ConceptSpec, type Level } from './kit'
import { SHAPE_OF, SYMBOLS, bodyMask, feet, shifted, stride, toneFor, type BodyShape } from './walkers'

const C = 19
const CX = C + 0.5
const FLOOR = 34
const BLUSH = '#f59a9f'
const SCALE: Partial<Record<BodyShape, [number, number]>> = { flat: [2.5, -2], bean: [-1.5, 1.5], wave: [-0.5, 0] }
const SPOTS = [[0, 23], [35, 27], [0, 9], [0, 16]]

export type Accessory = 'balloon' | 'hat' | 'pin' | 'badge' | 'bag'
export const ACCESSORIES: Accessory[] = ['balloon', 'hat', 'pin', 'badge', 'bag']

export type EmotionRelation = 'companion' | 'residual' | 'relief' | 'reversal'
export interface FriendOptions { tick?: number; walking?: boolean; accessory?: Accessory | 'dye'; shape?: BodyShape; soft?: boolean; item?: DecorationId | null; itemArt?: 'original' | 'reference'; heldItem?: string | null; secondaryRelation?: EmotionRelation | null }

/** Recolours a flat part with soft lighting from its own outline. Returns the tone of each pixel. */
function softShade(g: Grid, ramp: Ramp, radius: number) {
  const size = 40
  const on = (x: number, y: number) => Boolean(g.get(x, y))
  const dist = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) dist[y * size + x] = on(x, y) ? 99 : 0
  const step = (x: number, y: number, dx: number, dy: number, cost: number) => {
    const nx = x + dx; const ny = y + dy
    const other = nx >= 0 && ny >= 0 && nx < size && ny < size ? dist[ny * size + nx] : 0
    if (other + cost < dist[y * size + x]) dist[y * size + x] = other + cost
  }
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (on(x, y)) { step(x, y, -1, 0, 1); step(x, y, 0, -1, 1); step(x, y, -1, -1, 1.41); step(x, y, 1, -1, 1.41) }
  for (let y = size - 1; y >= 0; y -= 1) for (let x = size - 1; x >= 0; x -= 1) if (on(x, y)) { step(x, y, 1, 0, 1); step(x, y, 0, 1, 1); step(x, y, 1, 1, 1.41); step(x, y, -1, 1, 1.41) }
  const height = dist.map((d) => { const t = Math.min(d / radius, 1); return d ? Math.sqrt(1 - (1 - t) ** 2) * radius : 0 })
  const smooth = height.slice()
  for (let y = 1; y < size - 1; y += 1) for (let x = 1; x < size - 1; x += 1) {
    if (!on(x, y)) continue
    let sum = 0
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) sum += height[(y + dy) * size + x + dx]
    smooth[y * size + x] = sum / 9
  }
  const tones = new Int8Array(size * size).fill(-1)
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    if (!on(x, y)) continue
    const read = (px: number, py: number) => (px >= 0 && py >= 0 && px < size && py < size ? smooth[py * size + px] : 0)
    const gx = read(x - 1, y) - read(x + 1, y)
    const gy = read(x, y - 1) - read(x, y + 1)
    const v = (gx * -0.46 + gy * -0.6 + 2 * 0.66) / Math.hypot(gx, gy, 2)
    // Mostly light tones, so the body stays soft; the deepest tone is only for the far edge.
    let t = v > 0.86 ? 1 : v > 0.62 ? 2 : v > 0.4 ? 3 : v > 0.16 ? 4 : v > -0.1 ? 5 : 6
    if (t >= 5 && gx > 0 && gy > 0 && dist[y * size + x] <= 1.5) t -= 1 // Bounce light on the shaded edge.
    tones[y * size + x] = t
    g.set(x, y, ramp.tones[t])
  }
  return tones
}

function stampFace(g: Grid, rows: string[], x0: number, top: number, shade: string) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === '.') return
    g.set(x0 + dx, top + dy, ch === 's' ? shade : FACE_COLORS[ch])
  }))
}

/** Places a face from the slime library, following the same layout rules on the smaller grid. */
function drawSlimeFace(g: Grid, key: EmotionKey, lv: Level, eyeY: number, gap: number, shade: string) {
  const face = expressionFor(key, lv)
  const eyeWidth = face.eyes[0].length
  const pair = (left: string[], right: string[] | undefined, top: number) => {
    const x0 = 20 - gap - eyeWidth + Math.floor((eyeWidth - left[0].length) / 2)
    const rightRows = right ?? mirrorSprite(left)
    stampFace(g, left, x0, top, shade)
    stampFace(g, rightRows, 40 - x0 - rightRows[0].length, top, shade)
  }
  if (face.blush) {
    const x = 20 - gap - eyeWidth - 2
    g.rect(x, eyeY + 3, 3, 1, BLUSH)
    g.rect(39 - x - 2, eyeY + 3, 3, 1, BLUSH)
  }
  if (face.brows) pair(face.brows, face.browsRight ?? undefined, eyeY - 3 - face.brows.length)
  pair(face.eyes, face.eyesRight, face.eyes.length <= 2 ? eyeY - 1 : eyeY - 2)
  stampFace(g, face.mouth, 20 - face.mouth[0].length / 2, eyeY + 4, shade)
}

function particles(g: Grid, key: EmotionKey, lv: Level, tick: number, skip: number[] = []) {
  const color = darken(COLORS[key], 0.08)
  const dir = SINKS.has(key) ? 1 : -1
  SPOTS.slice(0, lv - 1).forEach(([x, y], i) => {
    if (skip.includes(i)) return
    const drift = [0, 1, 2, 1][Math.floor((tick + i * 3) / 2) % 4]
    g.stamp(SYMBOLS[key], x, y + dir * drift, { '#': color })
  })
}

function topOf(body: Grid) {
  for (let y = 0; y < 40; y += 1) if (body.get(C, y) || body.get(C + 1, y)) return y
  return 12
}

function edge(body: Grid, y: number, side: -1 | 1) {
  const xs: number[] = []
  for (let x = 0; x < 40; x += 1) if (body.get(x, y)) xs.push(x)
  if (!xs.length) return side < 0 ? 10 : 29
  return side < 0 ? xs[0] : xs[xs.length - 1]
}

function symbol(g: Grid, key: EmotionKey, x: number, y: number) {
  g.stamp(SYMBOLS[key], x, y, { '#': darken(COLORS[key], 0.5) })
}

function drawHat(g: Grid, body: Grid, key: EmotionKey, size: number) {
  const color = lighten(COLORS[key], 0.1)
  const rx = [5.5, 6.5, 8][size]
  const ry = [5.5, 6.5, 7.5][size]
  const brim = Math.max(topOf(body) + 2, Math.ceil(ry) + 1)
  g.add(part((p) => {
    p.disc(CX, brim, rx, ry, color)
    for (let y = brim; y < 40; y += 1) p.rect(0, y, 40, 1, '')
    p.rect(Math.round(CX - rx) - 1, brim, Math.round(rx * 2) + 2, 2, darken(color, 0.16))
    p.rim(darken(color, 0.1))
  }))
  symbol(g, key, C - 2, brim - 5)
}

function drawPin(g: Grid, body: Grid, key: EmotionKey, size: number, cy: number, ry: number) {
  const y = Math.round(cy - ry * 0.72)
  const x = edge(body, y, -1) - 1
  const r = [1.6, 2.1, 2.7][size]
  const reach = [2.1, 2.8, 3.5][size]
  g.add(part((p) => {
    for (let a = 0; a < 5; a += 1) p.disc(x + Math.cos(a * 1.257 - 1.57) * reach, y + Math.sin(a * 1.257 - 1.57) * reach, r, r, COLORS[key])
    p.disc(x, y, 1.4, 1.4, '#fff1b8')
  }))
}

function drawBadge(g: Grid, key: EmotionKey, size: number) {
  const r = [3.6, 4.2, 5][size]
  const x = 10
  const y = FLOOR - Math.ceil(r) + 1
  g.add(part((p) => { p.disc(x, y, r, r, '#fff8ea'); p.disc(x, y, r - 0.9, r - 0.9, lighten(COLORS[key], 0.35)) }))
  symbol(g, key, x - 2, y - 2)
}

function drawBag(g: Grid, body: Grid, key: EmotionKey, size: number) {
  const w = [7, 8, 10][size]
  const h = [6, 7, 9][size]
  const top = FLOOR - h + 1
  const x = Math.max(edge(body, top, -1) - 3, 1)
  const color = lighten(COLORS[key], 0.1)
  g.add(part((p) => { p.line(x + 2, top - 1, x + 4, top - 4, '#8a6a52'); p.line(x + w - 3, top - 1, x + w - 5, top - 4, '#8a6a52') }), false)
  g.add(part((p) => {
    p.rect(x, top, w, h, color)
    p.rect(x, top, w, 2, darken(color, 0.14))
    p.rim(darken(color, 0.14))
  }))
  symbol(g, key, x + Math.floor((w - 5) / 2), top + h - 6)
}

function drawBalloon(g: Grid, key: EmotionKey, size: number, handY: number, tick: number) {
  const r = [4.2, 5, 6][size]
  const sway = [0, 1, 1, 0][Math.floor(tick / 2) % 4]
  const cx = 33 + sway
  const cy = Math.round(r) + 1
  const color = lighten(COLORS[key], 0.2)
  g.add(part((p) => p.line(cx, cy + r + 1, 31, handY, '#8a8094')), false)
  g.add(part((p) => {
    p.disc(cx, cy, r, r + 0.4, color)
    p.rect(cx - 1, Math.round(cy + r) + 1, 2, 1, darken(color, 0.15))
    p.rim(darken(color, 0.12))
  }))
  g.rect(cx - Math.round(r) + 2, cy - Math.round(r) + 2, 2, 1, '#ffffff')
  symbol(g, key, cx - 2, cy - 2)
}

/** A diary keyword item, used when there is no second emotion. Hand items follow the arm's swing. */
function drawItem(g: Grid, body: Grid, item: DecorationId, ramp: Ramp, armX: number, armY: number, itemArt: 'original' | 'reference') {
  if (item === 'headphones') {
    const top = topOf(body)
    const left = edge(body, top + 6, -1)
    const right = edge(body, top + 6, 1)
    const span = Math.max(1, right - left)
    // Draw a visible arch above the head instead of tracing a nearly straight line
    // through the body. The two padded cups sit over the sides of the head.
    for (let x = left; x <= right; x += 1) {
      const t = (x - left) / span
      const y = top + 1 - Math.round(Math.sin(Math.PI * t) * 5)
      g.set(x, y, DECORATION_OUTLINE)
      g.set(x, y + 1, DECORATION_OUTLINE)
      g.set(x, y + 2, HEADPHONE_COLORS.band)
      if (t > 0.35 && t < 0.65) g.set(x, y + 2, HEADPHONE_COLORS.bandLight)
    }
    for (const x of [left - 2, right - 1]) {
      g.rect(x, top + 3, 4, 7, DECORATION_OUTLINE)
      g.rect(x + 1, top + 4, 2, 5, HEADPHONE_COLORS.band)
      g.set(x + 1, top + 4, HEADPHONE_COLORS.bandLight)
    }
    return
  }
  const sprite = (itemArt === 'reference' ? ITEM_SPRITES_V2[item] : null) ?? ITEM_SPRITES[item]
  const w = Math.max(...sprite.rows.map((row) => row.length))
  const h = sprite.rows.length
  const onHead = DECORATION_ANCHOR[item] === 'head'
  const x0 = onHead ? C + 1 - Math.floor(w / 2) : Math.min(armX - 2, 38 - w)
  const y0 = onHead ? Math.max(topOf(body) - h + 2, 1) : armY - Math.floor(h / 2)
  const solid = new Grid(); const bare = new Grid()
  sprite.rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === '.' || !sprite.colors[ch]) return
    ;(ch === sprite.bare ? bare : solid).set(x0 + dx, y0 + dy, sprite.colors[ch])
  }))
  g.add(solid, sprite.outline !== false, DECORATION_OUTLINE)
  g.add(bare, false)
  if (!onHead) g.add(part((p) => p.rect(x0 - 1, y0 + h - 4, 3, 3, ramp.tones[3])), true, ramp.line)
}

/** The final 12 × 12 art. It carries its own outline, and sits in the hand as on the items demo page. */
function drawHeldItem(g: Grid, art: ItemArt, armX: number, armY: number) {
  const x0 = Math.min(armX - 2, 40 - 1 - art.rows[0].length)
  const y0 = armY - Math.floor(art.rows.length / 2)
  art.rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (art.colors[ch]) g.set(x0 + dx, y0 + dy, art.colors[ch])
  }))
}

/** The chosen second-emotion display: same-sized balloons, one to three of them by score. */
// A row above the head: the count is the score, so no balloon may hide behind the body,
// and each one and its outline must stay on the canvas as it sways.
const BALLOON_SPOTS = [[32, 6], [14, 6], [23, 6]]

function drawSoftBalloons(g: Grid, key: EmotionKey, score: number, handY: number, tick: number, relation: EmotionRelation | null) {
  const count = score < 35 ? 1 : score < 65 ? 2 : 3
  const ramp = rampFrom(COLORS[key])
  const relationSpots: Record<EmotionRelation, number[][]> = {
    companion: BALLOON_SPOTS,
    residual: [[31, 7], [10, 6], [24, 5]],
    relief: [[26, 8], [17, 7], [23, 5]],
    reversal: [[22, 4], [31, 7], [13, 7]],
  }
  const spots = relation ? relationSpots[relation] : BALLOON_SPOTS
  spots.slice(0, count).forEach(([x, y], i) => {
    const cx = x + [0, 1, 1, 0][Math.floor((tick + i * 2) / 2) % 4]
    g.add(part((p) => p.line(cx, y + 6, 31, handY, '#a79fb0')), false)
    g.add(part((p) => {
      p.disc(cx, y, 4.2, 4.4, ramp.tones[3])
      p.rect(cx - 1, y + 5, 2, 1, ramp.tones[3])
      softShade(p, ramp, 4.2)
      p.rect(cx - 3, y - 3, 2, 1, ramp.tones[0])
    }), true, ramp.line)
    g.stamp(SYMBOLS[key], cx - 2, y - 2, { '#': ramp.line })
  })
}

export function renderFriend(spec: ConceptSpec, options: FriendOptions = {}) {
  const { tick = 1, walking = true, accessory = 'balloon', shape: shapeOverride, soft = false, item = null, itemArt = 'original', heldItem = null, secondaryRelation = null } = options
  const held = heldItem ? heldItemArt(heldItem) : null
  const { key, score } = spec.primary
  const lv = levelFor(score)
  const shape = shapeOverride ?? SHAPE_OF[key]
  const tone = toneFor(key, lv)
  const s = stride(tick, walking)
  const [wAdd, hAdd] = SCALE[shape] ?? [0, 0]
  const rx = 10.5 + score * 0.035 + wAdd
  const ry = 10 + score * 0.035 + hAdd
  const cy = FLOOR - ry + 1
  const ramp = rampFrom(tone)
  const g = new Grid()
  g.rect(C + 1 - Math.round(rx), 38, Math.round(rx * 2), 1, '#00000018')
  if (soft) {
    g.add(part((p) => {
      p.rect(C - 6, FLOOR + 1 + s.left, 5, 3, ramp.tones[4])
      p.rect(C + 2, FLOOR + 1 + s.right, 5, 3, ramp.tones[4])
      softShade(p, { tones: ramp.tones.map((_, i) => ramp.tones[Math.min(i + 1, 6)]), line: ramp.line }, 2)
    }), true, ramp.line)
  } else {
    feet(g, tick, walking, darken(tone, 0.2))
  }
  const upper = new Grid()
  const armY = Math.round(cy + 3)
  const arms = part((p) => {
    p.rect(Math.round(CX - rx) - 2, armY + s.swing, 3, 4, darken(tone, 0.08))
    p.rect(Math.round(CX + rx) - 1, armY - s.swing, 3, 4, darken(tone, 0.08))
    if (soft) softShade(p, ramp, 2)
  })
  upper.add(arms, true, soft ? ramp.line : undefined)
  const body = bodyMask(shape, rx, ry, FLOOR, lv, tone)
  if (soft) {
    const tones = softShade(body, ramp, Math.min(rx, ry))
    if (spec.secondary && accessory === 'dye') {
      const dyed = rampFrom(COLORS[spec.secondary.key])
      const line = FLOOR - (FLOOR - (cy - ry)) * (spec.secondary.score / 100) * 0.72
      tones.forEach((t, i) => {
        if (t < 0) return
        const x = i % 40; const y = Math.floor(i / 40)
        const edge = line + Math.sin(x * 0.6)
        if (y > edge + 1 || (y > edge - 1 && (x + y) % 2 === 0)) body.px[i] = dyed.tones[t]
      })
    }
    const shineX = Math.round(CX - rx * 0.46); const shineY = Math.round(cy - ry * 0.58)
    body.px.forEach((c, i) => {
      if (c && ((i % 40 - shineX) / 3.2) ** 2 + ((Math.floor(i / 40) - shineY) / 1.5) ** 2 <= 1) body.px[i] = ramp.tones[0]
    })
    upper.add(body, true, ramp.line)
  } else {
    body.rim(darken(tone))
    const light = lighten(tone, 0.5)
    for (let y = 0; y < 40; y += 1) for (let x = 0; x < 40; x += 1) {
      if (body.get(x, y) === tone && ((x - CX + rx * 0.5) / (rx * 0.26)) ** 2 + ((y - cy + ry * 0.6) / (ry * 0.16)) ** 2 <= 1) body.set(x, y, light)
    }
    upper.add(body)
  }
  drawSlimeFace(upper, key, lv, Math.min(Math.round(cy - 1), 25), rx >= 11.5 ? 4 : 3, darken(tone))
  if (spec.secondary) {
    const second = spec.secondary
    const size = second.score < 35 ? 0 : second.score < 65 ? 1 : 2
    if (accessory === 'hat') drawHat(upper, body, second.key, size)
    if (accessory === 'pin') drawPin(upper, body, second.key, size, cy, ry)
    if (accessory === 'badge') drawBadge(upper, second.key, size)
    if (accessory === 'bag') drawBag(upper, body, second.key, size)
    if (soft && accessory === 'balloon') drawSoftBalloons(g, second.key, second.score, armY + s.bob, tick, secondaryRelation)
    g.add(shifted(upper, s.bob), false)
    if (!soft && accessory === 'balloon') drawBalloon(g, second.key, size, armY + s.bob, tick)
  } else {
    if (item) drawItem(upper, body, item, rampFrom(tone), Math.round(CX + rx), armY - s.swing, itemArt)
    if (held) drawHeldItem(upper, held, Math.round(CX + rx), armY - s.swing)
    g.add(shifted(upper, s.bob), false)
  }
  // The item sits where the lower right symbol would go.
  particles(g, key, lv, tick, (item || held) && !spec.secondary ? [1] : [])
  return g
}
