import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows characters with encounter counts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{
      character_id: 'character-1', name: '몽글이', primary_emotion: 'joy',
      behavior_type: 'active', is_resident: false, encounter_count: 2,
      is_favorite: false,
      first_met_on: '2026-11-01', last_met_on: '2026-11-02',
      appearance: {
        body_part: 'round', palette: 'sunny', color: '#F6CF65',
        eyebrow_part: 'brow_soft', eye_part: 'eye_smile',
        mouth_part: 'mouth_laugh', mutation_part: null,
      },
    }])))

    render(<MemoryRouter><CollectionPage /></MemoryRouter>)

    expect(await screen.findByText('몽글이')).toBeInTheDocument()
    const sprite = screen.getByRole('img')
    expect(sprite.closest('[data-character-source]')).toHaveAttribute('data-character-source', 'soft-friend-legacy')
    expect(sprite).toBeInstanceOf(HTMLCanvasElement)
    const tile = screen.getByText('몽글이').closest('li')!
    expect(tile).toHaveTextContent('기쁨 · 2번')
    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href') === '/characters/character-1')).toBe(true)
    expect(screen.getByRole('button', { name: '몽글이 즐겨찾기' })).toBeInTheDocument()
  })

  it('guides an empty collection to the diary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([])))

    render(<MemoryRouter><CollectionPage /></MemoryRouter>)

    expect(await screen.findByText('아직 만난 캐릭터가 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '첫 일기 쓰기' })).toHaveAttribute('href', '/diary')
  })

  it('filters the collection by emotion group', async () => {
    const character = (id: string, name: string, emotion: string) => ({
      character_id: id, name, primary_emotion: emotion, behavior_type: 'calm',
      is_resident: false, is_favorite: false, encounter_count: 1,
      first_met_on: '2026-11-01', last_met_on: '2026-11-01',
      appearance: { body_part: 'basic', palette: 'mint', color: '#A9D7C3', eyebrow_part: 'brow_soft', eye_part: 'eye_closed', mouth_part: 'mouth_soft_smile', mutation_part: null },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
      character('joy-1', '방긋이', 'joy'), character('sad-1', '울먹이', 'sadness'),
    ])))
    render(<MemoryRouter><CollectionPage /></MemoryRouter>)
    await screen.findByText('방긋이')

    fireEvent.change(screen.getByLabelText('감정 그룹 필터'), { target: { value: 'loss' } })

    expect(screen.queryByText('방긋이')).not.toBeInTheDocument()
    expect(screen.getByText('울먹이')).toBeInTheDocument()
  })
})
