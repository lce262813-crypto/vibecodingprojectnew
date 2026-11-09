// Fourth round: the body-shape friends at 80 × 80. Bodies get a height map from their silhouette, so any
// shape is lit the same way; faces are drawn in layers; the second emotion no longer relies on item size.
import type { EmotionKey } from '../pixel/palette'
import { COLORS, levelFor, type ConceptSpec, type Level } from './kit'
import { SHAPE_OF, SYMBOLS, type BodyShape } from './walkers'

export const HI_SIZE = 80
const N = HI_SIZE
const CX = 39.5
const FLOOR = 64
const INK = '#2a1d33'
const SINKING = new Set<EmotionKey>(['sadness', 'loneliness', 'disappointment', 'fatigue', 'lethargy', 'shyness'])

export type SecondaryMode = 'dye' | 'spots' | 'balloons' | 'bloom' | 'buddy'
export const SECONDARY_MODES: SecondaryMode[] = ['dye', 'spots', 'balloons', 'bloom', 'buddy']
export interface HiOptions { tick?: number; walking?: boolean; mode?: SecondaryMode; shape?: BodyShape }

export interface HiGrid { px: (string | null)[] }
type Mask = Uint8Array

/* Colour: seven tones whose shadows lean violet and whose lights lean warm, plus a dark tinted outline. */
function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}

function toHex(h: number, s: number, l: number) {
  const a = (Math.min(100, Math.max(0, s)) / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (k: number) => {
    const t = (k + h / 30) % 12
    return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(t - 3, 9 - t, 1)))).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const toward = (h: number, target: number, deg: number) => {
  const diff = ((target - h + 540) % 360) - 180
  return (h + Math.sign(diff) * Math.min(Math.abs(diff), deg) + 360) % 360
}

export interface Ramp { tones: string[]; line: string }

export function rampFrom(hex: string): Ramp {
  const [h, s, l] = toHsl(hex)
  const warm = (deg: number) => toward(h, 55, deg)
  const cool = (deg: number) => toward(h, 265, deg)
  return {
    tones: [
      toHex(warm(8), s * 0.85, l + (100 - l) * 0.78), toHex(warm(6), s, l + (100 - l) * 0.46),
      toHex(warm(3), s, l + (100 - l) * 0.2), hex, toHex(cool(4), s + 2, l * 0.93),
      toHex(cool(9), s + 3, l * 0.84), toHex(cool(15), s + 4, l * 0.72),
    ],
    line: toHex(cool(22), Math.max(s, 38), Math.min(l * 0.36, 30)),
  }
}

function strengthColor(key: EmotionKey, lv: Level) {
  const [h, s, l] = toHsl(COLORS[key])
  if (lv === 5) return toHex(h, s * 1.12, l)
  return toHex(h, s * [0.62, 0.76, 0.9, 1][lv - 1], l + (100 - l) * [0.5, 0.34, 0.16, 0][lv - 1])
}

/* Parts: a mask, a lit tone per pixel, and painting with a tinted outline. */
const newMask = (): Mask => new Uint8Array(N * N)
const at = (x: number, y: number) => y * N + x
const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N

function fillDisc(m: Mask, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(N - 1, Math.ceil(cy + ry)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(N - 1, Math.ceil(cx + rx)); x += 1) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) m[at(x, y)] = 1
    }
  }
}

function fillRow(m: Mask, cx: number, y: number, half: number) {
  if (y < 0 || y >= N) return
  for (let x = Math.max(0, Math.ceil(cx - half)); x <= Math.min(N - 1, Math.floor(cx + half)); x += 1) m[at(x, y)] = 1
}

const LIGHT = [-0.46, -0.6, 0.66]

