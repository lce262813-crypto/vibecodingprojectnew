// Shared drawing kit for the character concept demos: a small grid, an auto-outline, and a face set.
// Everything is flat colour on whole pixels, so each sprite stays readable at room size.
import type { EmotionKey } from '../pixel/palette'

export const SIZE = 40
export const INK = '#33283b'
export const SKIN = '#ffe6cf'
export const SKIN_SHADE = '#f4c9ad'
export const WHITE = '#ffffff'
const BLUSH = '#f59a9f'
const TEAR = '#6fc3f2'

export interface EmotionInput { key: EmotionKey; score: number }
export interface ConceptSpec { primary: EmotionInput; secondary: EmotionInput | null }
export type Level = 1 | 2 | 3 | 4 | 5
export type Group = 'achievement' | 'flutter' | 'lowEnergy' | 'loss' | 'anger' | 'tension'

export const COLORS: Record<EmotionKey, string> = {
  joy: '#ffd84d', excitement: '#ff9fc7', calm: '#72d3a4', pride: '#ffb347', moved: '#ffc7a6', sadness: '#669fe3',
  anger: '#e5484d', irritation: '#e8793e', anxiety: '#9b82e2', loneliness: '#5798a8', disappointment: '#a98672',
  embarrassment: '#ff7f6e', confusion: '#c074d6', shyness: '#f3b6d6', fatigue: '#8a90a8', lethargy: '#9db3a3',
}

export const GROUP_OF: Record<EmotionKey, Group> = {
  joy: 'achievement', pride: 'achievement', moved: 'achievement', excitement: 'flutter', shyness: 'flutter',
  calm: 'lowEnergy', fatigue: 'lowEnergy', lethargy: 'lowEnergy', sadness: 'loss', loneliness: 'loss',
  disappointment: 'loss', anger: 'anger', irritation: 'anger', anxiety: 'tension', embarrassment: 'tension',
  confusion: 'tension',
}

export const levelFor = (score: number): Level => (score < 20 ? 1 : score < 40 ? 2 : score < 60 ? 3 : score < 80 ? 4 : 5)

/** Emotions whose energy sinks as they grow; the rest rise. */
export const SINKS = new Set<EmotionKey>(['sadness', 'loneliness', 'disappointment', 'fatigue', 'lethargy', 'shyness'])

export function darken(hex: string, amount = 0.22) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (v: number) => Math.round(v * (1 - amount) + 51 * amount).toString(16).padStart(2, '0')
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`
}

export function lighten(hex: string, amount = 0.4) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (v: number) => Math.round(v + (255 - v) * amount).toString(16).padStart(2, '0')
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`
}

export class Grid {
  px: (string | null)[] = new Array(SIZE * SIZE).fill(null)

  set(x: number, y: number, c: string) {
    const ix = Math.round(x); const iy = Math.round(y)
    if (ix >= 0 && iy >= 0 && ix < SIZE && iy < SIZE) this.px[iy * SIZE + ix] = c
  }

  get(x: number, y: number) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? this.px[y * SIZE + x] : null
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let dy = 0; dy < h; dy += 1) for (let dx = 0; dx < w; dx += 1) this.set(x + dx, y + dy, c)
  }

  disc(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, c)
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string, w = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= steps; i += 1) {
      this.rect(Math.round(x0 + (x1 - x0) * i / steps), Math.round(y0 + (y1 - y0) * i / steps), w, w, c)
    }
  }

  /** Draws rows of text; '.' is empty and other characters are looked up in the map. */
  stamp(rows: string[], x: number, y: number, map: Record<string, string>) {
    rows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (map[ch]) this.set(x + dx, y + dy, map[ch]) }))
  }

  /** Shades the lower-right rim so a flat part reads as a rounded form. */
  rim(shade: string) {
    const copy = [...this.px]
    for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
      if (!copy[y * SIZE + x]) continue
      const right = x + 1 < SIZE ? copy[y * SIZE + x + 1] : null
      const below = y + 1 < SIZE ? copy[(y + 1) * SIZE + x] : null
      if (!right || !below) this.px[y * SIZE + x] = shade
    }
  }

  /** Places another grid on this one with a one-pixel ink outline around it. */
  add(part: Grid, outline = true, color = INK) {
    if (outline) {
      for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
        if (part.get(x, y)) continue
        if (part.get(x - 1, y) || part.get(x + 1, y) || part.get(x, y - 1) || part.get(x, y + 1)) this.set(x, y, color)
      }
    }
    part.px.forEach((c, i) => { if (c) this.px[i] = c })
  }
}

