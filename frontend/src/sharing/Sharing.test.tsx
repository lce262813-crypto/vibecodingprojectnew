import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PublicCharacterPage } from './PublicCharacterPage'
import { ShareControls } from './ShareControls'

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderPublicPage(token: string) {
  render(
    <MemoryRouter initialEntries={[`/share/${token}`]}>
      <Routes><Route path="/share/:token" element={<PublicCharacterPage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('PublicCharacterPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows only the shared character and the owner nickname', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      owner_nickname: '자랑꾼', name: '반짝이', behavior_type: 'active',
      accessory_part: null, effect_parts: [],
      emotions: [{ key: 'joy', label: '\uAE30\uC068', intensity: 3, is_primary: true }],
      relationship_type: 'SINGLE',
      appearance: {
        body_part: 'basic', palette: 'sunny', color: '#F6CF65',
        eyebrow_part: 'brow_soft', eye_part: 'eye_smile',
        mouth_part: 'mouth_laugh', mutation_part: null,
      },
    })))

    renderPublicPage('token-1')
    expect(await screen.findByRole('heading', { name: '\uCE5C\uAD6C\uAC00 \uBCF4\uB0B8 \uCE90\uB9AD\uD130\uAC00 \uB3C4\uCC29\uD588\uC5B4\uC694!' })).toBeInTheDocument()
    expect(screen.getByText('\uAE30\uC068')).toBeInTheDocument()
    expect(screen.getByText('\uAC15\uB3C4 3단계')).toBeInTheDocument()
    expect(screen.getByText('\uC77C\uAE30 \uB0B4\uC6A9\uC740 \uACF5\uC720\uB418\uC9C0 \uC54A\uC544\uC694.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '\uBC18\uC9DD\uC774 character' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '\uB098\uB9CC\uC758 \uAC10\uC815 \uCE5C\uAD6C \uB9CC\uB098\uAE30' })).toHaveAttribute('href', '/signup')

    expect(await screen.findByRole('heading', { name: '\uCE5C\uAD6C\uAC00 \uBCF4\uB0B8 \uCE90\uB9AD\uD130\uAC00 \uB3C4\uCC29\uD588\uC5B4\uC694!' })).toBeInTheDocument()
    expect(screen.getByText('\uAE30\uC068')).toBeInTheDocument()
    expect(screen.getByText('강도 3단계')).toBeInTheDocument()
    expect(screen.getByText('\uC77C\uAE30 \uB0B4\uC6A9\uC740 \uACF5\uC720\uB418\uC9C0 \uC54A\uC544\uC694.')).toBeInTheDocument()

  })

  it('shows a generic message for an expired link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'x' }, 404)))

    renderPublicPage('gone')
    expect(await screen.findByText('\uACF5\uC720\uAC00 \uB9CC\uB8CC\uB418\uC5C8\uAC70\uB098 \uCC3E\uC744 \uC218 \uC5C6\uB294 \uB9C1\uD06C\uC608\uC694.')).toBeInTheDocument()

  })
})

describe('ShareControls', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('creates a share link and shows it with a copy button', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ token: 'abc', share_path: '/share/abc' }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ShareControls characterId="character-1" characterName="반짝이" />)
    fireEvent.click(screen.getByRole('button', { name: '친구에게 자랑하기' }))

    expect(await screen.findByRole('textbox', { name: '자랑하기 링크' })).toHaveValue(
      `${window.location.origin}/share/abc`,
    )
    expect(screen.getByRole('button', { name: '링크 복사' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toContain('/api/characters/character-1/share')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' })
  })

  describe('with the phone share sheet', () => {
    const share = vi.fn()

    function tapBrag() {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ token: 'abc', share_path: '/share/abc' })))
      vi.stubGlobal('navigator', { ...navigator, share })
      render(<ShareControls characterId="character-1" characterName="반짝이" />)
      fireEvent.click(screen.getByRole('button', { name: '친구에게 자랑하기' }))
    }

    afterEach(() => { cleanup(); share.mockReset() })

    it('opens the share sheet on the first tap', async () => {
      share.mockResolvedValue(undefined)
      tapBrag()

      await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
      expect(share).toHaveBeenCalledWith(expect.objectContaining({
        title: 'MOZI · 반짝이',
        url: `${window.location.origin}/share/abc`,
      }))
    })

    it('stays quiet when the person closes the sheet', async () => {
      share.mockRejectedValue(new DOMException('closed', 'AbortError'))
      tapBrag()

      await waitFor(() => expect(share).toHaveBeenCalled())
      await screen.findByRole('textbox', { name: '자랑하기 링크' })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('asks for one more tap when the browser refuses, and that tap opens the sheet', async () => {
      share.mockRejectedValueOnce(new DOMException('expired tap', 'NotAllowedError')).mockResolvedValue(undefined)
      tapBrag()

      expect(await screen.findByRole('status')).toHaveTextContent('공유하기를 한 번 더')
      fireEvent.click(screen.getByRole('button', { name: '공유하기' }))

      await waitFor(() => expect(share).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    })
  })
})
