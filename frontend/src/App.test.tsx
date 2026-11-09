import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the MOZI landing page and backend connection state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/api/health')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                status: 'ok',
                service: 'mozi-api',
                environment: 'test',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          )
        }
        return Promise.resolve(
          new Response(JSON.stringify({ detail: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }),
    )

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    // The loading screen also shows the logo, so wait for the splash's own tagline first.
    expect(await screen.findByText(/내 마음에서 태어난/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'MOZI 시작하기' })).toBeInTheDocument()
    expect(await screen.findByText('백엔드 연결됨')).toBeInTheDocument()
  })

  it('takes a new member from signup straight into the tutorial', async () => {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json' },
    })
    const member = {
      id: 'u1', email: 'new@example.com', nickname: '새싹', avatar_url: null,
      tutorial_completed: false, tutorial_step: 0,
    }
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/me')) return Promise.resolve(json({ detail: 'Unauthorized' }, 401))
      if (url.endsWith('/api/auth/signup')) return Promise.resolve(json({ message: '가입 완료' }, 201))
      return Promise.resolve(json(member))
    }))

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(await screen.findByLabelText('이메일'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText(/닉네임/), { target: { value: '새싹' } })
    fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'safe-password' } })
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByRole('heading', { name: 'MOZI에 오신 걸 환영해요!' })).toBeInTheDocument()
  })

  it('redirects an anonymous visitor away from the protected room', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    render(
      <MemoryRouter initialEntries={['/room']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: '다시 만나서 반가워요' }),
    ).toBeInTheDocument()
  })
})