export function part(draw: (g: Grid) => void) {
  const g = new Grid()
  draw(g)
  return g
}

type Eye = 'dot' | 'happy' | 'closed' | 'soft' | 'droop' | 'angry' | 'wide' | 'heart' | 'half' | 'side' | 'swirl' | 'shiny' | 'tiny'
type Mouth = 'smile' | 'open' | 'flat' | 'frown' | 'wobble' | 'o' | 'grit' | 'smirk'
export interface FaceSpec { eye: Eye; mouth: Mouth; w: 2 | 4 | 6; tear?: 0 | 1 | 2; sweat?: boolean; blush?: boolean }

export function faceFor(key: EmotionKey, lv: Level): FaceSpec {
  const hi = lv >= 4; const mid = lv >= 3
  switch (key) {
    case 'joy': return { eye: mid ? 'happy' : 'dot', mouth: hi ? 'open' : 'smile', w: hi ? 6 : 4, blush: mid }
    case 'excitement': return { eye: hi ? 'heart' : 'shiny', mouth: hi ? 'open' : 'smile', w: 4, blush: true }
    case 'calm': return { eye: mid ? 'soft' : 'dot', mouth: 'smile', w: 2 }
    case 'pride': return { eye: hi ? 'happy' : 'closed', mouth: hi ? 'open' : 'smirk', w: 4, blush: hi }
    case 'moved': return { eye: 'shiny', mouth: mid ? 'wobble' : 'smile', w: 4, tear: hi ? 1 : 0, blush: true }
    case 'sadness': return { eye: 'droop', mouth: hi ? 'wobble' : 'frown', w: 4, tear: lv === 5 ? 2 : mid ? 1 : 0 }
    case 'anger': return { eye: 'angry', mouth: hi ? 'grit' : mid ? 'frown' : 'flat', w: hi ? 6 : 4 }
    case 'irritation': return { eye: mid ? 'half' : 'dot', mouth: hi ? 'grit' : 'wobble', w: 4 }
    case 'anxiety': return { eye: mid ? 'wide' : 'dot', mouth: 'wobble', w: 4, sweat: lv >= 2 }
    case 'loneliness': return { eye: 'side', mouth: mid ? 'frown' : 'flat', w: 2, tear: lv === 5 ? 1 : 0 }
    case 'disappointment': return { eye: 'half', mouth: 'frown', w: mid ? 4 : 2 }
    case 'embarrassment': return { eye: 'wide', mouth: hi ? 'wobble' : 'o', w: 4, sweat: true, blush: mid }
    case 'confusion': return { eye: mid ? 'swirl' : 'dot', mouth: 'wobble', w: 4, sweat: hi }
    case 'shyness': return { eye: hi ? 'closed' : 'tiny', mouth: 'wobble', w: 2, blush: true }
    case 'fatigue': return { eye: hi ? 'closed' : 'half', mouth: hi ? 'o' : 'flat', w: 2 }
    case 'lethargy': return { eye: hi ? 'closed' : 'half', mouth: 'flat', w: 4 }
  }
}