/** Lights a mask as a soft rounded form: 1 (bright) to 6 (deep), with bounce light on the far edge. */
function lit(mask: Mask, radius: number) {
  const dist = new Float32Array(N * N).fill(0)
  const big = 999
  for (let i = 0; i < mask.length; i += 1) dist[i] = mask[i] ? big : 0
  const pass = (x: number, y: number, dx: number, dy: number, cost: number) => {
    const nx = x + dx; const ny = y + dy
    const other = inGrid(nx, ny) ? dist[at(nx, ny)] : 0
    if (other + cost < dist[at(x, y)]) dist[at(x, y)] = other + cost
  }
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) if (mask[at(x, y)]) { pass(x, y, -1, 0, 1); pass(x, y, 0, -1, 1); pass(x, y, -1, -1, 1.41); pass(x, y, 1, -1, 1.41) }
  for (let y = N - 1; y >= 0; y -= 1) for (let x = N - 1; x >= 0; x -= 1) if (mask[at(x, y)]) { pass(x, y, 1, 0, 1); pass(x, y, 0, 1, 1); pass(x, y, 1, 1, 1.41); pass(x, y, -1, 1, 1.41) }
  const height = new Float32Array(N * N)
  for (let i = 0; i < mask.length; i += 1) {
    const t = Math.min(dist[i] / radius, 1)
    height[i] = mask[i] ? Math.sqrt(1 - (1 - t) ** 2) * radius : 0
  }
  // Two box blurs keep the light bands soft instead of following every step in the outline.
  for (let round = 0; round < 2; round += 1) {
    const copy = height.slice()
    for (let y = 1; y < N - 1; y += 1) for (let x = 1; x < N - 1; x += 1) {
      if (!mask[at(x, y)]) continue
      let sum = 0
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) sum += copy[at(x + dx, y + dy)]
      height[at(x, y)] = sum / 9
    }
  }
  const tone = new Int8Array(N * N).fill(-1)
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
    if (!mask[at(x, y)]) continue
    const gx = (inGrid(x - 1, y) ? height[at(x - 1, y)] : 0) - (inGrid(x + 1, y) ? height[at(x + 1, y)] : 0)
    const gy = (inGrid(x, y - 1) ? height[at(x, y - 1)] : 0) - (inGrid(x, y + 1) ? height[at(x, y + 1)] : 0)
    const len = Math.hypot(gx, gy, 2.6)
    const v = (gx * LIGHT[0] + gy * LIGHT[1] + 2.6 * LIGHT[2]) / len
    let t = v > 0.92 ? 1 : v > 0.72 ? 2 : v > 0.52 ? 3 : v > 0.34 ? 4 : v > 0.14 ? 5 : 6
    if (t >= 5 && gx > 0 && gy > 0 && dist[at(x, y)] <= 2.5) t -= 1 // Bounce light along the shaded edge.
    tone[at(x, y)] = t
  }
  // Remove lone pixels so each tone reads as a clean shape.
  for (let round = 0; round < 2; round += 1) {
    const copy = tone.slice()
    for (let y = 1; y < N - 1; y += 1) for (let x = 1; x < N - 1; x += 1) {
      const own = copy[at(x, y)]
      if (own < 0) continue
      const around = [copy[at(x - 1, y)], copy[at(x + 1, y)], copy[at(x, y - 1)], copy[at(x, y + 1)]].filter((v) => v >= 0)
      if (around.length && around.filter((v) => v === own).length <= 1) {
        tone[at(x, y)] = around.reduce((best, v) => (around.filter((o) => o === v).length > around.filter((o) => o === best).length ? v : best), around[0])
      }
    }
  }
  return tone
}

class Canvas {
  px: (string | null)[] = new Array(N * N).fill(null)
  set(x: number, y: number, c: string) { const ix = Math.round(x); const iy = Math.round(y); if (inGrid(ix, iy)) this.px[at(ix, iy)] = c }
  rect(x: number, y: number, w: number, h: number, c: string) { for (let dy = 0; dy < h; dy += 1) for (let dx = 0; dx < w; dx += 1) this.set(x + dx, y + dy, c) }
  disc(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, c)
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string, w = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= steps; i += 1) this.rect(Math.round(x0 + (x1 - x0) * i / steps), Math.round(y0 + (y1 - y0) * i / steps), w, w, c)
  }
  /** Paints a lit mask with its outline; pick lets a pixel use another ramp. */
  paint(mask: Mask, tone: Int8Array, ramp: Ramp, pick?: (x: number, y: number) => Ramp) {
    for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
      if (mask[at(x, y)]) continue
      const near = (inGrid(x - 1, y) && mask[at(x - 1, y)]) || (inGrid(x + 1, y) && mask[at(x + 1, y)]) || (inGrid(x, y - 1) && mask[at(x, y - 1)]) || (inGrid(x, y + 1) && mask[at(x, y + 1)])
      if (near) this.px[at(x, y)] = ramp.line
    }
    for (let i = 0; i < mask.length; i += 1) {
      if (!mask[i]) continue
      const use = pick ? pick(i % N, Math.floor(i / N)) : ramp
      this.px[i] = use.tones[tone[i]]
    }
  }
  merge(other: Canvas, dy: number) {
    other.px.forEach((c, i) => { if (c) { const y = Math.floor(i / N) + dy; if (y >= 0 && y < N) this.px[y * N + i % N] = c } })
  }
}

function blend(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16)
  const mix = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t).toString(16).padStart(2, '0')
  return `#${mix(16)}${mix(8)}${mix(0)}`
}

/* Faces. Each eye is drawn on its own, then a lid can cut it at an angle. */
type EyeKind = 'open' | 'wide' | 'sparkle' | 'arc' | 'soft' | 'tight' | 'heart' | 'spiral' | 'hollow' | 'line'
type MouthKind = 'smile' | 'open' | 'grin' | 'frown' | 'wobble' | 'wave' | 'flat' | 'smirk' | 'o' | 'grit' | 'shout' | 'sigh'

interface Face {
  eye: EyeKind
  eyeRight?: EyeKind
  lookX?: number
  lookY?: number
  lid?: number
  tilt?: number
  brow?: number
  mouth: MouthKind
  w: number
  h?: number
  blush?: 1 | 2
  tear?: 1 | 2 | 3
  sweat?: 1 | 2
  vein?: boolean
  gloom?: boolean
}

const f = (eye: EyeKind, mouth: MouthKind, w: number, rest: Partial<Face> = {}): Face => ({ eye, mouth, w, ...rest })

