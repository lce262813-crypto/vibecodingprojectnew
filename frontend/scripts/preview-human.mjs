// Render the actual app sprite pixels directly to PNG for visual review.
// No browser, image conversion library, or new dependency is needed.
import { createServer } from 'vite'
import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { renderHumanCharacter } = await server.ssrLoadModule('/src/characters/pixel/renderHumanCharacter.ts')
  const { EMOTION_KEYS } = await server.ssrLoadModule('/src/characters/pixel/palette.ts')
  const previews = EMOTION_KEYS.map(key => renderHumanCharacter({ primary: { key, score: 65 }, secondary: { key, score: 35 }, seed: 1 }))
  const width = 1024, height = 1024, scale = 4
  const rows = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sprite = previews[Math.floor(y / 256) * 4 + Math.floor(x / 256)]
    const color = sprite.pixels[Math.floor((y % 256) / scale) * 64 + Math.floor((x % 256) / scale)] ?? '#fffaf2'
    const index = y * (width * 4 + 1) + 1 + x * 4
    for (let c = 0; c < 3; c++) rows[index + c] = parseInt(color.slice(1 + c * 2, 3 + c * 2), 16)
    rows[index + 3] = 255
  }
  function crc32(bytes) {
    let crc = 0xffffffff
    for (const byte of bytes) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
    return (crc ^ 0xffffffff) >>> 0
  }
  function chunk(type, data) {
    const payload = Buffer.concat([Buffer.from(type), data])
    const length = Buffer.alloc(4), crc = Buffer.alloc(4)
    length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(payload))
    return Buffer.concat([length, payload, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6
  const output = join(tmpdir(), 'mozi-human-review')
  await mkdir(output, { recursive: true })
  const target = join(output, 'human-contact-sheet.png')
  await writeFile(target, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]))
  console.log(target)
  console.log(JSON.stringify(previews.map((sprite,i) => ({ emotion: EMOTION_KEYS[i], issues: sprite.issues }))))
} finally {
  await server.close()
}
