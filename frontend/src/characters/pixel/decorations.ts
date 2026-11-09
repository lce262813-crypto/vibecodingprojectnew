// 장식(키워드 기반 소품)과 이펙트(감정 기반) 스프라이트.
// 모두 몸통과 같은 64×64 격자·같은 1픽셀 외곽선 규칙으로 그린다.

import type { EmotionKey } from './palette'

export interface PixelSprite {
  rows: string[]
  colors: Record<string, string>
  /** 외곽선을 두르지 않는 색 키 (김, 반짝임 등) */
  bare?: string
  outline?: boolean
}

export type DecorationId =
  | 'coffee' | 'drink' | 'beer' | 'book' | 'headphones' | 'flower' | 'heart'
  | 'gamepad' | 'medal' | 'bag' | 'umbrella' | 'sleepCap'
  | 'briefcase' | 'pencil' | 'camera' | 'ticket' | 'gift' | 'cake'
  | 'phone' | 'medicine' | 'paw' | 'meal' | 'sneaker' | 'paintbrush'
  | 'pizza' | 'burger' | 'chicken' | 'sushi' | 'fruit' | 'icecream'
  | 'wine' | 'cocktail' | 'key' | 'letter' | 'laptop' | 'shopping'
  | 'plant' | 'beach' | 'house' | 'money'
export type EffectId =
  | 'sparkle' | 'bubble' | 'star' | 'anger' | 'tear' | 'sweat' | 'zzz' | 'question' | 'smallHeart'

export const DECORATION_LABELS: Record<DecorationId, string> = {
  coffee: '커피', drink: '음료', beer: '맥주잔', book: '책', headphones: '헤드폰',
  flower: '꽃', heart: '하트', gamepad: '게임패드', medal: '메달', bag: '여행 가방',
  umbrella: '우산', sleepCap: '수면 모자',
  briefcase: '서류 가방', pencil: '연필', camera: '카메라', ticket: '티켓', gift: '선물',
  cake: '케이크', phone: '휴대폰', medicine: '약', paw: '발바닥', meal: '한 끼',
  sneaker: '운동화', paintbrush: '미술 도구',
  pizza: '피자', burger: '햄버거', chicken: '치킨', sushi: '초밥', fruit: '과일',
  icecream: '아이스크림', wine: '와인', cocktail: '칵테일', key: '열쇠', letter: '편지',
  laptop: '노트북', shopping: '쇼핑백', plant: '화분', beach: '조개', house: '집', money: '동전',
}
export const DECORATION_IDS = Object.keys(DECORATION_LABELS) as DecorationId[]

export const EFFECT_LABELS: Record<EffectId, string> = {
  sparkle: '글리터', bubble: '방울', star: '별', anger: '화남 표시', tear: '눈물방울',
  sweat: '땀방울', zzz: '졸음', question: '물음표', smallHeart: '작은 하트',
}
export const EFFECT_IDS = Object.keys(EFFECT_LABELS) as EffectId[]

/** 장식이 어디에 붙는지: 손(몸 오른쪽), 머리, 주변 */
export const DECORATION_ANCHOR: Record<DecorationId, 'hand' | 'head' | 'around'> = {
  coffee: 'hand', drink: 'hand', beer: 'hand', book: 'hand', headphones: 'head',
  flower: 'head', heart: 'around', gamepad: 'hand', medal: 'around', bag: 'hand',
  umbrella: 'hand', sleepCap: 'head',
  briefcase: 'hand', pencil: 'hand', camera: 'hand', ticket: 'hand', gift: 'hand',
  cake: 'hand', phone: 'hand', medicine: 'hand', paw: 'around', meal: 'hand',
  sneaker: 'hand', paintbrush: 'hand',
  pizza: 'hand', burger: 'hand', chicken: 'hand', sushi: 'hand', fruit: 'hand',
  icecream: 'hand', wine: 'hand', cocktail: 'hand', key: 'hand', letter: 'hand',
  laptop: 'hand', shopping: 'hand', plant: 'hand', beach: 'hand', house: 'hand', money: 'hand',
}

