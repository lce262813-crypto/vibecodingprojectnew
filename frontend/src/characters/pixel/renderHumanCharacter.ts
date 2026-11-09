import { FACE_COLORS, expressionFor, levelForScore, mirrorSprite } from './faces'
import { buildPalette, type EmotionKey, type Ramp } from './palette'
import type { CharacterSpec, RenderedCharacter } from './renderCharacter'

const SIZE = 64
type Point = readonly [number, number]
type Mask = Uint8Array
type HairShape = 'round' | 'heart' | 'flat' | 'wave' | 'spiky' | 'drop'
const at = (x: number, y: number) => y * SIZE + x
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE

export const HUMAN_HAIR_BY_EMOTION: Record<EmotionKey, HairShape> = {
  joy: 'round', pride: 'round', moved: 'round', excitement: 'heart', shyness: 'heart',
  calm: 'flat', fatigue: 'flat', lethargy: 'flat', sadness: 'wave', loneliness: 'wave',
  disappointment: 'wave', anger: 'spiky', irritation: 'spiky', anxiety: 'drop',
  embarrassment: 'drop', confusion: 'drop',
}

// A compact 32 × 28 head above a 24-pixel outfit and legs.
// Emotion shapes become hair crowns rather than costumes around the face.
const HAIR: Record<HairShape, readonly Point[]> = {
  round: [[17,22],[18,16],[21,12],[26,9],[36,9],[42,12],[46,17],[47,25],[46,36],[43,39],[40,37],[23,37],[19,38],[17,34]],
  heart: [[17,22],[17,16],[20,11],[24,9],[28,9],[32,12],[36,9],[40,10],[44,13],[47,19],[47,32],[45,37],[41,38],[23,38],[18,35]],
  flat: [[17,24],[18,18],[21,14],[26,12],[37,12],[43,15],[46,20],[47,29],[45,35],[42,36],[22,36],[18,33]],
  wave: [[17,22],[19,16],[23,12],[29,10],[36,10],[42,13],[46,18],[47,26],[46,31],[48,36],[44,35],[45,40],[40,38],[23,38],[19,40],[20,35],[16,36],[18,30]],
  spiky: [[17,24],[18,18],[21,19],[22,13],[25,15],[27,8],[30,13],[34,6],[36,13],[41,10],[41,16],[45,15],[45,22],[47,26],[46,34],[43,38],[39,36],[24,36],[20,38],[17,33]],
  drop: [[17,23],[20,17],[25,14],[29,10],[32,7],[34,12],[40,14],[44,18],[47,24],[47,32],[44,37],[40,38],[23,38],[19,35]],
}
const FACE: readonly Point[] = [[23,19],[39,19],[43,24],[43,29],[41,33],[37,35],[27,35],[23,33],[21,29],[21,24]]
const SKIN = { light: '#fff9ed', base: '#ffeddb', shade: '#f2c6b7', edge: '#b3797e', cheek: '#efb4b8' }
const INK = '#332837'

// Integer scan conversion: no vector smoothing or canvas interpolation.
function polygon(points: readonly Point[]): Mask {
  const mask = new Uint8Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
    let contained = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i]; const [xj, yj] = points[j]
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) contained = !contained
    }
    if (contained) mask[at(x, y)] = 1
  }
  return mask
}

