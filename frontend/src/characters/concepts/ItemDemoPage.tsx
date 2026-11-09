import { useEffect, useRef } from 'react'

import { ITEM_SPRITES } from '../pixel/decorations'
import { renderFriend } from './friends'
import { HELD_ITEMS } from './heldItems'
import { ITEM_ART, ITEM_SIZE } from './itemArt'
import { HELD_ITEM_ROWS, HELD_ITEM_SIZE } from './itemArtSmall'
import type { ConceptSpec } from './kit'

type Pixels = (string | null)[]

const OLD_ITEM: Record<string, keyof typeof ITEM_SPRITES | null> = {
  donut: null, coffee: 'coffee', burger: 'burger', sushi: 'sushi', cake: 'cake', icecream: 'icecream', bubbletea: 'drink', pizza: 'pizza',
}
const KEYS = Object.keys(ITEM_ART)
const CANVAS = 40

function itemPixels(key: string, size: number, left = 0, top = 0, base?: Pixels, rows = ITEM_ART[key].rows): Pixels {
  const px: Pixels = base ? [...base] : new Array(size * size).fill(null)
  const art = ITEM_ART[key]
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (art.colors[ch]) px[(top + y) * size + left + x] = art.colors[ch] }))
  return px
}

function oldPixels(key: string): Pixels | null {
  const id = OLD_ITEM[key]
  if (!id) return null
  const sprite = ITEM_SPRITES[id]
  const px: Pixels = new Array(ITEM_SIZE * ITEM_SIZE).fill(null)
  const left = Math.floor((ITEM_SIZE - sprite.rows[0].length) / 2)
  const top = Math.floor((ITEM_SIZE - sprite.rows.length) / 2)
  sprite.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (sprite.colors[ch]) px[(top + y) * ITEM_SIZE + left + x] = sprite.colors[ch] }))
  return px
}

function heldPixels(rows: string[], colors: Record<string, string>, size: number, left = 0, top = 0, base?: Pixels): Pixels {
  const px: Pixels = base ? [...base] : new Array(size * size).fill(null)
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) px[(top + y) * size + left + x] = colors[ch] }))
  return px
}

const ALL_HELD = [
  ...KEYS.map((key) => ({ key, label: ITEM_ART[key].label, rows: HELD_ITEM_ROWS[key], colors: ITEM_ART[key].colors })),
  ...Object.entries(HELD_ITEMS).map(([key, art]) => ({ key, label: art.label, rows: art.rows, colors: art.colors })),
]

function Pixel({ px, size, scale, label }: { px: Pixels; size: number; scale: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    px.forEach((color, i) => {
      if (!color) return
      ctx.fillStyle = color
      ctx.fillRect(i % size, Math.floor(i / size), 1, 1)
    })
  }, [px, size])
  return <canvas aria-label={label} height={size} ref={ref} role="img" style={{ width: size * scale, height: size * scale, imageRendering: 'pixelated' }} width={size} />
}

const FRIENDS: ConceptSpec[] = [
  { primary: { key: 'joy', score: 70 }, secondary: null },
  { primary: { key: 'calm', score: 50 }, secondary: null },
  { primary: { key: 'excitement', score: 60 }, secondary: null },
  { primary: { key: 'sadness', score: 50 }, secondary: null },
]

/** Compares the old keyword items with the redrawn ones, alone and held by a character. */
export function ItemDemoPage() {
  return (
    <main className="min-h-screen bg-[#fffaf2] px-3 py-6 text-[#31243c]">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold text-violet-700">MOZI ITEMS</p>
        <h1 className="mt-1 text-3xl font-black">소품 다시 그리기 시범</h1>
        <p className="mt-2 text-sm text-slate-600">왼쪽부터 이전 소품, 캐릭터가 들 12칸 소품, 크게 보여 줄 16칸 소품이에요.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {KEYS.map((key) => {
            const old = oldPixels(key)
            return (
              <article className="rounded-2xl border border-violet-200 bg-white p-3" key={key}>
                <h2 className="font-black">{ITEM_ART[key].label}</h2>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                  {old ? <Pixel label={`${ITEM_ART[key].label} 이전`} px={old} scale={2} size={ITEM_SIZE} /> : <span className="text-xs text-slate-400">이전 없음</span>}
                  <Pixel label={`${ITEM_ART[key].label} 12칸`} px={itemPixels(key, HELD_ITEM_SIZE, 0, 0, undefined, HELD_ITEM_ROWS[key])} scale={5} size={HELD_ITEM_SIZE} />
                  <Pixel label={`${ITEM_ART[key].label} 16칸`} px={itemPixels(key, ITEM_SIZE)} scale={5} size={ITEM_SIZE} />
                </div>
              </article>
            )
          })}
        </div>
        <h2 className="mt-7 text-xl font-black">소품 {ALL_HELD.length}종 · 12칸</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
          {ALL_HELD.map((item) => (
            <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-2 text-center" key={item.key}>
              <Pixel label={item.label} px={heldPixels(item.rows, item.colors, HELD_ITEM_SIZE)} scale={5} size={HELD_ITEM_SIZE} />
              <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>
        <h2 className="mt-7 text-xl font-black">캐릭터가 들고 있을 때</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
          {ALL_HELD.map((item, index) => (
            <div className="flex justify-center rounded-xl bg-[#f6f1ff] p-1" key={item.key}>
              <Pixel
                label={`${item.label}을 든 캐릭터`}
                px={renderFriend({ ...FRIENDS[index % FRIENDS.length], secondary: null }, { tick: 2, walking: false, soft: true, heldItem: item.key }).px}
                scale={2}
                size={CANVAS}
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
