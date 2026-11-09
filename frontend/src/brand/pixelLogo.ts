// "MOZI." as pixel typography: a 9-row bitmap font in flat colours —
// black letters and a brand-violet full stop, with no shading or outline.
// No DOM or React imports, so the asset script can also export it as an SVG.

import { BRAND_VIOLET, type PixelGrid } from './appIcon.ts'

const GLYPHS: Record<string, string[]> = {
  M: ['XX....XX', 'XXX..XXX', 'XXXXXXXX', 'XX.XX.XX', 'XX....XX', 'XX....XX', 'XX....XX', 'XX....XX', 'XX....XX'],
  O: ['.XXXXX.', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', '.XXXXX.'],
  Z: ['XXXXXXX', 'XXXXXXX', '....XX.', '...XX..', '..XX...', '.XX....', 'XX.....', 'XXXXXXX', 'XXXXXXX'],
  I: ['XXXXXX', 'XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', 'XXXXXX', 'XXXXXX'],
  '.': ['..', '..', '..', '..', '..', '..', '..', 'XX', 'XX'],
}

/** Same near-black as the app's headings. */
const INK = '#171717'
const GAP = 2

export function buildPixelLogo(text = 'MOZI.'): PixelGrid {
  const chars = [...text].filter((char) => GLYPHS[char])
  const width = chars.reduce((sum, char) => sum + GLYPHS[char][0].length, 0) + (chars.length - 1) * GAP
  const grid: PixelGrid = Array.from({ length: GLYPHS.M.length }, () => Array<string | null>(width).fill(null))
  let cursor = 0
  for (const char of chars) {
    const color = char === '.' ? BRAND_VIOLET : INK
    GLYPHS[char].forEach((row, y) => [...row].forEach((cell, x) => { if (cell === 'X') grid[y][cursor + x] = color }))
    cursor += GLYPHS[char][0].length + GAP
  }
  return grid
}