const KEYWORD_RULES: Array<[DecorationId, string[]]> = [
  ['coffee', ['커피', '카페', '라떼', '아메리카노', '에스프레소', '카푸치노', '모카', '디카페인', 'coffee']],
  ['drink', ['음료', '주스', '버블티', '밀크티', '스무디', '에이드', '콜라', '녹차', '홍차', '탄산', '레몬티', '코코아']],
  ['wine', ['와인', '와이너리', '포도주', '샴페인']],
  ['cocktail', ['칵테일', '하이볼', '모히또', '바텐더']],
  ['beer', ['맥주', '술자리', '회식', '호프', '소주', '막걸리', '한잔', '건배']],
  ['laptop', ['노트북', '컴퓨터', '코딩', '개발', '온라인', '재택', '화상 회의', '줌 회의']],
  ['briefcase', ['회사', '출근', '퇴근', '업무', '회의', '직장', '상사', '프로젝트', '발표', '마감', '야근', '사무실']],
  ['plant', ['화분', '새싹', '분갈이', '원예', '플랜테리어', '식집사']],
  // '산책'에 '책'이 들어 있으므로 꽃 규칙을 책보다 먼저 검사한다.
  ['flower', ['꽃', '산책', '공원', '정원', '식물', '벚꽃', '장미', '튤립', '화분', '숲', '나들이']],
  ['book', ['책', '독서', '공부', '시험', '도서관', '소설', '과제', '수업', '강의', '학원', '복습', '예습']],
  ['letter', ['편지', '우편', '엽서', '손편지', '편지지']],
  ['pencil', ['글쓰기', '필기', '메모', '일기', '노트', '문제풀이', '작문']],
  ['headphones', ['음악', '노래', '헤드폰', '이어폰', '플레이리스트', '콘서트', '공연', '앨범', '피아노', '기타', '밴드']],
  ['gamepad', ['게임', '플레이', '랭크', '승부', '콘솔', '보스전', '퀘스트', '레벨업', 'PC방']],
  ['medal', ['우승', '성공', '합격', '성취', '기록', '대회', '경기', '1등', '완주']],
  ['sneaker', ['운동', '헬스', '달리기', '러닝', '마라톤', '요가', '등산', '산책로', '체육관']],
  ['bag', ['여행', '출장', '공항', '비행기', '캠핑', '휴가', '호텔', '바다', '기차']],
  ['beach', ['해변', '바닷가', '모래사장', '조개', '물놀이', '서핑']],
  ['key', ['열쇠', '키링', '차키', '집 키', '문을 열', '문을 잠']],
  ['house', ['집', '자취', '이사', '우리 집', '본가', '방 청소', '집들이']],
  ['money', ['월급', '용돈', '돈', '저축', '통장', '보너스', '정산', '동전']],
  ['shopping', ['쇼핑', '장보기', '백화점', '마트', '구매', '옷을 샀', '플렉스']],
  ['camera', ['사진', '카메라', '촬영', '셀카', '포토', '풍경', '앨범 정리']],
  ['ticket', ['영화', '영화관', '뮤지컬', '연극', '전시', '티켓', '예매', '관람']],
  ['umbrella', ['비', '우산', '장마', '소나기', '빗소리', '폭우', '비바람']],
  ['sleepCap', ['수면', '잠', '낮잠', '침대', '취침', '꿈', '졸다', '늦잠', '불면']],
  ['icecream', ['아이스크림', '아이스바', '빙수', '젤라또', '소프트콘']],
  ['cake', ['생일', '케이크', '디저트', '빵집', '베이커리', '초콜릿', '쿠키']],
  ['gift', ['선물', '기념일', '축하', '서프라이즈', '택배', '포장']],
  ['phone', ['전화', '문자', '메시지', '연락', '채팅', '통화', '카톡', '휴대폰', '핸드폰']],
  ['medicine', ['병원', '약', '감기', '아프', '두통', '열', '약국', '진료', '주사']],
  ['paw', ['강아지', '고양이', '반려동물', '댕댕이', '냥이', '애완동물', '동물병원']],
  ['pizza', ['피자', '페퍼로니']],
  ['burger', ['햄버거', '버거', '감자튀김']],
  ['chicken', ['치킨', '닭강정', '닭다리', '후라이드', '양념치킨']],
  ['sushi', ['초밥', '스시', '회전초밥', '사시미']],
  ['fruit', ['과일', '사과', '바나나', '딸기', '수박', '복숭아', '포도', '귤']],
  ['meal', ['밥', '점심', '저녁', '아침', '식사', '맛집', '요리', '배달', '레스토랑', '먹었다']],
  ['paintbrush', ['그림', '미술', '드로잉', '색칠', '수채화', '디자인', '스케치', '공예']],
  ['heart', ['사랑', '데이트', '연인', '친구', '고백', '가족', '고마', '보고 싶', '좋아해', '만남']],
]