const FACES: Record<EmotionKey, Face[]> = {
  joy: [f('open', 'smile', 7), f('open', 'smile', 11, { blush: 1 }), f('arc', 'open', 10, { h: 6, blush: 1 }), f('arc', 'open', 13, { h: 8, blush: 2 }), f('arc', 'grin', 16, { h: 10, blush: 2 })],
  excitement: [f('open', 'smile', 6, { blush: 1, brow: -0.2 }), f('sparkle', 'smile', 9, { blush: 1, brow: -0.2 }), f('sparkle', 'open', 10, { h: 6, blush: 2 }), f('heart', 'open', 11, { h: 7, blush: 2 }), f('heart', 'grin', 15, { h: 9, blush: 2 })],
  calm: [f('open', 'smile', 7, { lid: 0.2 }), f('soft', 'smile', 7), f('soft', 'smile', 10), f('soft', 'smile', 12, { blush: 1 }), f('soft', 'smile', 8, { blush: 2 })],
  pride: [f('open', 'smirk', 8, { lid: 0.2 }), f('open', 'smirk', 10, { lid: 0.35, brow: 0.1 }), f('open', 'smirk', 12, { lid: 0.42, brow: -0.2 }), f('soft', 'grin', 13, { h: 7 }), f('arc', 'grin', 16, { h: 8, blush: 1 })],
  moved: [f('sparkle', 'smile', 7, { brow: -0.3 }), f('sparkle', 'smile', 10, { blush: 1, brow: -0.4 }), f('sparkle', 'wobble', 10, { blush: 1, brow: -0.5, tear: 1 }), f('sparkle', 'open', 10, { h: 6, blush: 2, brow: -0.5, tear: 2 }), f('soft', 'open', 12, { h: 7, blush: 2, brow: -0.5, tear: 3 })],
  sadness: [f('open', 'frown', 7, { lookY: 1, tilt: -0.4, brow: -0.5 }), f('open', 'frown', 10, { tilt: -0.5, brow: -0.6 }), f('open', 'wobble', 10, { tilt: -0.6, brow: -0.7, tear: 1 }), f('tight', 'open', 10, { h: 6, brow: -0.8, tear: 2 }), f('tight', 'open', 14, { h: 9, brow: -0.8, tear: 3 })],
  anger: [f('open', 'frown', 7, { tilt: 0.5, brow: 0.5 }), f('open', 'frown', 10, { tilt: 0.7, brow: 0.7 }), f('open', 'grit', 12, { tilt: 0.9, brow: 0.9, vein: true }), f('open', 'shout', 13, { h: 7, tilt: 1, brow: 1, vein: true }), f('hollow', 'shout', 16, { h: 9, tilt: 1, brow: 1, vein: true })],
  irritation: [f('open', 'flat', 8, { lid: 0.35, lookX: 2 }), f('open', 'wobble', 8, { lid: 0.45, lookX: 2, brow: 0.3 }), f('open', 'wobble', 11, { lid: 0.5, tilt: 0.4, brow: 0.5 }), f('line', 'wave', 12, { brow: 0.7, vein: true }), f('open', 'grit', 13, { lid: 0.3, tilt: 0.7, brow: 0.8, vein: true })],
  anxiety: [f('open', 'flat', 4, { lookX: -2, brow: -0.5 }), f('open', 'wave', 8, { brow: -0.6, sweat: 1 }), f('wide', 'wave', 10, { brow: -0.7, sweat: 1 }), f('wide', 'grit', 11, { brow: -0.8, sweat: 2, gloom: true }), f('hollow', 'o', 8, { h: 8, brow: -0.8, sweat: 2, gloom: true })],
  loneliness: [f('open', 'flat', 4, { lookX: -3, lookY: 1 }), f('open', 'flat', 5, { lookX: -3, lookY: 2, brow: -0.3 }), f('open', 'frown', 6, { lookY: 2, lid: 0.25, brow: -0.5 }), f('sparkle', 'frown', 7, { tilt: -0.5, brow: -0.6 }), f('sparkle', 'wobble', 7, { tilt: -0.5, brow: -0.7, tear: 1 })],
  disappointment: [f('open', 'flat', 6, { lid: 0.4 }), f('open', 'flat', 9, { lid: 0.45, lookY: 1, brow: -0.3 }), f('hollow', 'sigh', 8, { brow: -0.5 }), f('hollow', 'frown', 11, { brow: -0.6, gloom: true }), f('line', 'sigh', 10, { brow: -0.7, gloom: true })],
  embarrassment: [f('open', 'o', 5, { h: 4, brow: -0.2 }), f('sparkle', 'o', 6, { h: 5, blush: 1, brow: -0.3, sweat: 1 }), f('wide', 'o', 8, { h: 6, blush: 2, brow: -0.4, sweat: 1 }), f('wide', 'wave', 13, { blush: 2, brow: -0.5, sweat: 2 }), f('hollow', 'o', 11, { h: 10, blush: 2, brow: -0.5, sweat: 2 })],
  confusion: [f('open', 'flat', 4, { eyeRight: 'line', brow: 0.2 }), f('open', 'wave', 8, { lookX: 2, eyeRight: 'wide' }), f('open', 'o', 6, { h: 5, eyeRight: 'spiral' }), f('spiral', 'wave', 12, { eyeRight: 'hollow', sweat: 1 }), f('spiral', 'wave', 14, { sweat: 2, gloom: true })],
  shyness: [f('open', 'smile', 6, { lookX: 3, blush: 1 }), f('open', 'smile', 6, { lookY: 2, lookX: 2, blush: 2 }), f('soft', 'smile', 6, { blush: 2, brow: -0.3 }), f('open', 'wobble', 8, { eyeRight: 'arc', blush: 2, brow: -0.4 }), f('tight', 'wobble', 8, { blush: 2, brow: -0.4 })],
  fatigue: [f('open', 'flat', 6, { lid: 0.4 }), f('open', 'flat', 9, { lid: 0.55, brow: 0 }), f('open', 'sigh', 6, { lid: 0.62 }), f('line', 'sigh', 9, {}), f('line', 'o', 10, { h: 9 })],
  lethargy: [f('open', 'flat', 3, { lid: 0.2 }), f('open', 'flat', 6, { lid: 0.3 }), f('hollow', 'flat', 11, { lid: 0.3 }), f('line', 'flat', 12, { gloom: true }), f('hollow', 'wave', 14, { lid: 0.3, gloom: true })],
}

