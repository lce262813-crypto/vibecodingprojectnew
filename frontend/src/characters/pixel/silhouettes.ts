// 64×64 논리 픽셀 캔버스 위의 고정 몸통 실루엣.
// 마스크는 모듈 로드 시 한 번만 계산되고, 생성기는 id로 고르기만 한다.
// (AI/시드가 외곽선을 바꾸거나 새 구멍을 만들 수 없다.)

export const CANVAS_SIZE = 64
const N = CANVAS_SIZE

export type SilhouetteId =
  | 'round' | 'drop' | 'flat' | 'wave' | 'bean' | 'spiky' | 'ears' | 'mochi' | 'heart' | 'star'

export interface Silhouette {
  id: SilhouetteId
  label: string
  mask: Uint8Array
  /** eyeY: 눈 중심 행, gap: 중앙선에서 눈 안쪽 끝까지의 거리 */
  face: { eyeY: number; gap: number }
}

type Inside = (px: number, py: number) => boolean

function ellipse(cx: number, cy: number, rx: number, ry: number, power = 2): Inside {
  return (px, py) => Math.abs((px - cx) / rx) ** power + Math.abs((py - cy) / ry) ** power <= 1
}

function spikes(px: number, py: number) {
  return [22, 32, 42].some((c) => {
    const dx = Math.abs(px - c)
    if (dx > 4) return false
    const top = 42.5 - 16 * Math.sqrt(Math.max(0, 1 - ((c - 32) / 19) ** 2))
    return py >= top + 1.5 - 7 * (1 - dx / 4) && py <= top + 3
  })
}

function heart(px: number, py: number) {
  const x = (px - 32) / 18
  const y = -(py - 40) / 18
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0
}

const STAR_POINTS = Array.from({ length: 10 }, (_, index) => {
  const angle = -Math.PI / 2 + index * Math.PI / 5
  const radius = index % 2 === 0 ? 21 : 13
  return { x: 32 + Math.cos(angle) * radius, y: 40 + Math.sin(angle) * radius }
})

function star(px: number, py: number) {
  let inside = false
  for (let i = 0, j = STAR_POINTS.length - 1; i < STAR_POINTS.length; j = i, i += 1) {
    const a = STAR_POINTS[i]
    const b = STAR_POINTS[j]
    const crosses = (a.y > py) !== (b.y > py)
      && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

const SHAPES: Record<SilhouetteId, { label: string; inside: Inside; face: Silhouette['face'] }> = {
  round: { label: '둥근형', inside: ellipse(32, 41, 19.5, 17.5), face: { eyeY: 39, gap: 4 } },
  drop: {
    label: '물방울형',
    inside: (px, py) =>
      ellipse(32, 44, 15, 15)(px, py)
      || (py >= 19 && py <= 44 && Math.abs(px - 32) <= 15 * ((py - 19) / 25) ** 0.8),
    face: { eyeY: 43, gap: 3 },
  },
  flat: {
    label: '납작형',
    inside: (px, py) => ellipse(32, 47, 23, 12, py <= 47 ? 2 : 4)(px, py),
    face: { eyeY: 46, gap: 5 },
  },
  wave: {
    label: '물결형',
    inside: (px, py) => {
      if (Math.abs(px - 32) > 18) return false
      if (py <= 39) return ellipse(32, 39, 18, 18)(px, py)
      const lobe = ((px - 14) / 9) % 1
      return py <= 55 + 3.5 * Math.sin(Math.PI * lobe)
    },
    face: { eyeY: 39, gap: 4 },
  },
  bean: { label: '길쭉형', inside: ellipse(32, 39, 15.5, 20), face: { eyeY: 36, gap: 3 } },
  spiky: {
    label: '뾰족형',
    inside: (px, py) => ellipse(32, 42.5, 19, 16)(px, py) || spikes(px, py),
    face: { eyeY: 43, gap: 4 },
  },
  ears: {
    label: '귀형',
    inside: (px, py) =>
      ellipse(32, 43, 19, 15.5)(px, py)
      || ellipse(21, 28, 4.5, 7.5)(px, py)
      || ellipse(43, 28, 4.5, 7.5)(px, py),
    face: { eyeY: 44, gap: 4 },
  },
  mochi: { label: '말랑네모형', inside: ellipse(32, 41, 19, 17.5, 3.2), face: { eyeY: 39, gap: 4 } },
  heart: { label: '하트형', inside: heart, face: { eyeY: 35, gap: 3 } },
  star: { label: '별형', inside: star, face: { eyeY: 41, gap: 3 } },
}

export const SILHOUETTE_IDS = Object.keys(SHAPES) as SilhouetteId[]

function neighbors4(mask: Uint8Array, x: number, y: number) {
  let count = 0
  if (x > 0 && mask[y * N + x - 1]) count += 1
  if (x < N - 1 && mask[y * N + x + 1]) count += 1
  if (y > 0 && mask[(y - 1) * N + x]) count += 1
  if (y < N - 1 && mask[(y + 1) * N + x]) count += 1
  return count
}

/** 튀어나온 1픽셀(스퍼)과 파인 1픽셀(노치)을 없애 외곽선을 고르게 만든다. */
function cleanMask(source: Uint8Array) {
  let mask = source
  for (let pass = 0; pass < 20; pass += 1) {
    const next = new Uint8Array(mask)
    let changed = false
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const n = neighbors4(mask, x, y)
        const i = y * N + x
        if (mask[i] && n <= 1) { next[i] = 0; changed = true }
        if (!mask[i] && n >= 3) { next[i] = 1; changed = true }
      }
    }
    mask = next
    if (!changed) break
  }
  return mask
}