/** 서버 키워드 카테고리와도 이어 붙일 수 있게 둔 매핑 (아직 서비스에는 미적용) */
export const CATEGORY_DECORATIONS: Partial<Record<string, DecorationId>> = {
  drink: 'coffee', study: 'book', hobby: 'headphones', nature: 'flower', social: 'heart',
  travel: 'bag', health: 'medal',
}

export function decorationForKeywords(keywords: string[]): DecorationId | null {
  for (const keyword of keywords) {
    const text = keyword.trim().toLowerCase()
    if (!text) continue
    const match = KEYWORD_RULES.find(([, words]) => words.some((word) => text.includes(word)))
    if (match) return match[0]
  }
  return null
}

export const EMOTION_EFFECT: Record<EmotionKey, EffectId> = {
  joy: 'sparkle', excitement: 'smallHeart', calm: 'bubble', pride: 'star', moved: 'sparkle',
  sadness: 'tear', anger: 'anger', irritation: 'anger', anxiety: 'sweat', loneliness: 'tear',
  disappointment: 'tear', embarrassment: 'sweat', confusion: 'question', shyness: 'smallHeart',
  fatigue: 'zzz', lethargy: 'zzz',
}

export const DECORATION_OUTLINE = '#3a2a40'

// ── 손에 드는 소품 ──────────────────────────────────
export const ITEM_SPRITES: Record<Exclude<DecorationId, 'headphones'>, PixelSprite> = {
  coffee: {
    rows: [
      '.v.v...',
      '..v.v..',
      'wCCCg..',
      'hwwwg..',
      'hwwwgGG',
      'hwwwg.G',
      'hwwwgGG',
      'hwwwg..',
      '.ggg...',
    ],
    colors: { h: '#ffffff', w: '#f4ead7', g: '#cbb79a', G: '#a48d6c', C: '#6b3f26', v: '#ffffff' },
    bare: 'v',
  },
  drink: {
    rows: [
      '....r.',
      '...r..',
      '..r...',
      'LLLLLL',
      'hpppps',
      'hpppps',
      'hpBpBs',
      '.hpps.',
      '.pBBs.',
      '.ssss.',
    ],
    colors: { r: '#62c3f5', L: '#f7fbff', h: '#ffd9e6', p: '#ffadc8', s: '#e07ca0', B: '#5a3a4a' },
  },
  beer: {
    rows: ['.hhhh..', 'hyyyyg.', 'hywyygGG', 'hyyyyg.G', 'hyyyygGG', 'hyyyyg..', '.gggg...'],
    colors: { h: '#fff9df', y: '#f5c04a', w: '#fff3bc', g: '#c58b2c', G: '#9b6724' },
  },
  book: {
    rows: [
      'Hbbbbbbs',
      'bhhhhbbs',
      'bbbbbbbs',
      'bbbbbbbs',
      'bbbbbbbs',
      'ppppppps',
      'PPPPPPP.',
    ],
    colors: { H: '#a9d2f7', b: '#5aa0e6', s: '#3a6fb0', h: '#ffe08a', p: '#fff7e6', P: '#e6d6b8' },
  },
  flower: {
    rows: [
      '.hp.',
      'pyyq',
      'pyYq',
      '.qq.',
      '.g..',
      '.gl.',
      '.g..',
    ],
    colors: { h: '#ffd0e2', p: '#ff9fc2', q: '#e8739e', y: '#ffd84d', Y: '#f0a92c', g: '#4fae5a', l: '#86d67a' },
  },
  heart: {
    rows: [
      '.hr.rr.',
      'hwrrrrs',
      'rrrrrrs',
      '.rrrss.',
      '..rss..',
      '...s...',
    ],
    colors: { h: '#ffb3c4', w: '#ffffff', r: '#ff5f7e', s: '#d63c5e' },
  },
  gamepad: {
    rows: ['..hhhh..', '.hbbbbh.', 'hbbkbbbh', 'hbkkbprh', 'hbbkbrrh', '.hsssshs', '..ssss..'],
    colors: { h: '#ddd6fe', b: '#8b7cf0', s: '#5c4fc4', k: '#2a1d33', p: '#ffd45c', r: '#ff7595' },
  },
  medal: {
    rows: ['b...b', 'bb.bb', '.bbb.', '..y..', '.yhy.', 'yYYYy', '.yyy.'],
    colors: { b: '#6e8fd8', y: '#f0ae2e', h: '#fff0a2', Y: '#ffd34d' },
  },
  bag: {
    rows: ['..bbb..', '.b...b.', 'hhhhhhh', 'hllllls', 'hlbllls', 'hllllls', 'sssssss'],
    colors: { b: '#6d4b3a', h: '#e8a36d', l: '#c87a50', s: '#955038' },
  },
  umbrella: {
    rows: ['...h...', '.hllllh.', 'hllllllh', 'ssssssss', '...s....', '...s....', '...s....', '...sss..'],
    colors: { h: '#d9f1ff', l: '#79c8ef', s: '#3b85b8' },
  },
  sleepCap: {
    rows: [
      '...........ppp.',
      '..........phhps',
      '.........phhbss',
      '.......pphbbbss',
      '.....pphbbbbsss',
      '...pphbbbbbssss',
      '.pphbbbbbbbssss',
      'hhhhhhhhhhhhhhh',
      'hllllllllllllls',
      '.sssssssssssss.',
    ],
    colors: { p: '#ffffff', h: '#e4e8ff', l: '#aebaf0', b: '#7d86cf', s: '#535b9f' },
  },
  briefcase: {
    rows: ['..bbbb..', '.b....b.', 'hhhhhhhh', 'hlllllls', 'hllYYlls', 'hlllllls', 'ssssssss'],
    colors: { b: '#5c382b', h: '#d98a54', l: '#b9663f', s: '#82432f', Y: '#ffd36b' },
  },
  pencil: {
    rows: ['......kk', '.....yhk', '....yyys', '...yyys.', '..yyys..', '.ppps...', 'pps.....', 'k.......'],
    colors: { k: '#35283c', y: '#ffd34f', h: '#fff2a8', s: '#d99024', p: '#f28aa6' },
  },
  camera: {
    rows: ['..bbbb..', '.bb..bb.', 'hhhhhhhh', 'hllkklls', 'hlkwwkls', 'hlkkkkls', 'ssssssss'],
    colors: { b: '#5f5874', h: '#a99dcc', l: '#7b6fa9', s: '#51476f', k: '#29223a', w: '#aee9ff' },
  },
  ticket: {
    rows: ['hllllllh', 'llyyyyll', 'llhyyhll', 'llyyyyll', 'hssssssh'],
    colors: { h: '#fff1c2', l: '#f5c86a', y: '#e58b68', s: '#c57d43' },
  },
  gift: {
    rows: ['..pp.pp..', '..pprpp..', 'hhhrrhhhh', 'hllrrllls', 'hllrrllls', 'hllrrllls', 'sssssssss'],
    colors: { p: '#ff9bbb', r: '#ef557d', h: '#b9e5d2', l: '#70c5a5', s: '#438f79' },
  },
  cake: {
    rows: ['...y....', '...r....', '..hhhh..', '.hwwwwh.', 'hlllllls', 'hlplplls', 'ssssssss'],
    colors: { y: '#ffd84f', r: '#ef5b68', h: '#fff5dd', w: '#ffffff', l: '#f6a8be', p: '#d9638a', s: '#be5774' },
  },
  phone: {
    rows: ['.hhhh.', 'hkkkkh', 'hkaakh', 'hkaakh', 'hkaakh', 'hkkkkh', '.hssh.'],
    colors: { h: '#8d82bd', k: '#2f2840', a: '#a9e5ef', s: '#5e5487' },
  },
  medicine: {
    rows: ['..hhhh..', '.hwwwwh.', 'hwwrrwwh', 'hwwrrwwh', 'hwwwwwwh', '.hssss.', '..ssss..'],
    colors: { h: '#ffffff', w: '#dff5f1', r: '#ef6b7d', s: '#79b8ae' },
  },
  paw: {
    rows: ['.p...p.', 'ppp.ppp', '.......', '..ppp..', '.ppppp.', '.ppppp.', '..sss..'],
    colors: { p: '#f49ab6', s: '#ce6688' },
  },
  meal: {
    rows: ['..h.h...', '..h.h...', 'llllllll', '.lwwwls.', '..lwws..', '...ss...', '..ssss..'],
    colors: { h: '#b9a58d', l: '#fff0d2', w: '#f3a95f', s: '#c97849' },
  },
  sneaker: {
    rows: ['.hhh.....', 'hllh.....', 'hllllhh..', 'hllbbllh.', '.hbbbbllh', '..sssssss'],
    colors: { h: '#ffffff', l: '#9ed6ef', b: '#5ba6d1', s: '#3c719e' },
  },
  paintbrush: {
    rows: ['......pp', '.....pwp', '....ppps', '...hhhh.', '..llll..', '.llll...', 'sss.....', 's.......'],
    colors: { p: '#d58b55', w: '#fff0c2', s: '#7f4938', h: '#b69ad8', l: '#7860ad' },
  },
  pizza: {
    rows: ['hyyyyyys', '.hryryss', '..hyyyss', '...hrys.', '....hys.', '.....hs.', '......s.'],
    colors: { h: '#fff1a6', y: '#f3bd3f', s: '#b96a2d', r: '#df4c45' },
  },
  burger: {
    rows: ['..hhhh..', '.hyyyyh.', 'hyyyyyys', 'lggggggl', 'rrrrrrrr', '.bbbbbb.', '..ssss..'],
    colors: { h: '#ffe09a', y: '#e8a73d', s: '#9b5b2a', l: '#7bc96f', g: '#4d9d50', r: '#df584b', b: '#8a4d2d' },
  },
  chicken: {
    rows: ['...hh...', '..hllh..', '.hllllh.', 'hlllllls', '.hlllss.', '..sss.ww', '.....wgw'],
    colors: { h: '#ffd28a', l: '#e89442', s: '#a6522d', w: '#fff4d6', g: '#d8c7a6' },
  },
  sushi: {
    rows: ['.rrrrrr.', 'rhhhhhhR', 'rppppppR', '.kkkkkk.', '.kwwwwk.', '..kkkk..'],
    colors: { r: '#f68a83', R: '#c74f54', h: '#ffd2c0', p: '#f4a8a0', k: '#263b36', w: '#f8f1d8' },
  },
  fruit: {
    rows: ['...g...', '..gg....', '..hhhh..', '.hrrrrh.', 'hrrrrrrs', 'hrrrrrrs', '.hrrrrs.', '..ssss..'],
    colors: { g: '#4cae55', h: '#ff8c78', r: '#e74f55', s: '#a82e42' },
  },
  icecream: {
    rows: ['..hhhh.', '.hpppph', 'hppppps', '.hsssh.', '..yyy..', '..yyy..', '...y...', '...s...'],
    colors: { h: '#ffe3ef', p: '#f58fbd', s: '#bd5d89', y: '#e8b45b' },
  },
  wine: {
    rows: ['hrrrrrh', 'hrrrrrh', '.hrrrh.', '..hhh..', '...s...', '...s...', '..sss..'],
    colors: { h: '#f6eaf0', r: '#a94363', s: '#92737f' },
  },
  cocktail: {
    rows: ['hlllllh', '.hlllh.', '..hlh..', '...s...', '...s...', '..sss..', '.....rr', '......r'],
    colors: { h: '#e7f8ff', l: '#65cddd', s: '#4a8297', r: '#e55762' },
  },
  key: {
    rows: ['.yyyy....', 'yhhyyy...', 'yhhyyysss', '.yyyy..s.', '.......ss'],
    colors: { y: '#e2a52e', h: '#fff0a0', s: '#9e6720' },
  },
  letter: {
    rows: ['hhhhhhhhh', 'hwwwwwsss', 'hlwwwlsss', 'hhlwlssss', '.hhhlsss.', '..hhsss..'],
    colors: { h: '#fff5dc', w: '#f2d9c0', l: '#e7a8a2', s: '#b66f72' },
  },
  laptop: {
    rows: ['.hhhhhhh.', 'hbbbbbbbs', 'hbwwwwwbs', 'hbwwwwwbs', 'hbbbbbbbs', 'sssssssss', '.lllllll.'],
    colors: { h: '#bbb7cc', b: '#57536d', w: '#86d8e5', s: '#363247', l: '#8a849d' },
  },
  shopping: {
    rows: ['..hhhh..', '.h....h.', 'llllllll', 'lpppppps', 'lpYpYpps', 'lpppppps', 'lpppppps', 'ssssssss'],
    colors: { h: '#d66c8d', l: '#ffb1c6', p: '#ee789d', Y: '#fff0a2', s: '#b64c70' },
  },
  plant: {
    rows: ['...g.g..', '..ggg...', '.gGggg..', '..ggG...', '...s....', '.hhhhhh.', '.hlllls.', '..hlls..', '...ss...'],
    colors: { g: '#66bd5b', G: '#318f4c', s: '#286a3b', h: '#e99b62', l: '#bd6845' },
  },
  beach: {
    rows: ['...hh...', '..hllh..', '.hlhllh.', 'hlhlhlls', 'hllhlhls', '.hlllls.', '..ssss..'],
    colors: { h: '#fff0d0', l: '#f0b786', s: '#bd765b' },
  },
  house: {
    rows: ['....r....', '...rrr...', '..rrlrr..', '.rrlllrr.', 'hhhhhhhhh', 'hwwhwwwws', 'hwwhwwwws', 'hwwhwwwws', 'sssssssss'],
    colors: { r: '#d75c50', l: '#ef9272', h: '#f4d09a', w: '#8cc9cf', s: '#986047' },
  },
  money: {
    rows: ['..yyy..', '.yhhhys', 'yhyyyys', 'yhyhyys', 'yhyyyys', '.yssss.', '..sss..'],
    colors: { y: '#f2bd35', h: '#fff2a0', s: '#a96e1f' },
  },
}

