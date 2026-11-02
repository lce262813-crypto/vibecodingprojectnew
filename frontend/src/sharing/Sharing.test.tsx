import { fireEvent, render, screen } from '@testing-library/react'
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
      appearance: {
        body_part: 'basic', palette: 'sunny', color: '#F6CF65',
        eyebrow_part: 'brow_soft', eye_part: 'eye_smile',
        mouth_part: 'mouth_laugh', mutation_part: null,
      },
    })))

    renderPublicPage('token-1')

    expect(await screen.findByText('자랑꾼님이 새로운 감정 몬스터를 공유했어요!')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '반짝이 생성 캐릭터' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '나도 감정 몬스터 만들기' })).toHaveAttribute('href', '/signup')
  })

  it('shows a generic message for an expired link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'x' }, 404)))

    renderPublicPage('gone')

    expect(await screen.findByText('공유가 끝났거나 찾을 수 없는 링크예요.')).toBeInTheDocument()
  })
})

describe('ShareControls', () => {
  afterEach(() => vi.unstubAllGlobals())

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
})