class Sprite {
  pixels: (string | null)[] = new Array(SIZE * SIZE).fill(null)
  clipped = 0
  put(x: number, y: number, color: string, layer?: Mask) {
    if (!inside(x, y)) { this.clipped += 1; return }
    this.pixels[at(x, y)] = color
    if (layer) layer[at(x, y)] = 1
  }
  rect(x: number, y: number, w: number, h: number, color: string, layer?: Mask) {
    for (let dy = 0; dy < h; dy += 1) for (let dx = 0; dx < w; dx += 1) this.put(x + dx, y + dy, color, layer)
  }
  fill(mask: Mask, color: string, layer?: Mask, clip?: Mask) {
    for (let i = 0; i < mask.length; i += 1) if (mask[i] && (!clip || clip[i])) {
      this.pixels[i] = color
      if (layer) layer[i] = 1
    }
  }
  shape(points: readonly Point[], color: string, layer?: Mask, clip?: Mask) {
    this.fill(polygon(points), color, layer, clip)
  }
  outline(mask: Mask, color: string, layer?: Mask) {
    for (let y = 1; y < SIZE - 1; y += 1) for (let x = 1; x < SIZE - 1; x += 1) {
      if (mask[at(x,y)] && (!mask[at(x-1,y)] || !mask[at(x+1,y)] || !mask[at(x,y-1)] || !mask[at(x,y+1)])) this.put(x,y,color,layer)
    }
  }
  stamp(rows: string[], x: number, y: number, colors: Record<string, string>, layer: Mask) {
    rows.forEach((row, dy) => [...row].forEach((key, dx) => { if (key !== '.') this.put(x + dx, y + dy, colors[key], layer) }))
  }
}

function outfit(s: Sprite, layer: Mask, ramp: Ramp) {
  const legs = polygon([[26,49],[38,49],[38,59],[34,59],[34,53],[30,53],[30,59],[26,59]])
  s.fill(legs, '#51445e', layer); s.outline(legs, INK, layer)
  s.rect(27,54,2,4,'#7a6682',layer); s.rect(35,54,2,4,'#7a6682',layer)
  for (const x of [25,34]) {
    const shoe = polygon([[x+1,58],[x+5,58],[x+5,61],[x,61],[x,59]])
    s.fill(shoe, '#45334e',layer); s.outline(shoe, INK,layer)
    s.rect(x+1,59,3,1,'#d8cbdc',layer)
  }
  const hands = [polygon([[23,45],[26,45],[26,49],[24,50],[22,48]]),polygon([[38,45],[41,45],[42,48],[40,50],[38,49]])]
  for (const hand of hands) { s.fill(hand,SKIN.base,layer); s.outline(hand,SKIN.edge,layer) }
  const sleeves = [polygon([[26,37],[28,39],[27,46],[25,48],[22,46],[23,41],[24,39]]),polygon([[38,37],[40,40],[42,44],[42,46],[39,48],[37,41]])]
  for (const sleeve of sleeves) { s.fill(sleeve,'#c5b7d7',layer); s.outline(sleeve,INK,layer) }
  s.rect(23,44,2,3,'#f9f0ec',layer); s.rect(39,44,2,3,'#f9f0ec',layer)
  const jacket = polygon([[27,36],[37,36],[39,39],[38,44],[40,51],[37,53],[27,53],[24,51],[26,43],[25,39]])
  s.fill(jacket,'#eee4d9',layer); s.outline(jacket,INK,layer)
  s.shape([[35,38],[38,39],[37,45],[39,50],[35,51]],'#c7b7bc',layer,jacket)
  s.rect(28,40,3,9,'#fff9ed',layer)
  s.rect(27,49,10,2,'#9c8ba7',layer)
  s.rect(28,51,2,2,'#65516f',layer); s.rect(32,51,1,2,'#65516f',layer); s.rect(35,51,2,2,'#65516f',layer)
  s.rect(29,46,2,1,'#b8a4b7',layer); s.rect(34,46,2,1,'#b8a4b7',layer)
  s.rect(31,42,1,6,'#c9b5ba',layer)
  s.rect(30,35,4,3,SKIN.shade,layer)
  s.shape([[27,37],[31,38],[31,41],[28,40]],'#ffffff',layer)
  s.shape([[33,38],[37,37],[36,40],[33,41]],'#ffffff',layer)
  s.stamp(['aa...aa','abbaaba','.abbba.','..aba..','..a.a..'],28,38,{a:ramp[3],b:ramp[1]},layer)
  s.put(32,44,'#a891a9',layer); s.put(32,47,'#a891a9',layer)
}

