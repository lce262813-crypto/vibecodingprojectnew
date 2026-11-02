import { apiRequest } from '../api/client'

export type DiaryStatus =
  | 'not_started'
  | 'analyzing'
  | 'completed'
  | 'ai_failed'
  | 'deleted'

export interface DisplayEmotion {
  key: string
  label: string
  percentage: number
}

export interface EmotionAnalysis {
  analysis_mode: 'live' | 'demo'
  primary_emotion: string
  secondary_emotions: string[]
  detail_states: Array<{ key: string; confidence: number }>
  energy: number
  keywords: Array<{ text: string; category: string }>
  event_summary: string
  display_emotions: DisplayEmotion[]
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
  }
}

export interface TodayDiary {
  status: DiaryStatus
  entry_date: string
  entry_id: string | null
  title: string | null
  diary_text: string | null
  analysis: EmotionAnalysis | null
  character: CharacterResult | null
}

export interface DiaryCalendarRecord {
  entry_id: string
  entry_date: string
  title: string | null
  character: CharacterResult
}

export interface DiaryCalendarResponse {
  year: number
  month: number
  records: DiaryCalendarRecord[]
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
