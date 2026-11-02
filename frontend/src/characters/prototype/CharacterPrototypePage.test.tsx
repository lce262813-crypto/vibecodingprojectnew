import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CharacterPrototypePage } from './CharacterPrototypePage'

describe('CharacterPrototypePage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows twelve originals beside twenty body-mask prototypes', async () => {
    const prototype = (id: string, name: string) => ({
      id, name, seed: 1,
      body: { template_id: 'wide', palette_id: 'coral', color: '#F8877E' },
      expression: { eyebrow_id: 'angry', eye_id: 'half', mouth_id: 'crooked' },
      emotion: {
        primary: { key: 'anger', intensity: 70 },
        secondary: { key: 'fatigue', intensity: 30 },
        detail_state: 'pressure',
      },
      decoration: { part_id: 'coffee', anchor: 'right_hand' },
      effect_parts: [], mutation: { part_id: null }, description: '설명',
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([
      prototype('one', '하나'), prototype('two', '둘'), prototype('three', '셋'),
      prototype('four', '넷'), prototype('five', '다섯'),
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    render(<MemoryRouter><CharacterPrototypePage /></MemoryRouter>)

    const generated = await screen.findByRole('img', { name: '반짝두근 생성 캐릭터' })
    expect(screen.getAllByRole('article')).toHaveLength(32)
    expect(screen.getByText('개발용 · 원본/생성 분리')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '두근이 원본 캐릭터' })).toHaveAttribute(
      'src', '/assets/characters/dugeuni.png',
    )
    expect(generated.querySelector('img')).toHaveAttribute(
      'src', '/assets/character-prototype/bodies/basic.png',
    )
  })
})
