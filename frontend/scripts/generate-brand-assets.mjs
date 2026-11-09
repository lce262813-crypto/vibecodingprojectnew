// Generates the MOZI app icons, favicon, logo SVG and web manifest from the pixel art in src/brand.
// Run: node scripts/generate-brand-assets.mjs   (Node 22.18+ loads the .ts modules directly)
// Uses only Node built-ins: PNGs are encoded by hand with zlib, every pixel scaled by an integer.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateSync } from 'node:zlib'

import { gridToSvg } from '../src/brand/pixelGrid.ts'
import { ICON_BACKGROUND, buildLogoIcon, buildSmallIcon } from '../src/brand/mascotIcon.ts'
import { buildPixelLogo } from '../src/brand/pixelLogo.ts'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

function hexToRgba(hex) {
  if (!hex) return [0, 0, 0, 0]
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255]
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([length, body, crc])
}

/** Nearest-neighbour PNG: each grid cell becomes scale×scale pixels, centred on a padded canvas. */
function png(grid, scale, padding = 0, background = null) {
  const art = grid.length * scale
  const size = art + padding * 2
  const bg = hexToRgba(background)
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x += 1) {
      const gx = Math.floor((x - padding) / scale)
      const gy = Math.floor((y - padding) / scale)
      const inside = x >= padding && y >= padding && gx < grid.length && gy < grid.length
      const color = inside && grid[gy][gx] ? hexToRgba(grid[gy][gx]) : bg
      color.forEach((channel, index) => { raw[rowStart + 1 + x * 4 + index] = channel })
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function write(relative, data) {
  const target = join(publicDir, relative)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, data)
  console.log(`wrote public/${relative}`)
}

// App icons are opaque. The 44-cell icon rarely divides a target size evenly, so each one uses a
// whole-number scale plus a background margin rather than resampling the pixels.
const icon = buildLogoIcon()
write('icons/mozi-icon-1024.png', png(icon, 23, 6, ICON_BACKGROUND))
write('icons/mozi-icon-512.png', png(icon, 11, 14, ICON_BACKGROUND))
write('icons/mozi-icon-192.png', png(icon, 4, 8, ICON_BACKGROUND))
write('icons/apple-touch-icon.png', png(icon, 4, 2, ICON_BACKGROUND))
// Android masks can cut up to 20% from the edges: at 9× the mascot stays inside the safe circle.
write('icons/mozi-icon-maskable-512.png', png(icon, 9, 58, ICON_BACKGROUND))
const smallIcon = buildSmallIcon()
write('icons/mozi-icon-32.png', png(smallIcon, 1))
write('favicon.svg', gridToSvg(smallIcon))
write('brand/mozi-logo.svg', gridToSvg(buildPixelLogo()))

write('manifest.webmanifest', `${JSON.stringify({
  name: 'MOZI - 오늘의 감정 몬스터',
  short_name: 'MOZI',
  description: '일기 속 감정이 나만의 픽셀 캐릭터가 되는 감정 기록 서비스',
  lang: 'ko',
  start_url: '/',
  display: 'standalone',
  background_color: '#f6f3fa',
  theme_color: '#f6f3fa',
  icons: [
    { src: '/icons/mozi-icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/mozi-icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/mozi-icon-1024.png', sizes: '1024x1024', type: 'image/png' },
    { src: '/icons/mozi-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2)}\n`)