/** Experimental redraws kept separate so existing saved characters retain their original props. */
export const ITEM_SPRITES_V2: Partial<Record<DecorationId, PixelSprite>> = {
  sleepCap: {
    rows: [
      '......lmm......',
      '.....llmmm.....',
      '....lllmmmm....',
      '...llllmmmmm...',
      '..lllllymmmmm.w',
      '.lllllyyymmmmwb',
      'lllllllymmmmmmm',
      'mmmmmmmmmmmmmmm',
      'ccccccccccccccc',
      '.cCCCCCCCCCCCc.',
    ],
    colors: {
      m: '#31c978', l: '#70dc8b', y: '#ffeb72', Y: '#fff5a8',
      c: '#77dce5', C: '#b4edf0', w: '#c9f3f6', b: '#74d9e5',
    },
  },
  beer: {
    rows: [
      '..wwww..',
      '.fwwwwf.',
      'fgyyyyGG',
      'fYyyyy.G',
      'fYyyyyGG',
      '.fggggf.',
      '..gggg..',
    ],
    colors: {
      w: '#fff9df', f: '#fff1bd', Y: '#ffe27a', y: '#f5c04a',
      g: '#c58b2c', G: '#9b6724',
    },
  },
}

export const HEADPHONE_COLORS = { band: '#3f3a5c', bandLight: '#6c66a0' }

