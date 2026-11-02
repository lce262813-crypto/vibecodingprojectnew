import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '../auth/authContextValue'
import { AppShell } from './AppShell'

const auth: AuthContextValue = {
  status: 'authenticated',
  user: { id: 'user-1', email: 'mozi@example.com', nickname: '모' },
  login: vi.fn(),
  logout: vi.fn(),
  updateNickname: vi.fn(),
}

describe('AppShell', () => {
  it('provides the five primary destinations on desktop and mobile', () => {
    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/room']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/room" element={<p>감정 방 내용</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('감정 방 내용')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '나의 감정 방' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '일기 쓰기' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '일기 기록' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '캐릭터 도감' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: '가구 상점' })).toHaveLength(2)
    expect(screen.getByRole('link', { name: '모님' })).toHaveAttribute('href', '/settings')
  })
})
