import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GenerationPage } from './GenerationPage'

function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GenerationPage', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the compact emotion result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      status: 'completed',
      entry_date: '2026-11-02',
      entry_id: 'entry-1',
      diary_text: '오늘의 일기',
      analysis: {
        analysis_mode: 'live',
        primary_emotion: 'joy',
        secondary_emotions: ['excitement'],
        detail_states: [],
        energy: 70,
        keywords: [],
        event_summary: '기쁨과 설렘이 함께 나타났어요.',
        display_emotions: [
          { key: 'joy', label: '기쁨', percentage: 60 },
          { key: 'excitement', label: '설렘', percentage: 40 },
        ],
      },
      character: {
        character_id: 'character-1', encounter_id: 'encounter-1', name: '두근이',
        fingerprint: 'joy:4:excitement:none:4', primary_emotion: 'joy',
        intensity_level: 4, behavior_type: 'active', accessory_part: 'heart',
        effect_parts: ['sparkles'], feature_description: '기쁨을 담은 감정 몬스터예요.',
        is_new_character: true,
        appearance: {
          body_part: 'round', palette: 'sunny', color: '#F6CF65',
          eyebrow_part: 'brow_soft', eye_part: 'eye_smile', mouth_part: 'mouth_laugh',
          mutation_part: null,
        },
      },
    })))

    render(<MemoryRouter><GenerationPage /></MemoryRouter>)

    expect(await screen.findByText('두근이 등장!')).toBeInTheDocument()
    expect(screen.getByText('도감에 자동으로 저장되었어요')).toBeInTheDocument()
    const sprite = screen.getByRole('img', { name: '두근이 생성 캐릭터' })
    expect(sprite.querySelector('img')).toHaveAttribute('src', '/assets/character-prototype/bodies/basic.png')
    expect(sprite.querySelector('[src$="/decorations/hearts.png"]')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('기쁨과 설렘이 함께 나타났어요.')).toBeInTheDocument()
  })

  it('offers an explicit demo fallback after an AI failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        status: 'ai_failed', entry_date: '2026-11-02', entry_id: 'entry-1',
        diary_text: '피곤했던 하루', analysis: null, character: null,
      }))
      .mockResolvedValueOnce(response({
        status: 'completed', entry_date: '2026-11-02', entry_id: 'entry-1',
        diary_text: '피곤했던 하루',
        analysis: {
          analysis_mode: 'demo', primary_emotion: 'fatigue',
          secondary_emotions: [], detail_states: [], energy: 30, keywords: [],
          event_summary: '피로 감정이 가장 뚜렷하게 나타났어요.',
          display_emotions: [{ key: 'fatigue', label: '피로', percentage: 100 }],
        },
        character: null,
      }))
    vi.stubGlobal('fetch', fetchMock)

    render(<MemoryRouter><GenerationPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: '데모 분석으로 계속하기' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('데모 분석 결과')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('can replace a completed demo result with a live result', async () => {
    const demo = {
      status: 'completed', entry_date: '2026-11-02', entry_id: 'entry-1',
      diary_text: '오늘 너무 졸리다.',
      analysis: {
        analysis_mode: 'demo', primary_emotion: 'fatigue',
        secondary_emotions: [], detail_states: [], energy: 20, keywords: [],
        event_summary: '피로 감정이 가장 뚜렷하게 나타났어요.',
        display_emotions: [{ key: 'fatigue', label: '피로', percentage: 70 }],
      },
      character: null,
    }
    const live = {
      ...demo,
      analysis: {
        ...demo.analysis,
        analysis_mode: 'live',
        secondary_emotions: ['lethargy'],
        event_summary: '몸이 무겁고 졸린 피로가 크게 나타났어요.',
        display_emotions: [{ key: 'fatigue', label: '피로', percentage: 85 }],
      },
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(demo))
      .mockResolvedValueOnce(response(live))
    vi.stubGlobal('fetch', fetchMock)

    render(<MemoryRouter><GenerationPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: '실제 AI로 다시 분석하기' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('85%')).toBeInTheDocument()
    expect(screen.queryByText('데모 분석 결과')).not.toBeInTheDocument()
  })
})