export function hiFaceFor(key: EmotionKey, lv: Level) { return FACES[key][lv - 1] }

function drawEye(c: Canvas, kind: EyeKind, ex: number, ey: number, left: boolean, face: Face, iris: Ramp) {
  const out = left ? -1 : 1
  const layer = new Canvas()
  const lx = face.lookX ?? 0; const ly = face.lookY ?? 0
  if (kind === 'open' || kind === 'sparkle') {
    layer.disc(ex, ey, 5, 6.5, INK)
    layer.disc(ex + lx * 0.6, ey + 3.4 + ly * 0.4, 3.3, 2.6, iris.tones[5])
    layer.disc(ex + lx * 0.6, ey + 4.2 + ly * 0.4, 2.2, 1.5, iris.tones[3])
    layer.disc(ex - 1.6 + lx, ey - 2.6 + ly, 2, 2.2, '#ffffff')
    layer.rect(ex + 1.6 + lx, ey + 1 + ly, 2, 2, '#ffffff')
    if (kind === 'sparkle') { layer.rect(ex - 3, ey + 2, 2, 2, '#ffffff'); layer.set(ex + 3, ey - 3, '#ffffff'); layer.set(ex - 1, ey + 4.5, '#ffffff') }
  }
  if (kind === 'wide') {
    layer.disc(ex, ey, 6, 7, INK); layer.disc(ex, ey, 5, 6, '#ffffff')
    layer.disc(ex + lx, ey + ly + 0.5, 2.6, 3, INK); layer.rect(ex - 1 + lx, ey - 1 + ly, 1.5, 1.5, '#ffffff')
  }
  if (kind === 'hollow') {
    layer.disc(ex, ey, 6, 6.6, INK); layer.disc(ex, ey, 4.8, 5.4, '#ffffff'); layer.disc(ex + lx, ey + ly, 1.3, 1.5, INK)
  }
  if (kind === 'spiral') {
    layer.disc(ex, ey, 6, 6.6, INK); layer.disc(ex, ey, 4.8, 5.4, '#ffffff')
    for (let a = 0; a < 15; a += 0.3) layer.set(ex + Math.cos(a) * a * 0.31, ey + Math.sin(a) * a * 0.33, INK)
  }
  if (kind === 'arc') for (let x = -6; x <= 6; x += 1) layer.rect(ex + x, ey + 1 + (x * x) / 8 - 2, 1, 2.4, INK)
  if (kind === 'soft') for (let x = -6; x <= 6; x += 1) layer.rect(ex + x, ey + 3 - (x * x) / 9, 1, 2.2, INK)
  if (kind === 'line') { layer.rect(ex - 6, ey + 1, 13, 2, INK); layer.rect(ex + (left ? -8 : 7), ey + 3, 2, 1, INK) }
  if (kind === 'tight') for (let i = 0; i <= 6; i += 1) { layer.rect(ex + out * (i - 3) * -1 - 1, ey - 3 + i / 2, 2, 2, INK); layer.rect(ex + out * (i - 3) * -1 - 1, ey + 3 - i / 2, 2, 2, INK) }
  if (kind === 'heart') {
    const red = '#ef3d63'
    layer.disc(ex - 3, ey - 2, 3.6, 3.6, INK); layer.disc(ex + 3, ey - 2, 3.6, 3.6, INK)
    for (let i = 0; i < 8; i += 1) layer.rect(ex - 6.5 + i, ey + i, 14 - 2 * i, 1, INK)
    layer.disc(ex - 3, ey - 2, 2.6, 2.6, red); layer.disc(ex + 3, ey - 2, 2.6, 2.6, red)
    for (let i = 0; i < 6; i += 1) layer.rect(ex - 5 + i, ey + i, 11 - 2 * i, 1, red)
    layer.rect(ex + 1, ey + 2, 3, 2, '#b82549'); layer.rect(ex - 4, ey - 3, 2, 2, '#ffffff')
  }
  // Lid: cut the eye along a slanted line and leave a heavy lash line.
  const lid = face.lid ?? 0; const tilt = face.tilt ?? 0
  if ((lid || tilt) && (kind === 'open' || kind === 'sparkle' || kind === 'wide' || kind === 'hollow')) {
    for (let x = Math.floor(ex - 7); x <= Math.ceil(ex + 7); x += 1) {
      const cut = ey - 7 + lid * 13 + (tilt ? 2.5 : 0) + tilt * (x - ex) * (left ? 1 : -1) * 0.7
      for (let y = ey - 9; y < cut; y += 1) if (inGrid(x, Math.round(y))) layer.px[at(x, Math.round(y))] = null
      if (Math.abs(x - ex) <= 5.5) layer.rect(x, cut, 1, 2, INK)
    }
  }
  c.merge(layer, 0)
}

