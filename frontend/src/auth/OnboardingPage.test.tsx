import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from './authContextValue'
import { OnboardingPage } from './OnboardingPage'
import { ProtectedRoute } from './ProtectedRoute'
import type { User } from './types'

const user: User = { id: 'u1', email: 'new@example.com', nickname: '새싹', avatar_url: null, representative_character_id: null, theme: 'cream', notifications_enabled: false, notification_time: '21:00', room_background: 'cream', tutorial_completed: false, tutorial_step: 0 }

function renderAt(path: string, overrides: Partial<User>, completeTutorial = vi.fn().mockResolvedValue(undefined)) {
  const auth: AuthContextValue = {
    status: 'authenticated', user: { ...user, ...overrides },
    login: vi.fn(), logout: vi.fn(), updateNickname: vi.fn(), updatePreferences: vi.fn(), refreshUser: vi.fn(), deleteAccount: vi.fn(), completeTutorial, retryAuth: vi.fn(),
  }
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/welcome" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/room" element={<ProtectedRoute><p>감정 방</p></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><p>설정 화면</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return completeTutorial
}

const next = () => fireEvent.click(screen.getByRole('button', { name: '다음' }))

describe('OnboardingPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  function savedSteps() {
    return fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith('/api/auth/tutorial/step'))
      .map(([, init]) => JSON.parse(String(init.body)).step)
  }

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('keeps a new member out of the app until the tutorial is done', () => {
    renderAt('/room', {})
    expect(screen.getByRole('heading', { name: 'MOZI에 오신 걸 환영해요!' })).toBeInTheDocument()
    expect(screen.queryByText('감정 방')).not.toBeInTheDocument()
  })

  it('never shows the tutorial to someone who finished it', () => {
    renderAt('/room', { tutorial_completed: true })
    expect(screen.getByText('감정 방')).toBeInTheDocument()
    cleanup()
    renderAt('/welcome', { tutorial_completed: true })
    expect(screen.getByText('감정 방')).toBeInTheDocument()
  })

  it('moves through five steps, back again, and saves completion at the end', async () => {
    const completeTutorial = renderAt('/welcome', {})
    expect(screen.getByLabelText('5단계 중 1단계')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '이전' })).not.toBeInTheDocument()
    next()
    expect(screen.getByRole('heading', { name: '하루에 한 번, 감정 친구 탄생!' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '이전' }))
    expect(screen.getByLabelText('5단계 중 1단계')).toBeInTheDocument()
    for (let step = 0; step < 4; step += 1) next()
    expect(screen.getByRole('heading', { name: '나의 감정 친구를 공유해요!' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'MOZI 시작하기' }))
    await waitFor(() => expect(completeTutorial).toHaveBeenCalledOnce())
  })

  it('resumes from the step saved on the account and keeps saving progress', async () => {
    renderAt('/welcome', { tutorial_step: 3 })
    expect(screen.getByRole('heading', { name: '오늘의 기록은 한 번만!' })).toBeInTheDocument()
    next()
    await waitFor(() => expect(savedSteps()).toContain(4))
  })

  it('stays on the last step and explains when completion cannot be saved', async () => {
    renderAt('/welcome', { tutorial_step: 4 }, vi.fn().mockRejectedValue(new Error('offline')))
    fireEvent.click(screen.getByRole('button', { name: 'MOZI 시작하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('저장하지 못했어요')
    expect(screen.queryByText('감정 방')).not.toBeInTheDocument()
  })

  it('replays from settings without touching the saved state, then returns there', async () => {
    const completeTutorial = renderAt('/welcome?replay=1', { tutorial_completed: true, tutorial_step: 4 })
    expect(screen.getByLabelText('5단계 중 1단계')).toBeInTheDocument()
    for (let step = 0; step < 4; step += 1) next()
    fireEvent.click(screen.getByRole('button', { name: '설정으로 돌아가기' }))

    expect(await screen.findByText('설정 화면')).toBeInTheDocument()
    expect(completeTutorial).not.toHaveBeenCalled()
    expect(savedSteps()).toEqual([])
  })
})
