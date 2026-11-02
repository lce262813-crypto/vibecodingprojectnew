import { apiRequest } from '../api/client'
import type { CharacterResult, EmotionAnalysis } from '../diary/diaryApi'

export interface CharacterAppearance {
  body_part: string
  palette: string
  color: string
  eyebrow_part: string
  eye_part: string
  mouth_part: string
  mutation_part: string | null
}

export interface CharacterCard {
  character_id: string
  name: string
  primary_emotion: string
  behavior_type: string
  is_resident: boolean
  encounter_count: number
  first_met_on: string
  last_met_on: string
  appearance: CharacterAppearance
}

export interface EncounterSummary {
  encounter_id: string
  met_on: string
  intensity_level: number
  accessory_part: string | null
  effect_parts: string[]
}

export interface CharacterDetail {
  character: CharacterCard
  encounters: EncounterSummary[]
}

export interface EncounterDetail {
  encounter_id: string
  met_on: string
  title: string | null
  diary_text: string
  analysis: EmotionAnalysis
  character: CharacterResult
}

export const getCharacters = () => apiRequest<CharacterCard[]>('/api/characters')
export const getCharacter = (id: string) =>
  apiRequest<CharacterDetail>(`/api/characters/${id}`)
export const renameCharacter = (id: string, name: string) =>
  apiRequest<CharacterDetail>(`/api/characters/${id}/name`, {
    method: 'PATCH', body: JSON.stringify({ name }),
  })
export const getEncounter = (characterId: string, encounterId: string) =>
  apiRequest<EncounterDetail>(`/api/characters/${characterId}/encounters/${encounterId}`)
export const deleteEncounter = (characterId: string, encounterId: string) =>
  apiRequest<void>(`/api/characters/${characterId}/encounters/${encounterId}`, {
    method: 'DELETE',
  })