function drawMouth(c: Canvas, cx: number, y: number, face: Face, ramp: Ramp) {
  const { mouth, w } = face
  const h = face.h ?? 6
  const half = w / 2
  const dark = '#5f1f36'
  if (mouth === 'smile') for (let x = -half; x <= half; x += 1) c.rect(cx + x, y + 2 - ((x / half) ** 2) * 2 + 1, 1, 2, INK)
  if (mouth === 'frown') for (let x = -half; x <= half; x += 1) c.rect(cx + x, y + 1 + ((x / half) ** 2) * 3, 1, 2, INK)
  if (mouth === 'flat') c.rect(cx - half, y + 2, w, 2, INK)
  if (mouth === 'smirk') for (let x = -half; x <= half; x += 1) c.rect(cx + x, y + 3 - Math.max(0, x / half) ** 2 * 3, 1, 2, INK)
  if (mouth === 'wobble') for (let x = -half; x <= half; x += 1) c.rect(cx + x, y + 2 + Math.round(Math.sin(x * 1.1) * 1.3), 1, 2, INK)
  if (mouth === 'wave') for (let x = -half; x <= half; x += 1) c.rect(cx + x, y + 2 + (Math.floor((x + half) / 3) % 2 ? 2 : 0), 1, 2, INK)
  if (mouth === 'open' || mouth === 'grin') {
    c.rect(cx - half - 1, y - 1, w + 3, 1, INK)
    for (let row = 0; row <= h; row += 1) {
      const span = half * Math.sqrt(Math.max(0, 1 - (row / (h + 1)) ** 2))
      c.rect(cx - span - 1, y + row, span * 2 + 3, 1, INK)
      if (row < h) c.rect(cx - span, y + row, span * 2 + 1, 1, dark)
    }
    if (mouth === 'grin') c.rect(cx - half + 1, y, w - 1, 2, '#ffffff')
    c.disc(cx, y + h - 1, half * 0.6, Math.max(h * 0.32, 1.6), '#f0788c')
    c.disc(cx - 1, y + h - 1.6, half * 0.26, 0.8, '#ffb3c0')
  }
  if (mouth === 'o' || mouth === 'sigh') {
    const ry = mouth === 'sigh' ? 3 : h / 2 + 1
    c.disc(cx, y + ry, half + 1, ry + 0.6, INK); c.disc(cx, y + ry, half, ry - 0.4, mouth === 'sigh' ? ramp.tones[6] : dark)
    if (mouth === 'o' && h >= 6) c.disc(cx, y + ry * 1.5, half * 0.5, ry * 0.3, '#f0788c')
  }
  if (mouth === 'grit' || mouth === 'shout') {
    const tall = mouth === 'grit' ? 6 : h
    c.rect(cx - half - 1, y - 1, w + 3, tall + 2, INK)
    c.rect(cx - half, y, w + 1, tall, mouth === 'grit' ? '#ffffff' : dark)
    if (mouth === 'grit') { for (let x = 3; x < w; x += 3) c.rect(cx - half + x, y, 1, tall, '#aab0c4'); c.rect(cx - half, y + 2, w + 1, 1, '#aab0c4') }
    else { c.rect(cx - half, y, w + 1, 2, '#ffffff'); c.rect(cx - half + 1, y + tall - 2, w - 1, 2, '#ffffff'); for (const s of [-1, 1]) c.rect(cx + s * half * 0.5, y + 2, 2, 2, '#ffffff') }
  }
}

function drawFace(c: Canvas, key: EmotionKey, lv: Level, eyeY: number, gap: number, ramp: Ramp) {
  const face = hiFaceFor(key, lv)
  const lx = CX - gap; const rx = CX + gap
  const iris = rampFrom(COLORS[key])
  if (face.blush) {
    for (const x of [lx - 5, rx + 5]) {
      for (let y = eyeY + 5; y <= eyeY + 9; y += 1) for (let dx = -5; dx <= 5; dx += 1) {
        const px = Math.round(x + dx)
        if (((dx / 5.5) ** 2 + ((y - eyeY - 7) / 2.6) ** 2) <= 1 && c.px[at(px, y)] && c.px[at(px, y)] !== ramp.line) c.px[at(px, y)] = blend(c.px[at(px, y)] as string, '#ff6f91', 0.5)
      }
      if (face.blush === 2) for (const dx of [-3, 0, 3]) { c.set(x + dx + 1, eyeY + 6, '#e0486f'); c.set(x + dx, eyeY + 7, '#e0486f'); c.set(x + dx - 1, eyeY + 8, '#e0486f') }
    }
  }
  if (face.gloom) for (const x of [-9, -5, -1, 3, 7]) c.rect(CX + x, eyeY - 14, 1, 5 + ((x + 9) % 3), ramp.tones[6])
  if (face.brow !== undefined) {
    // Positive tilt lowers the inner end (cross); negative lowers the outer end (worried).
    const tilt = face.brow * 2.6
    const y = eyeY - 11
    c.line(lx - 4, y - tilt, lx + 4, y + tilt, ramp.line, 2)
    c.line(rx + 4, y - tilt, rx - 4, y + tilt, ramp.line, 2)
  }
  drawEye(c, face.eye, lx, eyeY, true, face, iris)
  drawEye(c, face.eyeRight ?? face.eye, rx, eyeY, false, face, iris)
  drawMouth(c, CX, eyeY + 11, face, ramp)
  if (face.tear) {
    for (const ex of face.tear === 1 ? [lx] : [lx, rx]) {
      const long = face.tear === 3 ? 14 : 7
      c.rect(ex - 1, eyeY + 6, 3, long, '#6fc3f2'); c.rect(ex - 1, eyeY + 6, 1, long, '#c9efff'); c.rect(ex + 1, eyeY + 6, 1, long, '#3f97d8')
      c.disc(ex, eyeY + 6 + long, 2.4, 2.4, '#6fc3f2'); c.set(ex - 1, eyeY + 5 + long, '#ffffff')
    }
  }
  if (face.sweat) {
    const n = face.sweat
    for (let i = 0; i < n; i += 1) {
      const x = rx + 9 + i * 2; const y = eyeY - 8 + i * 9
      c.disc(x, y + 2, 3, 3.4, '#3f97d8'); c.disc(x, y + 2, 2.2, 2.6, '#6fc3f2'); c.rect(x - 1, y - 3, 2, 3, '#3f97d8'); c.set(x - 1, y + 1, '#ffffff')
    }
  }
  if (face.vein) {
    const x = rx + 8; const y = eyeY - 13
    for (const [dx, dy] of [[-3, -1], [1, -1], [-3, 1], [1, 1]]) c.rect(x + dx, y + dy, 3, 1, '#c8183f')
    for (const [dx, dy] of [[-1, -3], [-1, 2], [1, -3], [1, 2]]) c.rect(x + dx, y + dy, 1, 2, '#c8183f')
  }
}

