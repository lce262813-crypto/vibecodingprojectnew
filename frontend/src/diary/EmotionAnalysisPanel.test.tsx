import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmotionAnalysisPanel } from './EmotionAnalysisPanel'
import type { EmotionAnalysis } from './diaryApi'

const analysis: EmotionAnalysis = {
  analysis_mode: 'live', primary_emotion: 'joy', secondary_emotions: ['anxiety'],
  primary_ratio: null, secondary_ratio: null, primary_intensity: 0, secondary_intensity: 0,
  detail_states: [], energy: 50, keywords: [], event_summary: '기쁜 일이 있었어요.',
  reason: '즐거운 경험이 중심에 있어요.', events: [], objects: [], confidence: 0,
  uncertainty_note: null, display_emotions: [], provider: 'openai', model_name: 'test',
  prompt_version: 'test', is_user_edited: false,
  review: {
    status: 'analyzed', recommended_emotion: 'joy', selected_emotion: 'joy',
    confirmed_by_user: false, objects: [],
    relationship: { type: 'MIXED', sequence: [], explanation: '기쁨과 걱정이 함께 나타났어요.' },
    emotions: [
      { emotion: 'joy', intensity: 4, source: 'ai', evidence: '정말 기뻤다', evidence_start: 0, evidence_end: 7, event: '좋은 소식', explanation: '기쁨을 직접 표현했어요.', relation: null },
      { emotion: 'anxiety', intensity: 2, source: 'ai', evidence: '조금 걱정됐다', evidence_start: 8, evidence_end: 15, event: '앞날을 생각함', explanation: '걱정을 직접 표현했어요.', relation: 'residual' },
    ],
  },
}

describe('EmotionAnalysisPanel', () => {
  it('presents the AI result and evidence without manual emotion controls', () => {
    render(<EmotionAnalysisPanel analysis={analysis} diaryText="정말 기뻤다 조금 걱정됐다" />)
    expect(screen.getByText(/기쁨 · 강함/)).toBeInTheDocument()
    expect(screen.getByText(/불안 · 약함/)).toBeInTheDocument()
    expect(screen.getByText('MOZI는 이렇게 읽었어요')).toBeInTheDocument()
    expect(screen.getByText(/기쁨과 걱정이 함께 나타났어요/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('does not invent a character emotion for an uncertain diary', () => {
    render(<EmotionAnalysisPanel analysis={{ ...analysis, review: {
      ...analysis.review!, status: 'uncertain', emotions: [], recommended_emotion: null,
      selected_emotion: null, relationship: { type: 'UNCERTAIN', sequence: [], explanation: '감정 표현을 찾지 못했어요.' },
    } }} />)
    expect(screen.getByText(/캐릭터를 만들지 않았어요/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
