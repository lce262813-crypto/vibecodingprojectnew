import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App', () => {
  afterEach(() => {
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

    expect(
      screen.getByRole('heading', { name: /내 마음에서 태어난/ }),
    ).toBeInTheDocument()
    expect(await screen.findByText('백엔드 연결됨')).toBeInTheDocument()
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