/* Symbols: the 5 × 5 set from round two, doubled with Scale2x so they stay smooth at this resolution. */
function symbolMask(key: EmotionKey) {
  const rows = SYMBOLS[key]
  const on = (x: number, y: number) => (rows[y]?.[x] ?? '.') === '#'
  const out: boolean[][] = Array.from({ length: 10 }, () => new Array<boolean>(10).fill(false))
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) {
    const e = on(x, y); const b = on(x, y - 1); const d = on(x - 1, y); const fr = on(x + 1, y); const h = on(x, y + 1)
    const same = b !== h && d !== fr
    out[y * 2][x * 2] = same && d === b ? d : e
    out[y * 2][x * 2 + 1] = same && b === fr ? fr : e
    out[y * 2 + 1][x * 2] = same && d === h ? d : e
    out[y * 2 + 1][x * 2 + 1] = same && h === fr ? fr : e
  }
  return out
}

/** Shapes that break down when doubled are drawn directly at this size. */
const DRAWN_SYMBOLS: Partial<Record<EmotionKey, string[]>> = {
  joy: ['.....#.....', '.#...#...#.', '..#.....#..', '....###....', '...#####...', '##.#####.##', '...#####...', '....###....', '..#.....#..', '.#...#...#.', '.....#.....'],
  moved: ['....###....', '.##.###.##.', '.#########.', '..#######..', '.####.####.', '.####.####.', '..#######..', '.#########.', '.##.###.##.', '....###....'],
  anxiety: ['.##...##...', '#..#.#..#.#', '....#....#.', '...........', '.##...##...', '#..#.#..#.#', '....#....#.'],
  shyness: ['##.......##', '####...####', '#####.#####', '###########', '#####.#####', '####...####', '##.......##'],
}

function stampSymbol(c: Canvas, key: EmotionKey, x: number, y: number, ramp: Ramp) {
  const drawn = DRAWN_SYMBOLS[key]
  const mask = drawn ? drawn.map((row) => [...row].map((ch) => ch === '#')) : symbolMask(key)
  const fill = new Canvas()
  mask.forEach((row, dy) => row.forEach((value, dx) => {
    if (value) fill.set(x + dx, y + dy, dy < 4 ? ramp.tones[2] : dy < 7 ? ramp.tones[3] : ramp.tones[4])
  }))
  mask.forEach((row, dy) => row.forEach((value, dx) => {
    if (!value || key === 'anxiety') return
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!mask[dy + oy]?.[dx + ox]) c.set(x + dx + ox, y + dy + oy, ramp.line)
  }))
  c.merge(fill, 0)
}

/* Bodies. */
const SCALE: Partial<Record<BodyShape, [number, number]>> = { flat: [5, -4], bean: [-3, 3], wave: [-1, 0] }