function hair(s: Sprite, shape: HairShape, ramp: Ramp, layer: Mask): Mask {
  const mask = polygon(HAIR[shape])
  // Expose the neck and collar between the two sidelocks.
  for (let y=35;y<42;y+=1) for (let x=26;x<38;x+=1) mask[at(x,y)]=0
  s.fill(mask,ramp[2],layer)
  s.shape([[39,9],[49,12],[50,42],[39,42],[42,31],[42,19]],ramp[3],layer,mask)
  s.shape([[16,24],[21,23],[21,34],[25,39],[16,42]],ramp[3],layer,mask)
  s.shape([[43,23],[48,25],[48,38],[40,41],[43,32]],ramp[4],layer,mask)
  s.shape([[21,16],[26,12],[36,12],[40,15],[37,17],[26,16],[22,19]],ramp[1],layer,mask)
  s.shape([[23,15],[26,13],[35,13],[37,14],[33,15],[26,15],[23,17]],ramp[0],layer,mask)
  if (shape === 'spiky') s.shape([[24,19],[27,10],[28,15],[31,18],[34,9],[34,19],[38,15],[37,23]],ramp[1],layer,mask)
  s.outline(mask,ramp[5],layer)
  return mask
}

function fringe(s: Sprite, shape: HairShape, ramp: Ramp, mask: Mask, layer: Mask) {
  const bangs: readonly Point[] = shape === 'spiky'
    ? [[21,18],[29,15],[39,17],[43,22],[42,27],[39,24],[37,20],[34,24],[32,20],[27,25],[28,20],[23,25],[22,30],[20,31]]
    : [[20,18],[28,15],[39,17],[43,21],[43,30],[41,32],[40,24],[37,20],[36,24],[33,22],[30,25],[31,20],[26,25],[27,21],[23,26],[22,32],[20,31]]
  const bangMask = polygon(bangs)
  s.fill(bangMask,ramp[2],layer,mask)
  for (let y = 19; y <= 32; y += 1) for (let x = 19; x <= 43; x += 1) {
    if (bangMask[at(x,y)] && mask[at(x,y)] && !bangMask[at(x,y+1)]) s.put(x,y,ramp[3],layer)
  }
  for (const points of [
    [[23,18],[25,17],[24,23],[22,27],[22,22]],
    [[29,17],[31,17],[29,22],[27,23]],
    [[36,17],[38,18],[40,23],[38,22]],
  ] as Point[][]) s.shape(points,ramp[1],layer,bangMask)
  s.rect(19,26,1,7,ramp[1],layer); s.rect(44,26,1,7,ramp[3],layer)
}

function humanEyes(source: string[]): string[] {
  const key = source.join('|')
  if (key.includes('r')) return ['.rr.rr','rwrrrr','rrrrrr','.rrrr.','..rr..']
  if (source.length <= 2 && source[0].includes('.')) return ['......','.kkk..','k...k.','......']
  if (source.some(row => row.includes('b'))) return ['.kkkk.','kwiiik','kwidik','klidlk','.llll.','..bB..']
  if (key.includes('ssss')) return ['......','kkkkk.','.kkk..','......']
  if (key === 'kk|kk') return ['.kkkk.','kwiiik','kiidik','klidlk','.llll.']
  if (key.includes('kwwwk')) return ['.kkkk.','kwwwwk','kwidwk','kwidwk','.llll.']
  if (key === 'kkkk|...k|.k.k|.kkk') return ['.kkkk.','k...ik','k.kkik','k..kik','.kkki.']
  if (source.length === 1 || key.includes('..kk')) return ['......','kkkkk.','.wiik.','.illk.']
  return ['.kkkk.','kwiiik','kwidik','kiidik','klillk','.llll.']
}

