import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RoomScene } from './RoomScene'

describe('RoomScene', () => {
  it('shows a safe emotion dialogue when a resident is selected', () => {
    render(
      <RoomScene residents={[{
        character: {
          character_id: 'character-1', name: '꾸벅이', primary_emotion: 'fatigue',
          behavior_type: 'tired', is_resident: true, encounter_count: 1,
          first_met_on: '2026-11-02', last_met_on: '2026-11-02',
          appearance: {
            body_part: 'round', palette: 'slate', color: '#B8B8C8',
            eyebrow_part: 'brow_flat', eye_part: 'eye_half',
            mouth_part: 'mouth_flat', mutation_part: null,
          },
        },
        intensity_level: 4,
        accessory_part: 'cup',
        effect_parts: ['sleep'],
        dialogue_lines: ['오늘은 아무것도 안 하고 쉬고 싶어…', '잠깐 눈을 붙일래.'],
      }]} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /꾸벅이/ }))

    const sprite = screen.getByRole('img', { name: '꾸벅이 생성 캐릭터' })
    expect(sprite.querySelector('img')).toHaveAttribute('src', '/assets/character-prototype/bodies/basic.png')
    expect(sprite.querySelector('[src$="/decorations/coffee.png"]')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('오늘은 아무것도 안 하고 쉬고 싶어…')
  })
})
