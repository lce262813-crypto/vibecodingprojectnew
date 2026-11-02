export interface OriginalCharacter {
  asset: string
  name: string
  emotion: string
}

export const originalCharacters: OriginalCharacter[] = [
  { asset: 'dugeuni', name: '두근이', emotion: '기쁨·설렘' },
  { asset: 'nokchomong', name: '녹초몽', emotion: '피로·무기력' },
  { asset: 'beoreogi', name: '버럭이', emotion: '분노·짜증' },
  { asset: 'geokjeongi', name: '걱정이', emotion: '불안·혼란' },
  { asset: 'ulmeogi', name: '울먹이', emotion: '슬픔·외로움' },
  { asset: 'pyeongoni', name: '평온이', emotion: '평온·만족' },
  { asset: 'seollemi', name: '설렘이', emotion: '설렘·기쁨' },
  { asset: 'yageunmon', name: '야근몬', emotion: '피로·분노' },
  { asset: 'honrani', name: '혼란이', emotion: '혼란·불안' },
  { asset: 'seungbuyogi', name: '승부욕이', emotion: '열정·경쟁' },
  { asset: 'apeuri', name: '아프리', emotion: '지침·슬픔' },
  { asset: 'ppudeuswang', name: '뽐듯왕', emotion: '성취·기쁨' },
]

export function originalCharacterAsset(asset: string) {
  return `/assets/characters/${asset}.png`
}
