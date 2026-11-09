// The 12 × 12 art for an item id from the server, whichever file it was drawn in.
import { HELD_ITEMS } from './heldItems'
import { ITEM_ART, type ItemArt } from './itemArt'
import { HELD_ITEM_ROWS } from './itemArtSmall'

/** Old records may hold ids from before the redraw. */
const OLD_IDS: Record<string, string> = { drink: 'bubbletea' }

export function heldItemArt(id: string): ItemArt | null {
  const key = OLD_IDS[id] ?? id
  if (HELD_ITEMS[key]) return HELD_ITEMS[key]
  if (ITEM_ART[key] && HELD_ITEM_ROWS[key]) return { ...ITEM_ART[key], rows: HELD_ITEM_ROWS[key] }
  return null
}