function rasterize(inside: Inside) {
  const mask = new Uint8Array(N * N)
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (inside(x + 0.5, y + 0.5)) mask[y * N + x] = 1
    }
  }
  return cleanMask(mask)
}

export const SILHOUETTES: Record<SilhouetteId, Silhouette> = Object.fromEntries(
  SILHOUETTE_IDS.map((id) => [
    id,
    { id, label: SHAPES[id].label, face: SHAPES[id].face, mask: rasterize(SHAPES[id].inside) },
  ]),
) as Record<SilhouetteId, Silhouette>

export interface MaskReport {
  pixels: number
  components: number
  holes: number
  spurs: number
  notches: number
  symmetric: boolean
  /** 외곽선 1픽셀이 캔버스 안에 들어갈 여백이 있는지 */
  hasMargin: boolean
}

function countComponents(mask: Uint8Array, value: number, seeds: number[] | null) {
  const seen = new Uint8Array(N * N)
  let components = 0
  const flood = (start: number) => {
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      const x = i % N
      const y = (i - x) / N
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue
        const j = ny * N + nx
        if (!seen[j] && mask[j] === value) { seen[j] = 1; stack.push(j) }
      }
    }
  }
  for (const seed of seeds ?? []) if (mask[seed] === value && !seen[seed]) flood(seed)
  for (let i = 0; i < N * N; i += 1) {
    if (mask[i] === value && !seen[i]) { components += 1; flood(i) }
  }
  return components
}

/** 마스크 검증: 연결 1, 구멍 0, 스퍼/노치 0, 좌우 대칭, 가장자리 여백. */
export function analyzeMask(mask: Uint8Array): MaskReport {
  const border: number[] = []
  for (let i = 0; i < N; i += 1) border.push(i, (N - 1) * N + i, i * N, i * N + N - 1)
  let pixels = 0
  let spurs = 0
  let notches = 0
  let symmetric = true
  let hasMargin = true
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const i = y * N + x
      const n = neighbors4(mask, x, y)
      if (mask[i]) {
        pixels += 1
        if (n <= 1) spurs += 1
        if (x < 2 || y < 2 || x > N - 3 || y > N - 3) hasMargin = false
      } else if (n >= 3) {
        notches += 1
      }
      if (mask[i] !== mask[y * N + (N - 1 - x)]) symmetric = false
    }
  }
  return {
    pixels,
    components: countComponents(mask, 1, null),
    // 테두리에서 닿지 않는 빈 영역 = 구멍
    holes: countComponents(mask, 0, border),
    spurs,
    notches,
    symmetric,
    hasMargin,
  }
}

export function maskBounds(mask: Uint8Array) {
  let minX = N, minY = N, maxX = -1, maxY = -1
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (!mask[y * N + x]) continue
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  }
  return { minX, minY, maxX, maxY }
}

/** x열에서 가장 위에 있는 몸통 픽셀의 y. 없으면 -1. */
export function topAt(mask: Uint8Array, x: number) {
  for (let y = 0; y < N; y += 1) if (mask[y * N + x]) return y
  return -1
}

/** y행 몸통의 왼쪽/오른쪽 끝 x. */
export function rowSpan(mask: Uint8Array, y: number) {
  let min = -1, max = -1
  for (let x = 0; x < N; x += 1) {
    if (!mask[y * N + x]) continue
    if (min < 0) min = x
    max = x
  }
  return { min, max }
}
