import { apiRequest } from '../api/client'
import type { CharacterAppearance } from '../characters/charactersApi'

export interface ShareLink {
  token: string
  share_path: string
}

export interface PublicSharedCharacter {
  owner_nickname: string
  name: string
  behavior_type: string
  accessory_part: string | null
  effect_parts: string[]
  appearance: CharacterAppearance
}

export const createShareLink = (characterId: string) =>
  apiRequest<ShareLink>(`/api/characters/${characterId}/share`, { method: 'POST' })
export const revokeShareLink = (characterId: string) =>
  apiRequest<void>(`/api/characters/${characterId}/share`, { method: 'DELETE' })
export const getSharedCharacter = (token: string) =>
  apiRequest<PublicSharedCharacter>(`/api/shares/${token}`)

export const shareUrlFor = (link: ShareLink) => `${window.location.origin}${link.share_path}`