function drawEye(g: Grid, x: number, y: number, eye: Eye, left: boolean) {
  const out = left ? x : x + 2
  const inn = left ? x + 2 : x
  switch (eye) {
    case 'dot': g.rect(x + (left ? 1 : 0), y, 2, 2, INK); break
    case 'tiny': g.rect(x + 1, y + 1, 1, 1, INK); break
    case 'shiny': g.rect(x, y - 1, 3, 3, INK); g.set(x + 1, y - 1, WHITE); break
    case 'happy': g.set(x, y + 1, INK); g.set(x + 1, y, INK); g.set(x + 2, y + 1, INK); break
    case 'closed': g.rect(x, y + 1, 3, 1, INK); break
    case 'soft': g.set(x, y, INK); g.set(x + 1, y + 1, INK); g.set(x + 2, y, INK); break
    case 'droop': g.rect(x + (left ? 1 : 0), y + 1, 2, 2, INK); g.set(out, y, INK); g.set(x + 1, y - 1, INK); break
    case 'angry': g.rect(x + (left ? 1 : 0), y + 1, 2, 2, INK); g.set(out, y - 2, INK); g.set(x + 1, y - 1, INK); g.set(inn, y, INK); break
    case 'wide': g.rect(x, y - 1, 3, 3, WHITE); g.set(x + 1, y, INK); g.rect(x, y - 2, 3, 1, INK); break
    case 'heart': g.set(x, y - 1, '#ef4a64'); g.set(x + 2, y - 1, '#ef4a64'); g.rect(x, y, 3, 1, '#ef4a64'); g.set(x + 1, y + 1, '#ef4a64'); break
    case 'half': g.rect(x, y, 3, 1, INK); g.rect(x + (left ? 1 : 0), y + 1, 2, 1, INK); break
    case 'side': g.rect(x + 1, y, 2, 2, INK); break
    case 'swirl': g.rect(x, y - 1, 3, 3, INK); g.set(x + 1, left ? y : y - 1, WHITE); break
  }
}

function drawMouth(g: Grid, c: number, y: number, m: Mouth, w: number) {
  const x = c + 1 - w / 2
  switch (m) {
    case 'smile':
      if (w === 2) { g.rect(x, y, 2, 1, INK); break }
      g.rect(x + 1, y + 1, w - 2, 1, INK); g.set(x, y, INK); g.set(x + w - 1, y, INK); break
    case 'smirk': g.rect(x, y + 1, w - 1, 1, INK); g.set(x + w - 1, y, INK); break
    case 'open': g.rect(x, y, w, 3, INK); g.rect(x + 1, y + 1, w - 2, 2, '#e85d6f'); break
    case 'flat': g.rect(x, y, w, 1, INK); break
    case 'frown': g.rect(x + 1, y, Math.max(w - 2, 1), 1, INK); g.set(x, y + 1, INK); g.set(x + w - 1, y + 1, INK); break
    case 'wobble': for (let i = 0; i < w; i += 1) g.set(x + i, y + (i % 2), INK); break
    case 'o': g.rect(c, y, 2, 2, INK); break
    case 'grit': g.rect(x, y, w, 3, INK); g.rect(x + 1, y + 1, w - 2, 1, WHITE); break
  }
}

/** c is the left of the two centre columns; y is the top of the eyes; gap is the space from centre to each eye. */
export function drawFace(g: Grid, c: number, y: number, face: FaceSpec, gap = 2, mouthDrop = 4) {
  const lx = c - gap - 2
  const rx = c + gap + 1
  if (face.blush) { g.rect(lx - 2, y + 3, 2, 1, BLUSH); g.rect(rx + 3, y + 3, 2, 1, BLUSH) }
  drawEye(g, lx, y, face.eye, true)
  drawEye(g, rx, y, face.eye, false)
  drawMouth(g, c, y + mouthDrop, face.mouth, face.w)
  if (face.tear) {
    g.rect(lx + 1, y + 2, 1, 2 + face.tear, TEAR)
    if (face.tear === 2) g.rect(rx + 1, y + 2, 1, 4, TEAR)
  }
  if (face.sweat) { g.set(rx + 4, y - 3, TEAR); g.rect(rx + 4, y - 2, 2, 2, TEAR) }
}