export const HEADPHONE_CUP: PixelSprite = {
  rows: ['.cc', 'hcc', 'hcC', 'hcC', 'hcC', '.CC'],
  colors: { h: '#bdb3ff', c: '#8b7cf0', C: '#5c4fc4' },
}

// ── 감정 이펙트 (큰 것, 작은 것) ─────────────────────
export const EFFECT_SPRITES: Record<EffectId, [PixelSprite, PixelSprite]> = {
  sparkle: [
    {
      rows: ['..a..', '..b..', 'abcba', '..b..', '..a..'],
      colors: { a: '#f0b429', b: '#ffe27a', c: '#ffffff' },
      outline: false,
    },
    { rows: ['.a.', 'aca', '.a.'], colors: { a: '#f0b429', c: '#fff6c2' }, outline: false },
  ],
  bubble: [
    {
      rows: ['.bb.', 'bwab', 'baab', '.bb.'],
      colors: { b: '#7cc6dc', a: '#d9f3fa', w: '#ffffff' },
      outline: false,
    },
    { rows: ['bb', 'bw'], colors: { b: '#7cc6dc', w: '#ffffff' }, outline: false },
  ],
  star: [
    {
      rows: ['...y...', '..yhy..', 'yyyhyyy', '.yyyys.', '..ysy..', '.ys.sy.'],
      colors: { y: '#ffd23f', h: '#fff3b0', s: '#e09a1f' },
    },
    { rows: ['.y.', 'yhy', 's.s'], colors: { y: '#ffd23f', h: '#fff3b0', s: '#e09a1f' } },
  ],
  anger: [
    {
      rows: ['.h.r.', 'hr.rR', '.....', 'rr.RR', '.r.R.'],
      colors: { h: '#ff8a9a', r: '#e8364f', R: '#b51f3a' },
      outline: false,
    },
    { rows: ['h.r', '...', 'r.R'], colors: { h: '#ff8a9a', r: '#e8364f', R: '#b51f3a' }, outline: false },
  ],
  tear: [
    {
      rows: ['b....b', 'b....b', 'B....B', 'b....b', 'bB..Bb', '.c..c.'],
      colors: { b: '#378fd4', B: '#8fdcff', c: '#1f66aa' },
    },
    { rows: ['b.b', 'B.B', 'b.b', '.c.'], colors: { b: '#378fd4', B: '#8fdcff', c: '#1f66aa' } },
  ],
  sweat: [
    {
      rows: ['....a.', '...aba', '..abwb', '...bbc', '....c.'],
      colors: { a: '#dff8ff', b: '#78cde8', w: '#ffffff', c: '#3b9dbf' },
    },
    { rows: ['..a.', '.ab.', 'abw.', '.bc.', '..c.'], colors: { a: '#dff8ff', b: '#78cde8', w: '#ffffff', c: '#3b9dbf' } },
  ],
  zzz: [
    { rows: ['hhhz', '..z.', '.z..', 'zzzs'], colors: { h: '#e3dbff', z: '#b9a7e6', s: '#8e78cc' } },
    { rows: ['hhz', '.z.', 'zzs'], colors: { h: '#e3dbff', z: '#b9a7e6', s: '#8e78cc' } },
  ],
  question: [
    {
      rows: ['.hq.', 'h..q', '..qQ', '..q.', '....', '..Q.'],
      colors: { h: '#c7b2f5', q: '#8f6bd6', Q: '#6a48b3' },
    },
    { rows: ['hq', '.Q', '..', '.Q'], colors: { h: '#c7b2f5', q: '#8f6bd6', Q: '#6a48b3' } },
  ],
  smallHeart: [
    { rows: ['hr.rr', 'rrrrr', '.rrs.', '..s..'], colors: { h: '#ffc2d1', r: '#ff6f8f', s: '#d94a6c' } },
    { rows: ['r.r', 'rrs', '.s.'], colors: { r: '#ff6f8f', s: '#d94a6c' } },
  ],
}
