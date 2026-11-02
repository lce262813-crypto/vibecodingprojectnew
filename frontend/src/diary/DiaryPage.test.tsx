import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DiaryPage } from './DiaryPage'

describe('DiaryPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('enables confirmation at ten trimmed characters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'not_started',
            entry_date: '2026-11-02',
            entry_id: null,
            diary_text: null,
            analysis: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    render(
      <MemoryRouter>
        <DiaryPage />
      </MemoryRouter>,
    )

    const textarea = await screen.findByRole('textbox', { name: '오늘의 일기' })
    const submit = screen.getByRole('button', { name: '캐릭터 생성하기' })

    fireEvent.change(textarea, { target: { value: '가'.repeat(9) } })
    expect(submit).toBeDisabled()

    fireEvent.change(textarea, { target: { value: `  ${'가'.repeat(10)}  ` } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/생성 후에는 일기를 수정하거나/)).toBeInTheDocument()
  })
})
