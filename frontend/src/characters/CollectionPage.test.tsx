import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CollectionPage } from './CollectionPage'

function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('CollectionPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows characters with encounter counts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{
      character_id: 'character-1', name: '몽글이', primary_emotion: 'joy',
      behavior_type: 'active', is_resident: false, encounter_count: 2,
      first_met_on: '2026-11-01', last_met_on: '2026-11-02',
      appearance: {
        body_part: 'round', palette: 'sunny', color: '#F6CF65',
        eyebrow_part: 'brow_soft', eye_part: 'eye_smile',
        mouth_part: 'mouth_laugh', mutation_part: null,
      },
    }])))

    render(<MemoryRouter><CollectionPage /></MemoryRouter>)

    expect(await screen.findByText('몽글이')).toBeInTheDocument()
    const sprite = screen.getByRole('img', { name: '몽글이 생성 캐릭터' })
    expect(sprite.closest('[data-character-source]')).toHaveAttribute('data-character-source', 'generated')
    expect(sprite.querySelector('img')).toHaveAttribute('src', '/assets/character-prototype/bodies/basic.png')
    expect(screen.getByText('2번 만남 · 최근 2026-11-02')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /몽글이 생성 캐릭터/ })).toHaveAttribute(
      'href', '/characters/character-1',
    )
  })

  it('guides an empty collection to the diary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([])))

    render(<MemoryRouter><CollectionPage /></MemoryRouter>)

    expect(await screen.findByText('아직 만난 캐릭터가 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '첫 일기 쓰기' })).toHaveAttribute('href', '/diary')
  })
})
