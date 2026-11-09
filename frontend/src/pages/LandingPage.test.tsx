import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '../auth/authContextValue'
import type { AuthStatus } from '../auth/types'
import { LandingPage } from './LandingPage'

function renderWith(status: AuthStatus) {
  const auth: AuthContextValue = {
    status, user: null, login: vi.fn(), logout: vi.fn(), updateNickname: vi.fn(),
    updatePreferences: vi.fn(), refreshUser: vi.fn(), deleteAccount: vi.fn(), completeTutorial: vi.fn(), retryAuth: vi.fn(),
  }
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/room" element={<p>감정 방</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(cleanup)

describe('LandingPage', () => {
  it('shows the pixel logo, tagline and the two entry buttons to guests', () => {
    renderWith('anonymous')
    expect(screen.getByRole('img', { name: 'MOZI.' })).toBeInTheDocument()
    expect(screen.getByText(/오늘의 이상한 친구/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'MOZI 시작하기' })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login')
  })

  it('skips the splash for someone already signed in', () => {
    renderWith('authenticated')
    expect(screen.getByText('감정 방')).toBeInTheDocument()
  })

  it('shows the loading screen while the session is checked', () => {
    renderWith('loading')
    expect(screen.getByRole('status')).toHaveTextContent('\uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824 \uC8FC\uC138\uC694!')
  })
})
