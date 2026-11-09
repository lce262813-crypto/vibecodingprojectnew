// The app icon: the MOZI mascot, copied cell by cell from the supplied pixel art.
// Editing a colour or a row here changes every icon; run scripts/generate-brand-assets.mjs afterwards.
// No DOM or React imports, so the asset script can load it in Node.

import type { PixelGrid } from './appIcon.ts'

const COLORS: Record<string, string> = { a: '#933c00', b: '#fff8c7', c: '#fff1ad', d: '#ffe898', e: '#ffd97c', f: '#fdfcea', g: '#ffc057', h: '#2a1d33', i: '#efcb4b', j: '#ffffff', k: '#ff9826', l: '#dfdae7' }

const MASCOT_ROWS = [
  '..................aaaa.............',
  '...............aaabccdaaa..........',
  '.............aabbcbbccccdaa........',
  '............abbbbbbbccccddea.......',
  '...........abbbbbbbbcccccddea......',
  '..........abfffffbbbcccccddeea.....',
  '.........abfffffffbbcccccddeeea....',
  '.........acbfffffbbbcccccddeega....',
  '........abbbbbbbbbbccccccddeegea...',
  '........accbbhhbbcccccccdhheegga...',
  'i.i.i...accbhjhhcccccccdhhjhegka...',
  '.iii...abccchhhhcccccccdhhhhgggga..',
  'iiiii..aedccchhccccccddddhhegggga..',
  '.iii....adcccccccccddddddeeggkga...',
  'i.i.i.aaadcccccccdddddddeeeggkgaa..',
  '.....abbaddccccddhddddheeegggkgada.',
  '.....abcaeddddddddhhhheeegggkggaea.',
  '.....acdeadddddddeeeeeeegggkkgadea.',
  '.....adgeaeeeeeeeeeeeeegggkkggagea.',
  '......aaa.ageeeeeggggggggkkggaaaa..',
  '...........agggggggggggkkkgga......',
  '............agkggkkkkkkkggga.......',
  '.............aagkkkkkkgggaa........',
  '............accaaaaaaaaaaea........',
  '............adddega.adddega........',
  '............aegkgga.aegkgga........',
  '........lllllaaaaalllaaaaalllll....',
]

/** Columns of the sparkle at the left of the art; browser tabs drop it to fit. */
const SPARKLE_WIDTH = 5

/** The app icon's background: the same pale lavender as the app itself. */
export const ICON_BACKGROUND = '#f6f3fa'
export const LOGO_ICON_SIZE = 44
export const SMALL_ICON_SIZE = 32

function iconGrid(rows: string[], size: number, left: number): PixelGrid {
  const icon: PixelGrid = Array.from({ length: size }, () => Array<string | null>(size).fill(ICON_BACKGROUND))
  const top = Math.floor((size - rows.length) / 2)
  rows.forEach((row, y) => [...row].forEach((key, x) => { if (COLORS[key]) icon[top + y][left + x] = COLORS[key] }))
  return icon
}

/** The full art. It sits 3 cells from the left, not centred, so the body rather than the sparkle looks centred. */
export function buildLogoIcon(): PixelGrid {
  return iconGrid(MASCOT_ROWS, LOGO_ICON_SIZE, 3)
}

/** Browser tabs: the mascot at one pixel per cell, without the sparkle. */
export function buildSmallIcon(): PixelGrid {
  const rows = MASCOT_ROWS.map((row) => row.slice(SPARKLE_WIDTH))
  return iconGrid(rows, SMALL_ICON_SIZE, 1)
}
