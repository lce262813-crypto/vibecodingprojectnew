import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getDiaryEntry: vi.fn(),
  retryEntryAnalysis: vi.fn(),
  continueEntryWithDemoAnalysis: vi.fn(),
  deleteDiaryEntry: vi.fn(),
}))

vi.mock('./diaryApi', () => api)

import { DiaryEntryDetailPage } from './DiaryEntryDetailPage'

describe('DiaryEntryDetailPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retries analysis when opening a record that was left pending', async () => {
    api.getDiaryEntry.mockResolvedValue({
      status: 'analyzing', entry_id: 'entry-1', entry_date: '2026-11-05',
      title: null, diary_text: '오늘은 정말 행복했다.', analysis: null, character: null,
    })
    api.retryEntryAnalysis.mockResolvedValue({
      status: 'completed', entry_id: 'entry-1', entry_date: '2026-11-05',
      title: null, diary_text: '오늘은 정말 행복했다.', analysis: null, character: null,
    })

    render(<MemoryRouter initialEntries={['/diary/entries/entry-1']}>
      <Routes><Route path="/diary/entries/:entryId" element={<DiaryEntryDetailPage />} /></Routes>
    </MemoryRouter>)

    await waitFor(() => expect(api.retryEntryAnalysis).toHaveBeenCalledWith('entry-1'))
    expect(await screen.findByText('오늘은 정말 행복했다.')).toBeInTheDocument()
  })
})