function bodyMask(shape: BodyShape, rx: number, ry: number, lv: number) {
  const m = newMask()
  const cy = FLOOR - ry + 1
  if (shape === 'mochi') {
    for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) if (Math.abs((x - CX) / rx) ** 3.2 + Math.abs((y - cy) / ry) ** 3.2 <= 1) m[at(x, y)] = 1
  } else if (shape === 'star') {
    for (let y = 0; y <= FLOOR; y += 1) for (let x = 0; x < N; x += 1) {
      const dx = (x - CX) / rx; const dy = (y - cy) / ry
      if (Math.hypot(dx, dy) <= 0.94 + (0.1 + lv * 0.035) * Math.cos(5 * (Math.atan2(dy, dx) + Math.PI / 2))) m[at(x, y)] = 1
    }
  } else if (shape === 'heart') {
    const top = cy - ry * 0.3
    for (const s of [-1, 1]) fillDisc(m, CX + s * rx * 0.46, top, rx * 0.58, ry * 0.62 + lv * 0.5)
    for (let y = Math.round(top); y <= FLOOR; y += 1) { const t = (y - top) / (FLOOR - top); fillRow(m, CX, y, rx * (1 - t * t * 0.55)) }
  } else {
    fillDisc(m, CX, cy, rx, ry)
  }
  if (shape === 'ears') for (const s of [-1, 1]) fillDisc(m, CX + s * rx * 0.62, cy - ry * 0.85 - lv, 5.5, 5 + lv * 1.8)
  if (shape === 'spiky') {
    for (const i of [-2, -1, 0, 1, 2]) {
      const x = CX + i * rx * 0.4
      const base = cy - ry * Math.sqrt(Math.max(0, 1 - ((x - CX) / rx) ** 2)) + 2
      const h = 3 + lv * (i === 0 ? 2.4 : 1.8)
      for (let t = 0; t <= h; t += 1) fillRow(m, x, Math.round(base - t), 6 * (1 - t / (h + 1)))
    }
  }
  if (shape === 'drop') {
    const h = 6 + lv * 2.8; const base = cy - ry * 0.7
    for (let t = 0; t <= h; t += 1) fillRow(m, CX, Math.round(base - t), rx * 0.68 * (1 - t / (h + 1)))
  }
  if (shape === 'wave') {
    for (let y = Math.round(cy); y <= FLOOR; y += 1) fillRow(m, CX, y, rx)
    const x0 = Math.ceil(CX - rx); const x1 = Math.floor(CX + rx); const deep = lv >= 4 ? 4 : 2
    for (let x = x0; x <= x1; x += 1) {
      if ((x - x0) % 10 < 5) for (let d = 1; d <= deep; d += 1) m[at(x, FLOOR + d)] = 1
      else for (let d = 0; d < 2; d += 1) m[at(x, FLOOR - d)] = 0
    }
  }
  return m
}

const partCache = new Map<string, { mask: Mask; tone: Int8Array }>()
function cachedBody(shape: BodyShape, rx: number, ry: number, lv: number) {
  const id = `${shape}:${rx.toFixed(1)}:${ry.toFixed(1)}:${lv}`
  let hit = partCache.get(id)
  if (!hit) {
    const mask = bodyMask(shape, rx, ry, lv)
    hit = { mask, tone: lit(mask, Math.min(rx, ry) * 0.92) }
    partCache.set(id, hit)
  }
  return hit
}

function blob(canvas: Canvas, cx: number, cy: number, rx: number, ry: number, ramp: Ramp, radius = Math.min(rx, ry)) {
  const m = newMask()
  fillDisc(m, cx, cy, rx, ry)
  canvas.paint(m, lit(m, radius), ramp)
}

function miniBuddy(c: Canvas, key: EmotionKey, x: number, y: number) {
  const ramp = rampFrom(COLORS[key])
  blob(c, x, y, 7.5, 7, ramp)
  c.rect(x - 3, y - 2, 2, 3, INK); c.rect(x + 2, y - 2, 2, 3, INK)
  c.set(x - 3, y - 2, '#ffffff'); c.set(x + 2, y - 2, '#ffffff')
  c.rect(x - 1, y + 2, 3, 1, INK)
}

function drawBloom(c: Canvas, key: EmotionKey, stage: number, x: number, y: number) {
  const ramp = rampFrom(COLORS[key])
  const leaf = rampFrom('#74c27a')
  blob(c, x - 6, y + 6, 4.5, 2.6, leaf); blob(c, x + 6, y + 6, 4.5, 2.6, leaf)
  if (stage === 0) { blob(c, x, y, 4.5, 6, ramp, 4); c.line(x, y - 4, x, y + 3, ramp.tones[5]); return }
  const petals = stage === 1 ? 3 : 6
  for (let i = 0; i < petals; i += 1) {
    const a = stage === 1 ? -2.1 + i * 0.98 : i * 1.047 - 1.57
    blob(c, x + Math.cos(a) * 5.4, y + Math.sin(a) * 5.4, 4, 4, ramp, 3.4)
  }
  blob(c, x, y + (stage === 1 ? 2 : 0), 3.2, 3.2, rampFrom('#ffd84d'), 3)
}

function drawBalloons(c: Canvas, key: EmotionKey, count: number, handX: number, handY: number, tick: number) {
  const spots = [[66, 15], [52, 9], [72, 34]].slice(0, count)
  const ramp = rampFrom(COLORS[key])
  spots.forEach(([x, y], i) => {
    const bx = x + [0, 1, 1, 0][Math.floor((tick + i * 2) / 2) % 4]
    c.line(bx, y + 11, handX, handY, '#8a8094')
    blob(c, bx, y, 9, 10, ramp, 8.5)
    stampSymbol(c, key, bx - 5, y - 5, ramp)
  })
}

const SPOTS = [[-0.62, 0.5], [0.62, 0.55], [-0.05, 0.86], [0.3, -0.8], [-0.34, -0.8], [-0.84, 0.1], [0.84, 0.12]]
const PARTICLES = [[1, 44], [68, 54], [1, 18], [14, 2]]

const frameCache = new Map<string, HiGrid>()

