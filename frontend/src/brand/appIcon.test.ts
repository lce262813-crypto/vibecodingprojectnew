import { describe, expect, it } from 'vitest'

import { buildRamp, emotionColor } from '../characters/pixel/palette'
import { BRAND_VIOLET, buildAppIcon, ICON_SIZE } from './appIcon'
import { ICON_BACKGROUND, LOGO_ICON_SIZE, SMALL_ICON_SIZE, buildLogoIcon, buildSmallIcon } from './mascotIcon'
import { buildPixelLogo } from './pixelLogo'

describe('app icon', () => {
  it('uses each emotion’s own palette colour in its quadrant, not one shared colour', () => {
    const icon = buildAppIcon()
    expect(icon).toHaveLength(ICON_SIZE)
    // A body pixel near the middle of each quadrant's left edge is the base tone of that emotion.
    const quadrants = [['joy', 1, 7], ['calm', 17, 7], ['anger', 1, 23], ['sadness', 17, 23]] as const
    for (const [emotion, x, y] of quadrants) {
      const ramp = buildRamp(emotionColor(emotion, 50))
      expect(ramp).toContain(icon[y][x + 1])
    }
    expect(new Set(quadrants.map(([, x, y]) => icon[y][x + 1])).size).toBe(4)
  })
})

describe('mascot icon', () => {
  const OUTLINE = '#933c00'
  const SPARKLE = '#efcb4b'
  const used = (grid: (string | null)[][]) => grid.flatMap((row, y) => row.flatMap((cell, x) => (cell === ICON_BACKGROUND ? [] : [[x, y]])))

  it('is a square, opaque icon with the mascot and sparkle fully inside its margins', () => {
    const icon = buildLogoIcon()
    expect(icon).toHaveLength(LOGO_ICON_SIZE)
    expect(icon.every((row) => row.length === LOGO_ICON_SIZE && row.every(Boolean))).toBe(true)
    expect(icon.flat()).toContain(OUTLINE)
    expect(icon.flat()).toContain(SPARKLE)
    const cells = used(icon)
    expect(Math.min(...cells.map(([x]) => x))).toBeGreaterThanOrEqual(3)
    expect(Math.max(...cells.map(([x]) => x))).toBeLessThan(LOGO_ICON_SIZE - 3)
  })

  it('drops only the sparkle from the small browser icon', () => {
    const icon = buildSmallIcon()
    expect(icon).toHaveLength(SMALL_ICON_SIZE)
    expect(icon.every((row) => row.length === SMALL_ICON_SIZE)).toBe(true)
    expect(icon.flat()).toContain(OUTLINE)
    expect(icon.flat()).not.toContain(SPARKLE)
  })
})

describe('pixel logo', () => {
  it('spells the word in black with a violet full stop', () => {
    expect(new Set(buildPixelLogo().flat())).toEqual(new Set([null, '#171717', BRAND_VIOLET]))
  })
})
