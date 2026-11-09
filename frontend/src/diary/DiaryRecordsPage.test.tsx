import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DiaryRecordsPage } from './DiaryRecordsPage'

function calendarResponse(year: number, month: number, records: unknown[] = []) {
  return new Response(JSON.stringify({ year, month, records }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('DiaryRecordsPage', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows a saved character and opens the date record list', async () => {
    const now = new Date()
    const year = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now))
    const month = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', month: 'numeric' }).format(now))
    const day = 2
    const entryDate = `${year}-${String(month).padStart(2, '0')}-02`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(calendarResponse(year, month, [{
      entry_id: 'entry-1', entry_date: entryDate, title: '산책한 날',
      character: {
        character_id: 'character-1', encounter_id: 'encounter-1', name: '꾸벅이',
        fingerprint: 'fatigue:4:none:none:2', primary_emotion: 'fatigue',
        intensity_level: 4, behavior_type: 'tired', accessory_part: 'cup',
        effect_parts: [], feature_description: '피로한 감정 몬스터',
        is_new_character: false,
        appearance: {
          body_part: 'basic', palette: 'slate', color: '#B8B8C8',
          eyebrow_part: 'brow_flat', eye_part: 'eye_half', mouth_part: 'mouth_flat',
          mutation_part: null,
        },
      },
    }])))

    render(<MemoryRouter><DiaryRecordsPage /></MemoryRouter>)

    const recordButton = await screen.findByRole('button', { name: `${entryDate} 기록 목록 보기` })
    expect(recordButton).toHaveTextContent(String(day))
    expect(screen.getByRole('img', { name: '꾸벅이 character' })).toBeInTheDocument()
    expect(screen.queryByText('산책한 날')).not.toBeInTheDocument()
    fireEvent.click(recordButton)
    expect(screen.getByRole('link', { name: /산책한 날/ })).toHaveAttribute('href', '/diary/entries/entry-1')
  })

  it('requests the previous month when its control is selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(calendarResponse(2026, 1))
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><DiaryRecordsPage /></MemoryRouter>)

    await screen.findByRole('heading', { name: /년 \d+월/ })
    fireEvent.click(screen.getByRole('button', { name: '이전 달' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/api\/diary\/records\?year=\d+&month=\d+/)
  })

  it('sends date and emotion filters without requiring a text query', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(calendarResponse(2026, 11))
      .mockResolvedValueOnce(new Response(JSON.stringify({ query: '', records: [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><DiaryRecordsPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: /년 \d+월/ })

    fireEvent.change(screen.getByLabelText('일기 감정 필터'), { target: { value: 'joy' } })
    fireEvent.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(String(fetchMock.mock.calls[1][0])).toContain('emotion=joy')
  })
})
