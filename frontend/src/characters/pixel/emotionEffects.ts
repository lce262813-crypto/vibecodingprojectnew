import type { EmotionKey } from './palette'
import type { RenderedCharacter } from './renderCharacter'
import { SILHOUETTES, maskBounds } from './silhouettes'

export const EMOTION_EFFECT_PALETTE = {
  k: '#22322d', y: '#ffd75e', o: '#f39a4a', w: '#ffffff', p: '#f08aa0', P: '#d9506f',
  c: '#8fd3ef', C: '#4aa6cf', r: '#e2584e', l: '#c9c9d3', G: '#6b6b78',
  m: '#7fc6a8', M: '#3f8a6d', v: '#9a86cf',
} as const

export const EMOTION_EFFECTS: Record<EmotionKey, readonly string[]> = {
  joy: [
    '................', '...y............', '..yyy.......o...', '.yywyy......oo..',
    '..yyy.......o.o.', '...y........o...', '............o...', '..........ooo...',
    '.........oooo...', '..........oo....', '................', '....y...........',
    '...ywy..........', '....y...........', '................', '................',
  ],
  excitement: [
    '................', '..pp.pp.........', '.pwppppp........', '.ppppppp........',
    '..ppppp.........', '...ppp..........', '....p.....p.p...', '..........ppp...',
    '...........p....', '................', '................', '.....P.P........',
    '.....PPP........', '......P.........', '................', '................',
  ],
  calm: [
    '................', '...........MM...', '.........MmmM...', '........MmmmM...',
    '........MmmM....', '.......MMM......', '......M.........', '................',
    '................', '...ccc.....ccc..', '.cc...ccccc...c.', '................',
    '......ccc.......', '....cc...ccc....', '................', '................',
  ],
  pride: [
    '................', '..C.c......c.C..', '...C.c....c.C...', '....C.c..c.C....',
    '.....C.cc.C.....', '......CccC......', '.......kk.......', '.....kkkkkk.....',
    '....kyyyyyyk....', '...kyywyyyyok...', '...kyyyyyyyyk...', '...kyyyoyyyyk...',
    '....kyyyyyyk....', '.....kkkkkk.....', '................', '................',
  ],
  moved: [
    '................', '...........y....', '...........y....', '.....C...yywyy..',
    '.....C.....y....', '....CcC....y....', '...CcccC........', '..CcwcccC.......',
    '..CwccccC.......', '..CccccCC....y..', '...CcccC....yyy.', '....CCC......y..',
    '................', '................', '................', '................',
  ],
  sadness: [
    '................', '.....GGGG.......', '...GGllllGG.....', '..GlllllllGGGG..',
    '.GlwlllllllllG..', '.GllllllllllllG.', '..GGGGGGGGGGGG..', '................',
    '...c.....c......', '...C.....C...c..', '.......c.....C..', '.......C........',
    '..c..........c..', '..C..........C..', '................', '................',
  ],
  anger: [
    '................', '................', '.....r..r.......', '.....r..r.......',
    '.....r..r.......', '.rrrrr..rrrrr...', '................', '................',
    '.rrrrr..rrrrr...', '.....r..r.......', '.....r..r.......', '.....r..r.......',
    '................', '................', '................', '................',
  ],
  irritation: [
    '................', '....kkkk........', '...k....kk......', '..k..kk...k.....',
    '..k.k..k..kk....', '...kk.kkkk..k...', '..k..kk..k..k...', '..kkk..kk.kk....',
    '...k.kk..k..k...', '....kk.kkk.k....', '..kk..k...kk....', '...kkkk..kk.....',
    '......kkkk......', '................', '................', '................',
  ],
  anxiety: [
    '................', '..C.............', '.CcC......C.....', '.CcC.....CcC....',
    '..C......CcC....', '..........C.....', '................', '..GG...GG...GG..',
    '.G..G.G..G.G..G.', '................', '..GG...GG...GG..', '.G..G.G..G.G..G.',
    '................', '................', '................', '................',
  ],
  loneliness: [
    '................', '................', '...yyyy.........', '..yyyy...l......',
    '.yyyy...lwl.....', '.yyy.....l......', '.yyy............', '.yyyy...........',
    '..yyyy..........', '...yyyy.........', '................', '................',
    '............l...', '................', '................', '................',
  ],
  disappointment: [
    '................', '................', '.C..............', '..C.............',
    '...C...C........', '....C.C.C.......', '.....C...C......', '..........C.....',
    '...........C..C.', '............C.C.', '.............CC.', '...........CCCC.',
    '................', '................', '................', '................',
  ],
  embarrassment: [
    '................', '..rr...kkkk.....', '..rr..kk..kk....', '..rr......kk....',
    '..rr.....kk.....', '..rr....kk......', '..rr....kk......', '................',
    '..rr....kk......', '..rr....kk......', '.............C..', '............CcC.',
    '............CcC.', '.............C..', '................', '................',
  ],
  confusion: [
    '................', '..vvvvv.........', '.v.....v........', 'v..vvv..v.......',
    'v.v...v.v.......', 'v.v.v.v.v.kkk...', 'v.v..v..vk...k..', 'v..v....v....k..',
    '.v..vvvv....kk..', '..v.........k...', '................', '............k...',
    '................', '................', '................', '................',
  ],
  shyness: [
    '................', '................', '................', '....p..p..p.....',
    '...p..p..p......', '..p..p..p.......', '.p..p..p........', '................',
    '................', '................', '..........p.p...', '..........ppp...',
    '...........p....', '................', '................', '................',
  ],
  fatigue: [
    '............vvvv', '..............v.', '.............v..', '............vvvv',
    '.......vvvvv....', '..........v.....', '.........v......', '........v.......',
    '.......vvvvv....', 'vvvvvv..........', '....v...........', '...v............',
    '..v.............', '.v..............', 'vvvvvv..........', '................',
  ],
  lethargy: [
    '.G..G..G..G..G..', '.G..G..G..G..G..', '.G..G..G..G..G..', '.G..G..G..G..l..',
    '.G..G..l..G.....', '.G..G.....G.....', '.l..G.....G.....', '....G.....l.....',
    '....l...........', '................', '................', '................',
    '....G..G..G.....', '................', '................', '................',
  ],
}

