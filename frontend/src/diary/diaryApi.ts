import { apiRequest } from '../api/client'

export type DiaryStatus =
  | 'not_started'
  | 'draft'
  | 'analyzing'
  | 'awaiting_confirmation'
  | 'uncertain'
  | 'completed'
  | 'ai_failed'
  | 'deleted'

export interface DisplayEmotion {
  key: string
  label: string
  percentage?: number | null
  intensity?: number | null
}

export interface EmotionAnalysis {
  analysis_mode: 'live' | 'demo'
  primary_emotion: string | null
  secondary_emotions: string[]
  primary_ratio: number | null
  secondary_ratio: number | null
  primary_intensity: number
  secondary_intensity: number
  detail_states: Array<{ key: string; confidence: number }>
  energy: number
  keywords: Array<{ text: string; category: string }>
  event_summary: string
  reason: string
  events: string[]
  objects: string[]
  confidence: number
  uncertainty_note: string | null
  display_emotions: DisplayEmotion[]
  provider: string | null
  model_name: string | null
  prompt_version: string | null
  is_user_edited: boolean
  review?: EmotionReview | null
  ai_original?: EmotionReview | null
  review_revision?: number
}

export interface CharacterResult {
  character_id: string
  encounter_id: string
  name: string
  fingerprint: string
  primary_emotion: string
  intensity_level: number
  behavior_type: string
  accessory_part: string | null
  effect_parts: string[]
  feature_description: string
  is_new_character: boolean
  appearance: {
    body_part: string
    palette: string
    color: string
    eyebrow_part: string
    eye_part: string
    mouth_part: string
    mutation_part: string | null
    renderer_version?: string | null
    render_spec?: CharacterRenderSpec | null
  }
}

export interface CharacterRenderSpec {
  renderer_version: string
  seed: number
  primary_emotion: string
  primary_intensity: number
  secondary_emotion: string | null
  secondary_intensity: number
  secondary_relation?: SecondaryEmotionRelation | null
  silhouette_id: string
  palette_id: string
  legacy_palette_id?: string
  expression_id: string
  effect_id: string | null
  decoration_id: string | null
  animal_feature_id: string | null
  objects: string[]
}

export interface TodayDiary {
  status: DiaryStatus
  entry_date: string
  entry_id: string | null
  title: string | null
  diary_text: string | null
  analysis: EmotionAnalysis | null
  character: CharacterResult | null
  photo_url?: string | null
  analysis_error?: string | null
}

export interface DiaryCalendarRecord {
  entry_id: string
  entry_date: string
  title: string | null
  character: CharacterResult | null
  status?: DiaryStatus
}

export type RelationshipType = 'SINGLE' | 'MIXED' | 'TRANSITION' | 'CONTRAST' | 'UNCERTAIN'
export type SecondaryEmotionRelation = 'companion' | 'residual' | 'relief' | 'reversal'
export interface ReviewEmotion {
  emotion: import('../characters/pixel/palette').EmotionKey
  intensity: number
  source: 'ai' | 'user'
  evidence: string | null
  evidence_start: number | null
  evidence_end: number | null
  event: string
  explanation: string
  relation?: SecondaryEmotionRelation | null
}
export interface EmotionReview {
  status: 'analyzed' | 'uncertain'
  emotions: ReviewEmotion[]
  relationship: { type: RelationshipType; sequence: ReviewEmotion['emotion'][]; explanation: string }
  recommended_emotion: ReviewEmotion['emotion'] | null
  selected_emotion: ReviewEmotion['emotion'] | null
  objects: string[]
  confirmed_by_user: boolean
}
export interface DiaryCalendarResponse {
  year: number
  month: number
  records: DiaryCalendarRecord[]
}

export interface DiarySearchRecord {
  entry_id: string
  entry_date: string
  title: string | null
  diary_preview: string
  status: DiaryStatus
  character_id: string | null
  encounter_id: string | null
  primary_emotion: string | null
}

export interface DiarySearchResponse {
  query: string
  records: DiarySearchRecord[]
}

export function getTodayDiary() {
  return apiRequest<TodayDiary>('/api/diary/today')
}

export function getDiaryRecords(year: number, month: number) {
  return apiRequest<DiaryCalendarResponse>(`/api/diary/records?year=${year}&month=${month}`)
}

export function createTodayDiary(diaryText: string, title?: string) {
  return apiRequest<TodayDiary>('/api/diary/today', {
    method: 'POST',
    body: JSON.stringify({ diary_text: diaryText, title: title || null }),
  })
}

export function rewriteDemoTodayDiary(diaryText: string, title?: string) {
  return apiRequest<TodayDiary>('/api/diary/today/demo-rewrite', {
    method: 'POST',
    body: JSON.stringify({ diary_text: diaryText, title: title || null }),
  })
}

export function getDiaryByDate(entryDate: string) {
  return apiRequest<TodayDiary>(`/api/diary/by-date?entry_date=${encodeURIComponent(entryDate)}`)
}

export function getDiaryEntry(entryId: string) {
  return apiRequest<TodayDiary>(`/api/diary/entries/${entryId}`)
}

export function saveDiaryDraft(entryDate: string, diaryText: string, title?: string) {
  return apiRequest<TodayDiary>('/api/diary/draft', {
    method: 'PUT',
    body: JSON.stringify({ entry_date: entryDate, diary_text: diaryText, title: title || null }),
  })
}

export function deleteDiaryEntry(entryId: string) {
  return apiRequest<void>(`/api/diary/entries/${entryId}`, { method: 'DELETE' })
}

export interface DiarySearchFilters {
  query?: string
  dateFrom?: string
  dateTo?: string
  emotion?: string
}

export function searchDiaryEntries(filters: DiarySearchFilters | string) {
  const resolved = typeof filters === 'string' ? { query: filters } : filters
  const params = new URLSearchParams()
  if (resolved.query?.trim()) params.set('query', resolved.query.trim())
  if (resolved.dateFrom) params.set('date_from', resolved.dateFrom)
  if (resolved.dateTo) params.set('date_to', resolved.dateTo)
  if (resolved.emotion) params.set('emotion', resolved.emotion)
  return apiRequest<DiarySearchResponse>(`/api/diary/search?${params.toString()}`)
}

export function retryEntryAnalysis(entryId: string) {
  return apiRequest<TodayDiary>(`/api/diary/entries/${entryId}/retry`, { method: 'POST' })
}

export function continueEntryWithDemoAnalysis(entryId: string) {
  return apiRequest<TodayDiary>(`/api/diary/entries/${entryId}/demo`, { method: 'POST' })
}

export interface EmotionAnalysisUpdate {
  primary_emotion: string
  secondary_emotion: string | null
  primary_ratio: number
  secondary_ratio: number
  primary_intensity: number
  secondary_intensity: number
}

export function updateEmotionAnalysis(entryId: string, update: EmotionAnalysisUpdate) {
  return apiRequest<TodayDiary>(`/api/diary/entries/${entryId}/analysis`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export function retryTodayAnalysis() {
  return apiRequest<TodayDiary>('/api/diary/today/retry', {
    method: 'POST',
  })
}

export function continueWithDemoAnalysis() {
  return apiRequest<TodayDiary>('/api/diary/today/demo', {
    method: 'POST',
  })
}
