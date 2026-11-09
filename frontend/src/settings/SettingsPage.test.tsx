import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '../auth/authContextValue'
import { SettingsPage } from './SettingsPage'

function response(body: unknown) { return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }) }
const updatePreferences = vi.fn().mockResolvedValue(undefined)
const auth: AuthContextValue = {
  status: 'authenticated',
  user: { id: 'u1', email: 'mozi@example.com', nickname: '모지', avatar_url: null, representative_character_id: null, theme: 'cream', notifications_enabled: false, notification_time: '21:00', room_background: 'cream', tutorial_completed: true, tutorial_step: 0 },
  login: vi.fn(), logout: vi.fn(), updateNickname: vi.fn(), updatePreferences, refreshUser: vi.fn(), deleteAccount: vi.fn(), completeTutorial: vi.fn(), retryAuth: vi.fn(),
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('SettingsPage', () => {
  it('offers only the diary reminder, not representative character or themes', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(response(String(input).includes('/badges') ? { badges: [] } : []))))
    render(<AuthContext.Provider value={auth}><MemoryRouter><SettingsPage /></MemoryRouter></AuthContext.Provider>)
    await screen.findByRole('heading', { name: '일기 작성 알림' })
    expect(screen.queryByText('대표 캐릭터')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('화면 테마')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('감정 방 배경')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('알림 시간'), { target: { value: '22:30' } })
    fireEvent.click(screen.getByRole('button', { name: '알림 설정 저장' }))
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith(expect.objectContaining({
      theme: 'cream', room_background: 'cream', notification_time: '22:30', notifications_enabled: false,
    })))
  })

  it('explains the notification limitation when the browser API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(response(String(input).includes('/badges') ? { badges: [] } : []))))
    render(<AuthContext.Provider value={auth}><MemoryRouter><SettingsPage /></MemoryRouter></AuthContext.Provider>)
    expect(await screen.findByText('이 브라우저는 알림을 지원하지 않아요.')).toBeInTheDocument()
  })
})
