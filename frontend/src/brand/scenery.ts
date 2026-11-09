// Small decorative pixel pieces for the splash and loading screens, kept pale so the logo leads.
import type { PixelGrid } from './appIcon.ts'

function fromRows(rows: string[], colors: Record<string, string>): PixelGrid {
  return rows.map((row) => [...row].map((key) => colors[key] ?? null))
}

export const CLOUD = fromRows([
  '....oooo......',
  '..oowwwwoo....',
  '.owwwwwwwwoooo',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwso',
  '.oossssssssoo.',
], { o: '#ddd3f2', w: '#ffffff', s: '#efe9fa' })

export const SPARKLE = fromRows([
  '..a..',
  '..w..',
  'awYwa',
  '..w..',
  '..a..',
], { a: '#d6c8f5', w: '#ffffff', Y: '#fff3b0' })

export const SPARKLE_SMALL = fromRows(['.w.', 'wYw', '.w.'], { w: '#ffffff', Y: '#e9dcff' })

/** Two layers of soft stepped hills, 64 pixels wide. */
export const HILLS: PixelGrid = (() => {
  const width = 64
  const height = 12
  const back = (x: number) => 5 + Math.round(2.4 * Math.sin(x / 7.5) + 1.2 * Math.sin(x / 3.1))
  const front = (x: number) => 8 + Math.round(1.8 * Math.sin(x / 9 + 2) + 0.8 * Math.sin(x / 4))
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    if (y >= front(x)) return y === front(x) ? '#d9cdf1' : '#e4dbf6'
    if (y >= back(x)) return y === back(x) ? '#e6def6' : '#efe9fa'
    return null
  }))
})()

// Tutorial props, in the same outlined pixel style as the app icon.
const INK = '#3b2a63'

export const DIARY = fromRows([
  '.ooooooooooooo..',
  'odvvvvvvvvvvvvo.',
  'odvlvvvvvvvvvvo.',
  'odvvvvppvppvvvo.',
  'odvvvpppppppvvo.',
  'odvvvpppppppvvo.',
  'odvvvvpppppvvvo.',
  'odvvvvvpppvvvvo.',
  'odvvvvvvpvvvvvo.',
  'odvvvvvvvvvvvvo.',
  'odvvvvvvvvvvvvo.',
  'odooooooooooooo.',
  'odwwwwwwwwwwwwo.',
  '.ooooooooooooo..',
], { o: INK, d: '#5b21b6', v: '#7c3aed', l: '#a78bfa', w: '#ffffff', p: '#ff9fc7' })

export const COIN = fromRows([
  '...oooooo...',
  '.oohhhhyyoo.',
  '.ohhyyyyyyo.',
  'ohhyyssyyyso',
  'ohyyyssyyyso',
  'ohyyyssyyyso',
  'ohyyyssyyyso',
  'ohyyyssyyyso',
  'ohyyyssyyyso',
  '.oyyyyyyyso.',
  '.oossssssoo.',
  '...oooooo...',
], { o: '#8a5a00', h: '#fff0a8', y: '#ffd84d', s: '#e8a92c' })

export const LOCK = fromRows([
  '...oooooo...',
  '..ommmmmmo..',
  '.omoooooomo.',
  '.omo....omo.',
  '.omo....omo.',
  '.omo....omo.',
  'oooooooooooo',
  'oyyyyyyyyyso',
  'oyyyykkyyyso',
  'oyyyykkyyyso',
  'oyyyykkyyyso',
  'oyyyyyyyyyso',
  'osssssssssso',
  'oooooooooooo',
], { o: INK, m: '#b9aee0', y: '#ffd84d', s: '#e8a92c', k: INK })

/** A plain yellow chat bubble standing for messenger sharing (not Kakao's logo). */
export const CHAT_BUBBLE = fromRows([
  '...oooooooo...',
  '.ooyyyyyyyyoo.',
  'oyyyyyyyyyyyyo',
  'oyyyyyyyyyyyyo',
  'oyykyykkyykyyo',
  'oyykyykkyykyyo',
  'oyyyyyyyyyyyyo',
  '.ooyyyyyyyyoo.',
  '...oooyyoooo..',
  '.....oyyo.....',
  '.....oyo......',
  '.....oo.......',
], { o: INK, y: '#ffe14d', k: INK })