export const EFFECT_CANVAS_WIDTH = 80

export interface EffectComposition {
  width: number
  height: number
  pixels: (string | null)[]
  clipped: number
  bodyOverlapSkipped: number
}

export function composeCharacterWithEmotionEffect(
  character: RenderedCharacter,
  emotion: EmotionKey,
  raisedFrame = false,
): EffectComposition {
  const width = EFFECT_CANVAS_WIDTH
  const height = character.size
  const pixels = new Array<string | null>(width * height).fill(null)
  for (let y = 0; y < character.size; y += 1) {
    for (let x = 0; x < character.size; x += 1) {
      const source = y * character.size + x
      if (character.layers.effect[source]) continue
      pixels[y * width + x] = character.pixels[source]
    }
  }

  const bounds = maskBounds(SILHOUETTES[character.silhouette].mask)
  const x0 = bounds.maxX - 1
  const y0 = Math.max(0, bounds.minY - 9 - (raisedFrame ? 1 : 0))
  let clipped = 0
  let bodyOverlapSkipped = 0
  EMOTION_EFFECTS[emotion].forEach((row, dy) => {
    ;[...row].forEach((key, dx) => {
      if (key === '.') return
      const x = x0 + dx
      const y = y0 + dy
      if (x < 0 || y < 0 || x >= width || y >= height) { clipped += 1; return }
      if (x < character.size && y < character.size && character.layers.body[y * character.size + x]) {
        bodyOverlapSkipped += 1
        return
      }
      pixels[y * width + x] = EMOTION_EFFECT_PALETTE[key as keyof typeof EMOTION_EFFECT_PALETTE]
    })
  })
  return { width, height, pixels, clipped, bodyOverlapSkipped }
}
