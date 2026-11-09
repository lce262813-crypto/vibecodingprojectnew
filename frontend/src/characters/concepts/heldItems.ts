// The rest of the keyword items at the held size of 12 × 12, plotted by hand like itemArtSmall.ts.
// Keys match DecorationId, so they can replace the old sprites one for one.
import type { ItemArt } from './itemArt'

const INK = { brown: '#4a2c20', plum: '#4a2a40', navy: '#2e2a40' }

export const HELD_ITEMS: Record<string, ItemArt> = {
  beer: {
    label: '맥주',
    colors: { k: INK.brown, W: '#ffffff', w: '#e9e2d8', Y: '#f5b93f', y: '#d98a1f', h: '#ffe08a', s: '#fff0b0', g: '#c9d8e0' },
    rows: ['..kkkkkkk...', '.kWWwWWwWk..', '.kWWWWWWwkkk', '.khwYwYwykgk', '.khYYYYYykgk', '.khYsYYYykgk', '.khYYYsYykgk', '.khYYYYYykkk', '.khYsYYYyk..', '.kyYYYYyyk..', '.kkkkkkkkk..', '............'],
  },
  book: {
    label: '책',
    colors: { k: '#33264a', P: '#8a6be0', p: '#5f45b0', h: '#b7a0f5', w: '#fffaf0', g: '#dcd2c0', Y: '#ffd24a' },
    rows: ['.kkkkkkkkkk.', 'kphPPPPPPPpk', 'kphPPYYYPPpk', 'kphPYPPPYPpk', 'kphPPYYYPPpk', 'kphPPPPPPPpk', 'kphPPPPPPPpk', 'kphPPPPPPPpk', 'kpkkkkkkkkk.', 'kkwwwwwwggk.', '.kkkkkkkkkk.', '............'],
  },
  headphones: {
    label: '헤드폰',
    colors: { k: '#33304a', B: '#6c66a0', b: '#3f3a5c', h: '#b3aed6', P: '#f08fb1', p: '#c95f86' },
    rows: ['...kkkkkk...', '..kBhhBBbk..', '.kBbkkkkbbk.', '.kBk....kbk.', 'kBk......kbk', 'kBk......kbk', 'kkk......kkk', 'kPPk....kPpk', 'kPPk....kPpk', 'kPpk....kppk', '.kk......kk.', '............'],
  },
  flower: {
    label: '꽃',
    colors: { k: INK.plum, P: '#ff9fc0', p: '#e8689a', h: '#ffd3e2', Y: '#ffd24a', y: '#e8a91f', G: '#67c24f', g: '#3d8f3a' },
    rows: ['....kkkk....', '..kkPPhPkk..', '.kPhPPPPppk.', '.kPPkYYkppk.', '.kPPkYykppk.', '.kPPPkkpppk.', '..kPPppppk..', '...kkkkkk...', '.kk..kGk....', 'kGGk.kGk.kk.', '.kggkkGkkGgk', '..kkgGGgkkk.'],
  },
  heart: {
    label: '하트',
    colors: { k: '#5a2038', R: '#ef4a64', r: '#b92648', h: '#ff9aa8', w: '#ffffff' },
    rows: ['............', '..kkk..kkk..', '.khhRkkRRRk.', 'khwhRRRRRRrk', 'khhRRRRRRRrk', 'kRRRRRRRRrrk', '.kRRRRRRrrk.', '..kRRRRrrk..', '...kRRrrk...', '....kRrk....', '.....kk.....', '............'],
  },
  gamepad: {
    label: '게임패드',
    colors: { k: INK.navy, B: '#6f7bd6', b: '#4a54a8', h: '#a6aef0', R: '#ef4a64', Y: '#ffd24a', w: '#ffffff' },
    rows: ['............', '............', '..kkkkkkkk..', '.khhBBBBBbk.', 'kBwBBBBBRBbk', 'kwwwBBBYBRbk', 'kBwBBkkBYBbk', 'kBBBkbbkBBbk', 'kBBk.kk.kbbk', '.kk......kk.', '............', '............'],
  },
  medal: {
    label: '메달',
    colors: { k: '#5a3a20', R: '#e8483f', r: '#b82e2e', B: '#5a8fe0', b: '#3c64b0', Y: '#ffd24a', y: '#e09a1f', h: '#fff0a0' },
    rows: ['.kkk....kkk.', '.kRRk..kbBk.', '..kRRkkbBk..', '...kRRbBk...', '....kkkk....', '..kkhYYYkk..', '.khhYYYYYyk.', '.khYYkkYYyk.', '.kYYYkYYYyk.', '.kYYYkYYyyk.', '..kkYYyykk..', '....kkkk....'],
  },
  bag: {
    label: '여행 가방',
    colors: { k: INK.brown, O: '#ef8a4a', o: '#c0602a', h: '#ffb98a', T: '#f5e0a8', m: '#8a5a3c' },
    rows: ['....kkkk....', '....k..k....', '..kkkkkkkk..', '.khhOOOOOok.', '.khOOTTOOok.', '.kOOOTTOOok.', '.kmmmmmmmmk.', '.kOOOOOOOok.', '.khOOOOOook.', '.kOOOOOoook.', '..kkkkkkkk..', '...k....k...'],
  },
  umbrella: {
    label: '우산',
    colors: { k: '#2f2a4a', P: '#b68af0', p: '#8a5fd0', h: '#d9c4fb', m: '#8a5a3c' },
    rows: ['.....kk.....', '...kkPPkk...', '..kPhPPPpk..', '.kPhPPPPPpk.', 'kPhPPpPPPppk', 'kkkPkkkkPkkk', '.....km.....', '.....km.....', '.....km.....', '.....km.....', '..kk.km.....', '...kkk......'],
  },
  sleepCap: {
    label: '수면 모자',
    colors: { k: '#3a3056', B: '#7c8fe0', b: '#5568b8', h: '#aab8f5', W: '#ffffff', w: '#e4e0f0' },
    rows: ['..........kk', '........kWWk', '....kkkkkWwk', '..kkhBBBBkkk', '.khBBBwBBbk.', '.kBBBBBBwbbk', 'kBwBBBBBBbbk', 'kBBBwBBBbbbk', 'kkkkkkkkkkkk', 'kWWWWWWwwwwk', 'kkkkkkkkkkkk', '............'],
  },
  briefcase: {
    label: '서류 가방',
    colors: { k: '#3a2820', M: '#9a6238', m: '#6e4222', h: '#c88a58', Y: '#ffd24a', y: '#e09a1f' },
    rows: ['............', '....kkkk....', '....k..k....', '.kkkkkkkkkk.', 'khhMMMMMMmmk', 'khMMMMMMMMmk', 'kkkkkYYkkkkk', 'kmmmkYykmmmk', 'kMMMMkkMMmmk', 'khMMMMMMmmmk', '.kkkkkkkkkk.', '............'],
  },
  pencil: {
    label: '연필',
    colors: { k: '#3f2f20', Y: '#ffd24a', y: '#e09a1f', P: '#f08fb1', p: '#c95f86', s: '#c8c8d8', T: '#f0d0a0', g: '#444055' },
    rows: ['.........kk.', '........kPPk', '.......kssPk', '......kYksk.', '.....kYYyk..', '....kYYyk...', '...kYYyk....', '..kYYyk.....', '.kTTyk......', '.kTTk.......', '.kgk........', '.kk.........'],
  },
  camera: {
    label: '카메라',
    colors: { k: '#2b2b38', G: '#6a6f88', g: '#4a4e66', h: '#9aa0b8', W: '#ffffff', B: '#4fa8e8', b: '#2a6fb0', R: '#ef4a64' },
    rows: ['............', '...kkkk.....', '.kkkGGkkkkk.', 'khhhhhhhhRGk', 'kGGkkkkGGGgk', 'kGkBWBbkGGgk', 'kGkBBBbkGGgk', 'kGkBbbbkGggk', 'kGGkkkkGgggk', 'kggggggggggk', '.kkkkkkkkkk.', '............'],
  },
  ticket: {
    label: '티켓',
    colors: { k: '#5a3030', Y: '#ffcf5a', y: '#e8a030', h: '#ffe9a8', R: '#e8483f' },
    rows: ['............', '............', '.kkkkkkkkkk.', 'khhYkYYYYYyk', 'kYYYkYRRRYyk', '.kYYkYRRRYk.', '.kYYkYYYYYk.', 'kYYYkYRRYYyk', 'kYYYkYYYYyyk', '.kkkkkkkkkk.', '............', '............'],
  },
  gift: {
    label: '선물',
    colors: { k: INK.plum, B: '#6fc7e8', b: '#3f95c0', h: '#b3e8f8', R: '#ef4a64', r: '#b92648' },
    rows: ['...kk..kk...', '..kRRkkRRk..', '..kRrkkrRk..', '.kkkkRRkkkk.', 'khBBkRrkBBbk', 'kBBBkRrkBbbk', 'kkkkkRrkkkkk', 'khBBkRrkBBbk', 'kBBBkRrkBbbk', 'kBBBkRrkbbbk', '.kkkkkkkkkk.', '............'],
  },
  phone: {
    label: '휴대폰',
    colors: { k: '#2a2a3a', G: '#4a4e66', B: '#7fd0f0', b: '#4fa0d8', h: '#c9f0fb', w: '#ffffff' },
    rows: ['...kkkkkk...', '..kGGGGGGk..', '..kBhhBBbk..', '..kBhBBBbk..', '..kBBBBbbk..', '..kBBBwbbk..', '..kBBBbbbk..', '..kBBbbbbk..', '..kbbbbbbk..', '..kGGwwGGk..', '..kGGGGGGk..', '...kkkkkk...'],
  },
  medicine: {
    label: '약',
    colors: { k: '#4a2a3a', R: '#ef5a6a', r: '#c23a50', W: '#ffffff', w: '#dcdcea', h: '#ffb0b8' },
    rows: ['............', '.......kkk..', '......kRhRk.', '.....kRhRRrk', '....kRRRRrrk', '...kkkRRrrk.', '..kWWkkrrk..', '.kWWWWkkk...', 'kWWWWwwk....', 'kWWwwwk.....', '.kwwwk......', '..kkk.......'],
  },
  paw: {
    label: '발바닥',
    colors: { k: '#4a3030', P: '#f5a8b8', p: '#d87a90', M: '#b98a6a', m: '#8a5e44', h: '#d8b090' },
    rows: ['...kk..kk...', '..kPPkkPPk..', '.kkPpkkPpkk.', 'kPPkkkkkkPPk', 'kPpk.kk.kPpk', '.kkkPPPPkkk.', '..kPhPPPPk..', '.kPPPPPPppk.', '.kPPPPPpppk.', '.kPPkkkkppk.', '..kk....kk..', '............'],
  },
  meal: {
    label: '한 끼',
    colors: { k: '#3a2a40', W: '#ffffff', w: '#e8e2f0', B: '#6f8fe8', b: '#4560b8', h: '#a8bcf8', G: '#6a4a30' },
    rows: ['.........kk.', '.......kkGk.', '...kkkkGkk..', '.kkWWkGkWkk.', 'kWWwWkWWWwwk', 'kkkkkkkkkkkk', 'khBBBBBBBBbk', 'kBhBBwBBBbbk', '.kBBBBBBbbk.', '..kBBBBbbk..', '...kkkkkk...', '............'],
  },
  sneaker: {
    label: '운동화',
    colors: { k: '#33304a', W: '#ffffff', w: '#dcdce8', R: '#ef5a6a', r: '#c23a50' },
    rows: ['............', '............', '.kkkk.......', '.kRRRkk.....', '.kRwRRkk....', '.kRRwRwkkk..', 'kWkRRwRRRkk.', 'kRRRRRRRRRrk', 'kRRRRRRrrrrk', 'kkkkkkkkkkkk', 'kWWWWWWWwwwk', '.kkkkkkkkkk.'],
  },
  paintbrush: {
    label: '미술 도구',
    colors: { k: '#3a2a30', T: '#c88a58', t: '#8a5a32', s: '#c8c8d8', B: '#5a8fe0', b: '#3c64b0', h: '#8ab4f5' },
    rows: ['.........kkk', '........kTTk', '.......kTtk.', '......kTtk..', '.....kTtk...', '....kTtk....', '...kssk.....', '..kBhsk.....', '.kBBBk......', 'kBBbbk......', 'kBbbk.......', '.kkk........'],
  },
  chicken: {
    label: '치킨',
    colors: { k: '#5a2f20', C: '#e8a04f', c: '#b86e2a', h: '#ffd08a', W: '#ffffff', w: '#e8dcd0' },
    rows: ['..kkkkk.....', '.khhCCCkk...', 'khCCCCCCck..', 'khCCCCCCCck.', 'kCCCCCCCCck.', 'kCCCCCCCcck.', '.kCCCCcccck.', '..kcccckWk..', '...kkkkWWkk.', '.......kWWwk', '.......kWwwk', '........kkk.'],
  },
  fruit: {
    label: '과일',
    colors: { k: '#5a2030', R: '#ef4a54', r: '#b82438', h: '#ff9a9a', w: '#ffffff', G: '#67c24f', g: '#3d8f3a', m: '#6e4222' },
    rows: ['.......kk...', '.....kmkGGk.', '..kkkkkkggk.', '.khhRRkRRrk.', 'khwhRRRRRrrk', 'khhRRRRRRrrk', 'kRRRRRRRRrrk', 'kRRRRRRRrrrk', '.kRRRRRrrrk.', '.kRRRrrrrrk.', '..kkRrkrkk..', '....kk.kk...'],
  },
  wine: {
    label: '와인',
    colors: { k: '#3a2838', g: '#e4ecf5', w: '#ffffff', R: '#9a2a50', r: '#6e1a3a', h: '#c8507a' },
    rows: ['..kkkkkkkk..', '.kwgggggggk.', '.kwgggggggk.', '.kwhRRRRrrk.', '.kwRRRRRrrk.', '..kRRRRrrk..', '...kRRrrk...', '....kkkk....', '.....kgk....', '.....kgk....', '...kkggkkk..', '...kkkkkkk..'],
  },
  cocktail: {
    label: '칵테일',
    colors: { k: '#3a2848', T: '#7fd8e8', t: '#4fb0c8', h: '#c0f0f8', g: '#e4ecf5', Y: '#ffd24a', y: '#e09a1f', R: '#ef4a64' },
    rows: ['.........kk.', '........kYYk', 'kkkkkkkkkYyk', 'kghTTTTTTkk.', '.kgTTRTTtk..', '..kgTTTtk...', '...kgTtk....', '....kgk.....', '....kgk.....', '....kgk.....', '..kkkgkkk...', '..kkkkkkk...'],
  },
  key: {
    label: '열쇠',
    colors: { k: '#5a3a18', Y: '#ffd24a', y: '#d9931f', h: '#fff0a0' },
    rows: ['.....kkkkk..', '....kYhhYyk.', '...kYhkkkYyk', '...kYk...kyk', '...kYk...kyk', '...kYYkkYyyk', '..kYYyYYyyk.', '..kYykkkkk..', '.kYyk.......', 'kYykk.......', 'kyYYk.......', '.kkkk.......'],
  },
  letter: {
    label: '편지',
    colors: { k: '#5a3a4a', W: '#ffffff', w: '#efe6dc', g: '#d8c8c0', R: '#ef4a64', r: '#b92648' },
    rows: ['............', '.kkkkkkkkkk.', 'kkWWWWWWWWkk', 'kwkWWWWWWkwk', 'kWwkWWWWkwgk', 'kWWwkRrkwwgk', 'kWWkwRrwkwgk', 'kWkwwwwwwkgk', 'kkwwwwwwggkk', '.kkkkkkkkkk.', '............', '............'],
  },
  laptop: {
    label: '노트북',
    colors: { k: '#2e2e3e', G: '#b8bcd0', g: '#8a8ea8', h: '#e0e2ee', B: '#7fd0f0', b: '#4fa0d8', s: '#c9f0fb' },
    rows: ['............', '..kkkkkkkk..', '.kGGGGGGGGk.', '.kGsBBBBbGk.', '.kGsBBBbbGk.', '.kGBBBbbbGk.', '.kGBbbbbbGk.', '.kGGGGGGGGk.', 'kkkkkkkkkkkk', 'khhhhGGhhggk', '.kkkkkkkkkk.', '............'],
  },
  shopping: {
    label: '쇼핑백',
    colors: { k: INK.plum, P: '#ff9fc0', p: '#e8689a', h: '#ffd3e2', W: '#ffffff' },
    rows: ['....kkkk....', '...k....k...', '...k....k...', '.kkkkkkkkkk.', '.khPPPPPPpk.', '.khPkPPkPpk.', '.kPPPkkPppk.', '.kPPPPPPppk.', '.kPPPPPpppk.', '.kPPPPppppk.', '.kkkkkkkkkk.', '............'],
  },
  plant: {
    label: '화분',
    colors: { k: '#3a3a28', G: '#67c24f', g: '#3d8f3a', h: '#a8e88a', O: '#e08a5a', o: '#b05e34', H: '#f5b890' },
    rows: ['.....kk.....', '....kGGk.kk.', '.kk.kGhgkGGk', 'kGGkkGGkGgk.', 'kGhGkGkGgk..', '.kGgkGkgk...', '..kkkgkk....', '.kkkkkkkkkk.', '.kHOOOOOOok.', '..kHOOOOok..', '..kOOOOook..', '...kkkkkk...'],
  },
  beach: {
    label: '조개',
    colors: { k: '#5a3040', P: '#ffc0b0', p: '#f08a80', h: '#ffe4d8' },
    rows: ['............', '...kkkkkk...', '.kkPkPhkPkk.', 'kPPkPhkPPkpk', 'kPhPkPhkPkpk', 'kPPhkPhkPkpk', 'kPPPkPkPkppk', '.kPPkPkPkpk.', '..kPPkPkpk..', '...kkpkkk...', '...kkkkkk...', '............'],
  },
  house: {
    label: '집',
    colors: { k: '#3a2a30', R: '#e8604f', r: '#b83a30', h: '#ff9a80', W: '#fff2dc', w: '#e0c8a8', B: '#7fd0f0', M: '#8a5a32' },
    rows: ['.....kk.....', '....kRhk....', '...kRRhRk...', '..kRRRRRrk..', '.kRRRRRRrrk.', 'kkkkkkkkkkkk', '.kWWWWWWwwk.', '.kWkkWWkkwk.', '.kWkBWWkMwk.', '.kWWWWWkMwk.', '.kwwwwwkMwk.', '.kkkkkkkkkk.'],
  },
  money: {
    label: '동전',
    colors: { k: '#5a3a18', Y: '#ffd24a', y: '#d9931f', h: '#fff0a0', d: '#a86a18' },
    rows: ['...kkkkkk...', '.kkhhYYYYkk.', '.khhYYYYYyk.', 'khYYdddYYyyk', 'khYdYYYdYyyk', 'kYYdYYYYYyyk', 'kYYdYYYYYyyk', 'kYYdYYYdYyyk', 'kYYYdddYyyyk', '.kYYYYYyyyk.', '.kkyyyyyykk.', '...kkkkkk...'],
  },
}
