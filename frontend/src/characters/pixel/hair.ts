// 선택형 헤어 레이어. 몸통 마스크를 바꾸지 않고 상단에 별도 픽셀로 합성한다.
// 모든 스프라이트는 64×64 렌더러의 1 논리 픽셀 단위를 사용한다.

import type { PixelSprite } from './decorations'
import { TONE, type CharacterPalette, type EmotionKey, type Ramp } from './palette'

export type HairId =
  | 'softCurl' | 'sunRays' | 'heartWave' | 'sprout' | 'flowerCrown' | 'rainCloud'
  | 'nightSky' | 'flame' | 'horns' | 'ripple' | 'tangled' | 'messy' | 'swirl' | 'halo'

interface HairDefinition {
  label: string
  rows: string[]
  ramp?: 'body' | 'point'
  colors?: Record<string, string>
}

export const HAIR_LABELS: Record<HairId, string> = {
  softCurl: '몽글 곱슬', sunRays: '햇살', heartWave: '하트 웨이브', sprout: '새싹',
  flowerCrown: '꽃 화관', rainCloud: '먹구름', nightSky: '밤하늘', flame: '불꽃',
  horns: '작은 뿔', ripple: '흔들 물결', tangled: '꼬인 실타래', messy: '헝클 머리',
  swirl: '소용돌이', halo: '후광',
}

export const HAIR_IDS = Object.keys(HAIR_LABELS) as HairId[]

const DEFINITIONS: Record<HairId, HairDefinition> = {
  softCurl: {
    label: HAIR_LABELS.softCurl,
    rows: ['....hhh.hhh....', '..hlllhlllh..', '.hllbbbbbllh.', 'hllbblllbbllh', 'llbblllllbbll', '.ddd.....ddd.'],
  },
  sunRays: {
    label: HAIR_LABELS.sunRays,
    rows: ['h...h...h...h', '.l..l...l..l.', '..bbbbbbbbb..', '.bbllllllllbb.', 'bblllllllllbb', '.ddd.....ddd.'],
    colors: { h: '#fff4a8', l: '#ffd95f', b: '#f2ad32', d: '#cf7627' },
  },
  heartWave: {
    label: HAIR_LABELS.heartWave,
    rows: ['.pp.....pp.', 'pppp...pppp', '.ppp...ppp.', '..hlllllh..', '.llbbbbbbll.', 'lbblllllbbll'],
    colors: { p: '#ff7199' },
  },
  sprout: {
    label: HAIR_LABELS.sprout,
    rows: ['.....g.....', '..gg.ggg...', '.gGGggGg...', '....gg.....', '..hlllllh..', '.llbbbbbbll.'],
    colors: { g: '#66b85f', G: '#b8e487' },
  },
  flowerCrown: {
    label: HAIR_LABELS.flowerCrown,
    rows: ['..p...y...p..', '.pwp.ywy.pwp.', '..p...y...p..', '.gGggGggGggGg.', '..hlllllllh..'],
    colors: { p: '#ff8fb5', y: '#ffd65a', w: '#fff8dc', g: '#5da95a', G: '#a7db78' },
  },
  rainCloud: {
    label: HAIR_LABELS.rainCloud,
    rows: ['....hhh....', '..hlllllh..', '.hllbbbllh.', 'hllbbbbbllh', '.ddddddddd.', '..r..r..r..'],
    colors: { r: '#63bce8' },
  },
  nightSky: {
    label: HAIR_LABELS.nightSky,
    rows: ['.....a......', '..hlllllh...', '.hllbblllh..', 'hllbpblllbh.', '.dddddddddd.', '...a....a...'],
    colors: { a: '#ffe36c', p: '#fff7c2' },
  },
  flame: {
    label: HAIR_LABELS.flame,
    rows: ['.....y......', '..y..y..y...', '.yy.yyyyy...', 'yYYYYYYYYy..', '.YrrrrrrY...', '..rrrrrr....'],
    colors: { y: '#fff07a', Y: '#ffb52e', r: '#f45b45' },
  },
  horns: {
    label: HAIR_LABELS.horns,
    rows: ['.h.........h.', 'hbb.......bbh', '.bdd.....ddb.', '..hlllllllh..', '.llbbbbbbbll.'],
  },
  ripple: {
    label: HAIR_LABELS.ripple,
    rows: ['..hll...hll..', 'hllbb.hllbb..', '.bbllhbbllh..', '..hllbbllh...', '.llbbbbbbll...'],
  },
  tangled: {
    label: HAIR_LABELS.tangled,
    rows: ['..hllhllh...', '.hlbbllblh..', 'hlbllbbllbh.', '.blhllhlbb..', '..ddddddd...'],
  },
  messy: {
    label: HAIR_LABELS.messy,
    rows: ['.h..h...h..h.', 'hllhllhllhllh', '.lbbllbbllbbl.', '..bblllllbb..', '.ddd.....ddd.'],
  },
  swirl: {
    label: HAIR_LABELS.swirl,
    rows: ['....hllllh...', '..hllbblllh..', '.hlbbhhlbblh.', 'hlblh..hlblh.', '.lbllllllbl..', '..dddddddd...'],
  },
  halo: {
    label: HAIR_LABELS.halo,
    rows: ['...yyyyyyy...', '..yYYYYYYYy..', '...yyyyyyy...', '.............', '..hlllllllh..'],
    colors: { y: '#fff3a3', Y: '#f5bf35' },
  },
}

export const EMOTION_HAIR: Record<EmotionKey, HairId[]> = {
  joy: ['softCurl', 'sunRays', 'flowerCrown'],
  excitement: ['heartWave', 'softCurl'],
  calm: ['sprout', 'flowerCrown', 'softCurl'],
  pride: ['halo', 'sunRays', 'softCurl'],
  moved: ['halo', 'softCurl', 'nightSky'],
  sadness: ['rainCloud', 'softCurl'],
  anger: ['flame', 'horns'],
  irritation: ['horns', 'messy'],
  anxiety: ['ripple', 'tangled'],
  loneliness: ['nightSky', 'rainCloud'],
  disappointment: ['rainCloud', 'messy'],
  embarrassment: ['messy', 'heartWave'],
  confusion: ['swirl', 'ripple', 'tangled'],
  shyness: ['flowerCrown', 'softCurl', 'heartWave'],
  fatigue: ['messy', 'nightSky'],
  lethargy: ['messy', 'rainCloud'],
}

function rampColors(ramp: Ramp) {
  return {
    h: ramp[TONE.highlight], l: ramp[TONE.light], b: ramp[TONE.base],
    s: ramp[TONE.shadow], d: ramp[TONE.deep], o: ramp[TONE.outline],
    p: ramp[TONE.highlight],
  }
}

export function hairSprite(id: HairId, palette: CharacterPalette): PixelSprite {
  const definition = DEFINITIONS[id]
  const ramp = definition.ramp === 'body' ? palette.body : palette.point
  return { rows: definition.rows, colors: { ...rampColors(ramp), ...definition.colors } }
}
