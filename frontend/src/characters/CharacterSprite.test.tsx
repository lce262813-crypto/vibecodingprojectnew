import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CharacterSprite } from './CharacterSprite'

describe('CharacterSprite', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('uses the soft-color friend design for saved records and keeps the legacy fallback', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const base = {
      name: '紐⑥?', behavior_type: 'active',
      appearance: {
        body_part: 'round', color: '#ffd84d', eyebrow_part: 'legacy', eye_part: 'legacy',
        mouth_part: 'legacy', mutation_part: null,
      },
    }
    const { rerender, container } = render(<CharacterSprite character={{
      ...base,
      appearance: {
        ...base.appearance,
        renderer_version: 'pixel-v5',
        render_spec: {
          seed: 17, primary_emotion: 'joy', primary_intensity: 70,
          secondary_emotion: 'anxiety', secondary_intensity: 30,
          silhouette_id: 'round', decoration_id: 'coffee', objects: ['而ㅽ뵾'],
        },
      },
    }} />)

    expect(container.querySelector('[data-character-source="soft-friend-v1"]')).toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInstanceOf(HTMLCanvasElement)

    rerender(<CharacterSprite character={base} />)
    expect(container.querySelector('[data-character-source="soft-friend-legacy"]')).toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInstanceOf(HTMLCanvasElement)
  })

  it('maps saved human-v1 records to the approved soft-color friend style', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { container } = render(<CharacterSprite character={{
      name: '?щ엺紐⑥?', behavior_type: 'calm',
      appearance: {
        body_part: 'round', color: '#ffd84d', eyebrow_part: 'legacy', eye_part: 'legacy', mouth_part: 'legacy', mutation_part: null,
        renderer_version: 'human-v1',
        render_spec: {
          seed: 21, primary_emotion: 'joy', primary_intensity: 80,
          secondary_emotion: 'sadness', secondary_intensity: 55,
          silhouette_id: 'round', decoration_id: null, objects: [],
        },
      },
    }} />)
    expect(container.querySelector('[data-character-source="soft-friend-v1"]')).toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInstanceOf(HTMLCanvasElement)
  })
})