function drawFace(s: Sprite, emotion: EmotionKey, level: ReturnType<typeof levelForScore>, ramp: Ramp, layer: Mask, faceMask: Mask) {
  const expression = expressionFor(emotion,level)
  const colors = { ...FACE_COLORS, k: '#45303e', i: ramp[3], d: ramp[5], l: ramp[2], s: '#cf9e9f' }
  let eyes = humanEyes(expression.eyes)
  if ((emotion === 'anger' || emotion === 'irritation') && level >= 3) eyes = ['kk....','.kkkk.','.wiik.','.idik.','..ll..']
  const right = expression.eyesRight ? humanEyes(expression.eyesRight) : mirrorSprite(eyes)
  s.stamp(eyes,24,25,colors,layer)
  s.stamp(right,34,25,colors,layer)
  if (expression.brows) {
    s.stamp(expression.brows,24,23,{...colors,k:ramp[4]},layer)
    s.stamp(expression.browsRight ?? mirrorSprite(expression.brows),35,23,{...colors,k:ramp[4]},layer)
  }
  s.rect(23,31,3,1,SKIN.cheek,layer); s.rect(38,31,3,1,SKIN.cheek,layer)
  if (expression.blush) { s.put(24,32,'#ef9ea8',layer); s.put(39,32,'#ef9ea8',layer) }
  const rows = expression.mouth
  const w = Math.min(5,rows[0].length); const h = Math.min(3,rows.length)
  const small = Array.from({length:h},(_,y) => Array.from({length:w},(_,x) => rows[Math.floor(y*rows.length/h)][Math.floor(x*rows[0].length/w)]).join(''))
  s.stamp(small,32-Math.ceil(w/2),32,{...colors,k:'#a36570',m:'#874354',s:'#b77d84'},layer)
  return layer.reduce((total,v,i) => total + (v && !faceMask[i] ? 1 : 0),0)
}

export function renderHumanCharacter(spec: CharacterSpec): RenderedCharacter {
  const silhouette = HUMAN_HAIR_BY_EMOTION[spec.primary.key]
  const palette = buildPalette(spec.primary)
  const faceEmotion = spec.secondary && spec.secondary.score > 0 ? spec.secondary : spec.primary
  const level = levelForScore(faceEmotion.score)
  const s = new Sprite()
  const layers = {
    body: new Uint8Array(SIZE*SIZE), hair: new Uint8Array(SIZE*SIZE), animalFeature: new Uint8Array(SIZE*SIZE),
    face: new Uint8Array(SIZE*SIZE), decoration: new Uint8Array(SIZE*SIZE), effect: new Uint8Array(SIZE*SIZE),
  }
  outfit(s,layers.body,palette.body)
  const hairMask = hair(s,silhouette,palette.body,layers.hair)
  const faceMask = polygon(FACE)
  s.fill(faceMask,SKIN.base)
  s.shape([[22,20],[27,20],[26,30],[23,31],[22,28]],SKIN.light,undefined,faceMask)
  s.shape([[41,24],[43,25],[43,30],[39,34],[26,35],[25,33],[38,33],[40,30]],SKIN.shade,undefined,faceMask)
  for (let x=24;x<=39;x+=1) for (let y=32;y<=35;y+=1) {
    if(faceMask[at(x,y)] && !faceMask[at(x,y+1)]) s.put(x,y,SKIN.edge)
  }
  fringe(s,silhouette,palette.body,hairMask,layers.hair)
  const faceOutside = drawFace(s,faceEmotion.key,level,palette.body,layers.face,faceMask)
  return {
    size:SIZE,pixels:s.pixels,silhouette,level,palette,pattern:'none',hair:null,
    animalFeature:null,decoration:null,effects:[],secondaryEffect:null,
    rendererVersion:'human-v1',complexity:{used:1,budget:2},layers,
    issues:{clipped:s.clipped,faceOutside,faceOverlap:0,hairFaceOverlap:0,animalFeatureFaceOverlap:0,decorationFaceOverlap:0},
  }
}
