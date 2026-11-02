import { apiRequest } from '../api/client'
import type { CharacterCard } from '../characters/charactersApi'

export interface RoomResident {
  character: CharacterCard
  intensity_level: number
  accessory_part: string | null
  effect_parts: string[]
  dialogue_lines: string[]
}

export interface ResidentListResponse {
  residents: RoomResident[]
  count: number
  limit: number
}

export const getResidents = () =>
  apiRequest<ResidentListResponse>('/api/room/residents')
export const moveIn = (characterId: string) =>
  apiRequest<ResidentListResponse>(`/api/room/residents/${characterId}`, {
    method: 'PUT',
  })
export const moveOut = (characterId: string) =>
  apiRequest<ResidentListResponse>(`/api/room/residents/${characterId}`, {
    method: 'DELETE',
  })
