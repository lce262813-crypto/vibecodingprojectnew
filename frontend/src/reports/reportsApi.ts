import { apiRequest } from '../api/client'
import type { CharacterResult } from '../diary/diaryApi'
import { presetOf, type DateRange } from './reportFormat'

export type ReportPeriod = 'week' | 'month'
export interface EmotionCount { emotion: string; count: number; appearance_count?: number }
export interface EmotionGroupCount { group: string; label: string; count: number }
export interface KeywordCount { keyword: string; count: number }
export interface EmotionTrendPoint { entry_date: string; diary_count: number; primary_emotion: string; average_intensity: number; expression_intensity?: number; entry_id?: string | null; title?: string | null; summary?: string | null; co_emotions?: string[]; relationship_type?: string | null }
export interface PeriodComparison { start_date: string; end_date: string; diary_days: number; most_frequent_primary: string | null; average_expression_intensity: number | null }
export interface EmotionReport {
  period: ReportPeriod; start_date: string; end_date: string; diary_days: number; diary_count: number
  most_frequent_primary: string | null; emotion_counts: EmotionCount[]; group_counts: EmotionGroupCount[]
  average_intensity: number | null; average_expression_intensity?: number | null; legacy_intensity_converted?: boolean; frequent_keywords: KeywordCount[]; trend: EmotionTrendPoint[]; previous?: PeriodComparison | null; custom_range?: boolean
}
export interface ReflectionLetter { title: string; empathy: string; insight: string | null; underlying_need?: string | null; encouragement: string; suggestion: string | null; reflection_question: string | null; evidence_dates: string[]; limitations: string[] }
export interface SupportContact { name: string; phone: string; description: string }
export interface ReflectionSafety { message: string; resources: SupportContact[] }
export interface ReflectionResult { reflection: string; letter: ReflectionLetter; safety: ReflectionSafety | null; provider: string; model_name: string | null; privacy_note: string }
export interface PastEntry { entry_id: string; entry_date: string; title: string | null; diary_text: string; primary_emotion: string; character: CharacterResult | null }
export interface PastMoment { label: string; target_date: string; entries: PastEntry[] }
export interface OnThisDay { anchor_date: string; one_month_ago: PastMoment; one_year_ago: PastMoment }

function reportQuery(range: DateRange) {
  const period = presetOf(range)
  const query: Record<string, string> = period
    ? { period, anchor: range.start }
    : { start_date: range.start, end_date: range.end }
  return new URLSearchParams(query).toString()
}
export const getEmotionReport = (range: DateRange) => apiRequest<EmotionReport>(`/api/reports/emotions?${reportQuery(range)}`)
export const generateReflection = (range: DateRange) => apiRequest<ReflectionResult>(`/api/reports/reflection?${reportQuery(range)}`, { method: 'POST' })
export const getOnThisDay = (anchor: string) => apiRequest<OnThisDay>(`/api/reports/on-this-day?${new URLSearchParams({ anchor })}`)