export function renderHiFriend(spec: ConceptSpec, options: HiOptions = {}): HiGrid {
  const { tick = 1, walking = true, mode = 'dye', shape: shapeOverride } = options
  const beat = walking ? tick % 4 : 0
  const id = [spec.primary.key, spec.primary.score, spec.secondary?.key, spec.secondary?.score, tick % 8, walking, mode, shapeOverride].join('|')
  const cached = frameCache.get(id)
  if (cached) return cached

  const { key, score } = spec.primary
  const lv = levelFor(score)
  const shape = shapeOverride ?? SHAPE_OF[key]
  const ramp = rampFrom(strengthColor(key, lv))
  const [wAdd, hAdd] = SCALE[shape] ?? [0, 0]
  const rx = Math.round((19 + score * 0.06 + wAdd) * 2) / 2
  const ry = Math.round((18 + score * 0.06 + hAdd) * 2) / 2
  const cy = FLOOR - ry + 1
  const bob = beat % 2 === 1 ? -2 : 0
  const swing = beat === 1 ? 2 : beat === 3 ? -2 : 0
  const second = spec.secondary
  const secondRamp = second ? rampFrom(COLORS[second.key]) : ramp
  const step = second ? (second.score < 35 ? 0 : second.score < 65 ? 1 : 2) : 0

  const out = new Canvas()
  out.disc(CX, 72, rx * 0.86, 2, '#00000016')
  const feetRamp = rampFrom(strengthColor(key, Math.max(lv, 3) as Level))
  blob(out, CX - 9, FLOOR + 4 - (beat === 1 ? 4 : 0), 7, 4, { tones: feetRamp.tones.map((_, i) => feetRamp.tones[Math.min(i + 1, 6)]), line: feetRamp.line }, 4)
  blob(out, CX + 9, FLOOR + 4 - (beat === 3 ? 4 : 0), 7, 4, { tones: feetRamp.tones.map((_, i) => feetRamp.tones[Math.min(i + 1, 6)]), line: feetRamp.line }, 4)

  if (second && mode === 'balloons') drawBalloons(out, second.key, step + 1, Math.round(CX + rx) + 3, Math.round(cy + 6) + bob, tick)

  const upper = new Canvas()
  const armY = Math.round(cy + 7)
  blob(upper, Math.round(CX - rx) - 1, armY + swing, 4, 6, ramp, 4)
  blob(upper, Math.round(CX + rx) + 1, armY - swing, 4, 6, ramp, 4)
  const body = cachedBody(shape, rx, ry, lv)
  const height = FLOOR - (cy - ry)
  const dyeLine = FLOOR - height * ((second?.score ?? 0) / 100) * 0.72
  const pick = second && mode === 'dye'
    ? (x: number, y: number) => {
      const edge = dyeLine + Math.sin(x * 0.32) * 1.6
      if (y > edge + 2) return secondRamp
      if (y > edge - 2 && (x + y) % 2 === 0) return secondRamp
      return ramp
    }
    : undefined
  upper.paint(body.mask, body.tone, ramp, pick)
  if (second && mode === 'spots') {
    SPOTS.slice(0, [2, 4, 7][step]).forEach(([dx, dy]) => {
      const sx = CX + dx * rx; const sy = cy + dy * ry
      for (let y = Math.floor(sy - 3); y <= sy + 3; y += 1) for (let x = Math.floor(sx - 3); x <= sx + 3; x += 1) {
        if (inGrid(x, y) && body.mask[at(x, y)] && (x - sx) ** 2 + (y - sy) ** 2 <= 8) upper.px[at(x, y)] = secondRamp.tones[body.tone[at(x, y)]]
      }
    })
  }
  // Specular highlight in the lightest tone.
  const shineX = Math.round(CX - rx * 0.46); const shineY = Math.round(cy - ry * 0.56)
  for (let y = shineY - 2; y <= shineY + 2; y += 1) for (let x = shineX - 5; x <= shineX + 5; x += 1) {
    if (inGrid(x, y) && body.mask[at(x, y)] && ((x - shineX) / 5) ** 2 + ((y - shineY) / 2.2) ** 2 <= 1) upper.px[at(x, y)] = ramp.tones[0]
  }
  upper.set(shineX + 8, shineY - 1, ramp.tones[0]); upper.set(shineX + 9, shineY - 1, ramp.tones[0])

  const eyeY = Math.min(Math.round(cy - 4), FLOOR - 24)
  drawFace(upper, key, lv, eyeY, rx >= 22 ? 12 : 10, ramp)

  if (second && mode === 'bloom') {
    let y = 0
    const x = Math.round(CX - rx * 0.62)
    while (y < N && !body.mask[at(x, y)]) y += 1
    drawBloom(upper, second.key, step, x, Math.max(y, 8))
  }
  if (second && mode === 'buddy') {
    if (step === 0) miniBuddy(upper, second.key, Math.round(CX - rx) - 3, FLOOR - 1)
    if (step === 1) miniBuddy(upper, second.key, Math.round(CX + rx) + 5, Math.round(cy - 2))
    if (step === 2) { let y = 0; while (y < N && !body.mask[at(39, y)]) y += 1; miniBuddy(upper, second.key, 39, Math.max(y - 6, 8)) }
  }
  out.merge(upper, bob)

  const sym = rampFrom(COLORS[key])
  const dir = SINKING.has(key) ? 1 : -1
  PARTICLES.slice(0, lv - 1).forEach(([x, y], i) => {
    if (mode === 'balloons' && second && x > 40) return
    stampSymbol(out, key, x, y + dir * [0, 2, 4, 2][Math.floor((tick + i * 3) / 2) % 4], sym)
  })

  const grid: HiGrid = { px: out.px }
  if (frameCache.size > 4000) frameCache.clear()
  frameCache.set(id, grid)
  return grid
}
