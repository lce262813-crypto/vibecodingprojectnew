import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '../auth/authContextValue'
import { DiaryPage } from './DiaryPage'

function authValue(isDemo = false): AuthContextValue {
  return {
    status: 'authenticated',
    user: { id: 'u1', email: isDemo ? 'presentation@mozi-demo.com' : 'user@example.com', nickname: 'user', avatar_url: null, representative_character_id: null, theme: 'cream', notifications_enabled: false, notification_time: '21:00', room_background: 'cream', tutorial_completed: true, tutorial_step: 4, is_demo_account: isDemo },
    login: async () => {}, logout: async () => {}, updateNickname: async () => {}, updatePreferences: async () => {}, refreshUser: async () => {}, deleteAccount: async () => {}, completeTutorial: async () => {}, retryAuth: () => {},
  }
}

function renderDiary(isDemo = false) {
  return render(<AuthContext.Provider value={authValue(isDemo)}><MemoryRouter><DiaryPage /></MemoryRouter></AuthContext.Provider>)
}

describe('DiaryPage', () => {
  afterEach(() => {
    cleanup()
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

    renderDiary()

    const textarea = await screen.findByRole('textbox', { name: '오늘의 일기' })
    const submit = screen.getByRole('button', { name: '저장하고 감정 확인하기' })

    fireEvent.change(textarea, { target: { value: '가'.repeat(9) } })
    expect(submit).toBeDisabled()

    fireEvent.change(textarea, { target: { value: `  ${'가'.repeat(10)}  ` } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/저장한 일기는 다시 고칠 수 없어요/)).toBeInTheDocument()
  })

  it('lets the presentation account replace an existing diary using the protected demo endpoint', async () => {
    const request = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      const result = url.includes('/demo-rewrite')
        ? { status: 'completed', entry_date: '2026-11-02', entry_id: 'entry-1', title: 'new', diary_text: 'A replacement diary entry.', analysis: null, character: null }
        : { status: 'completed', entry_date: '2026-11-02', entry_id: 'entry-1', title: 'old', diary_text: 'Previously saved diary.', analysis: null, character: null }
      return Promise.resolve(new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    })
    vi.stubGlobal('fetch', request)
    const view = renderDiary(true)
    fireEvent.change(await screen.findAllByRole('textbox').then((items) => items[1]), { target: { value: 'A replacement diary entry.' } })
    expect(view.container.querySelector('button[type="submit"]')?.textContent).toContain('오늘 데모 기록 바꾸기')
    fireEvent.click(view.container.querySelector('button[type="submit"]')!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveTextContent('기존 데모 일기')
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button')[1])
    await vi.waitFor(() => expect(request.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining([expect.stringContaining('/demo-rewrite')])))
  })
})
