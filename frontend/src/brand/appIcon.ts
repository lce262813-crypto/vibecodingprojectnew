// MOZI app icon: four emotion characters packed into one square, drawn as a 32×32 pixel grid.
// Colours come from the character palette (palette.ts) and the faces from the character
// renderer's expression sprites (faces.ts), so the icon matches the monsters in the app.
// This module has no DOM or React imports: scripts/generate-brand-assets.mjs runs it in Node too.

import { buildPalette, buildRamp, emotionColor, type EmotionKey } from '../characters/pixel/palette.ts'
import { expressionFor, FACE_COLORS, mirrorSprite, type ExpressionLevel } from '../characters/pixel/faces.ts'

/** Row-major grid of hex colours; null is transparent. */
export type PixelGrid = (string | null)[][]

/** MOZI brand violet (the app's primary button colour), used behind the icon. */
export const BRAND_VIOLET = '#7c3aed'

export const ICON_SIZE = 32
const TILE = 16
const BODY = 14

interface FaceLayout {
  emotion: EmotionKey
  level: ExpressionLevel
  browY?: number
  eyeY: number
  mouthY: number
  blushY?: number
}

/** The four corners of the icon, top-left → bottom-right, with the row each face part starts on. */
export const ICON_FACES: FaceLayout[] = [
  { emotion: 'joy', level: 3, eyeY: 4, blushY: 7, mouthY: 8 },
  { emotion: 'calm', level: 2, eyeY: 5, mouthY: 9 },
  { emotion: 'anger', level: 2, browY: 1, eyeY: 3, mouthY: 9 },
  { emotion: 'sadness', level: 3, browY: 1, eyeY: 4, mouthY: 10 },
]

function blank(width: number, height: number): PixelGrid {
  return Array.from({ length: height }, () => Array<string | null>(width).fill(null))
}

function stamp(grid: PixelGrid, sprite: string[], x: number, y: number, colors: Record<string, string>) {
  sprite.forEach((row, dy) => [...row].forEach((key, dx) => {
    if (key !== '.' && colors[key]) grid[y + dy][x + dx] = colors[key]
  }))
}

/** One 16×16 character: rounded body with five shading tones, its own outline, and the emotion's face. */
export function emotionTile(face: FaceLayout): PixelGrid {
  const ramp = buildRamp(emotionColor(face.emotion, 50))
  const tile = blank(TILE, TILE)
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const edgeX = x === 0 || x === TILE - 1
      const edgeY = y === 0 || y === TILE - 1
      const cornerX = Math.min(x, TILE - 1 - x)
      const cornerY = Math.min(y, TILE - 1 - y)
      if (cornerX + cornerY < 2) continue // two-step rounded corner, like the monsters' soft bodies
      const bx = x - 1
      const by = y - 1
      const bodyCorner = (bx === 0 || bx === BODY - 1) && (by === 0 || by === BODY - 1)
      if (edgeX || edgeY || bodyCorner) { tile[y][x] = ramp[5]; continue }
      let tone = 2
      if (by === BODY - 1) tone = 4
      else if (by === BODY - 2 || bx === BODY - 1) tone = 3
      else if (by === 0 || bx === 0) tone = 1
      if ((bx === 1 && by === 1) || (bx === 2 && by === 1) || (bx === 1 && by === 2)) tone = 0
      tile[y][x] = ramp[tone]
    }
  }

  const expression = expressionFor(face.emotion, face.level)
  const colors = { ...FACE_COLORS, s: ramp[3] }
  const body = blank(BODY, BODY)
  const pair = (left: string[], right: string[] | null | undefined, y: number) => {
    const width = left[0].length
    stamp(body, left, 2, y, colors)
    stamp(body, right ?? mirrorSprite(left), BODY - 2 - width, y, colors)
  }
  if (expression.brows && face.browY !== undefined) pair(expression.brows, expression.browsRight, face.browY)
  pair(expression.eyes, expression.eyesRight, face.eyeY)
  stamp(body, expression.mouth, (BODY - expression.mouth[0].length) / 2, face.mouthY, colors)
  if (expression.blush && face.blushY !== undefined) {
    const blush = buildPalette({ key: face.emotion, score: 50 }).blush
    stamp(body, ['pp'], 1, face.blushY, { p: blush })
    stamp(body, ['pp'], BODY - 3, face.blushY, { p: blush })
  }
  body.forEach((row, y) => row.forEach((color, x) => { if (color) tile[y + 1][x + 1] = color }))
  return tile
}

/** The full 32×32 icon. Pixels between the rounded characters stay transparent unless a background is given. */
export function buildAppIcon(background: string | null = null): PixelGrid {
  const icon = blank(ICON_SIZE, ICON_SIZE).map((row) => row.map(() => background))
  ICON_FACES.forEach((face, index) => {
    const ox = (index % 2) * TILE
    const oy = Math.floor(index / 2) * TILE
    emotionTile(face).forEach((row, y) => row.forEach((color, x) => { if (color) icon[oy + y][ox + x] = color }))
  })
  return icon
}
