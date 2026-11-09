import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { movementProfile, nextMovementStep, RoomScene } from './RoomScene'

describe('RoomScene', () => {
  it('gives each emotion its own small movement style and keeps steps inside the floor', () => {
    const excited = movementProfile('excitement', 'active', 4)
    const tired = movementProfile('fatigue', 'tired', 4)
    const excitedStep = nextMovementStep({ x: 50, y: 75 }, excited, 1, 1)
    const tiredStep = nextMovementStep({ x: 50, y: 75 }, tired, 1, 1)

    expect(excitedStep.x - 50).toBeLessThanOrEqual(4.5)
    expect(tiredStep.x - 50).toBeLessThanOrEqual(1.8)
    expect(excited.chance).toBeGreaterThan(tired.chance)
    expect(excited.duration).toBeLessThan(tired.duration)
    expect(nextMovementStep({ x: 91.5, y: 87.8 }, excited, 1, 1)).toEqual({ x: 92, y: 88 })
  })

  it('shows a safe emotion dialogue when a resident is selected', () => {
    render(
      <MemoryRouter><RoomScene residents={[{
        character: {
          character_id: 'character-1', name: '꾸벅이', primary_emotion: 'fatigue',
          behavior_type: 'tired', is_resident: true, encounter_count: 1,
          is_favorite: false,
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
      }]} /></MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /꾸벅이/ }))

    const sprite = screen.getByRole('img')
    expect(sprite).toBeInstanceOf(HTMLCanvasElement)
    expect(sprite.closest('[data-character-source]')).toHaveAttribute('data-character-source', 'soft-friend-legacy')
    expect(screen.getByRole('status')).toHaveTextContent('오늘은 아무것도 안 하고 쉬고 싶어…')
    // Tapping only shows the speech bubble; no detail popup opens over the room.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('starts five residents across the floor area of the room', () => {
    const residents = Array.from({ length: 5 }, (_, index) => ({
      character: {
        character_id: `character-${index}`, name: `친구${index}`, primary_emotion: 'calm',
        behavior_type: 'still', is_resident: true, is_favorite: false, encounter_count: 1,
        first_met_on: '2026-11-02', last_met_on: '2026-11-02',
        appearance: { body_part: 'basic', palette: 'mint', color: '#A9D7C3', eyebrow_part: 'brow_soft', eye_part: 'eye_closed', mouth_part: 'mouth_soft_smile', mutation_part: null },
      },
      intensity_level: 2, accessory_part: null, effect_parts: [], dialogue_lines: ['안녕'],
    }))
    const { container } = render(<MemoryRouter><RoomScene residents={residents} /></MemoryRouter>)
    const residentsInRoom = [...container.querySelectorAll<HTMLElement>('.room-resident')]
    const xPositions = residentsInRoom.map((item) => Number.parseFloat(item.style.left))
    const yPositions = residentsInRoom.map((item) => Number.parseFloat(item.style.top))
    expect(new Set(xPositions).size).toBe(5)
    expect(Math.min(...xPositions)).toBeLessThan(15)
    expect(Math.max(...xPositions)).toBeGreaterThan(85)
    expect(Math.min(...yPositions)).toBeGreaterThanOrEqual(65)
    expect(Math.max(...yPositions)).toBeLessThanOrEqual(84)
  })

  it('keeps speech bubbles inside the room at both horizontal edges', () => {
    const residents = [0, 1].map((index) => ({
      character: {
        character_id: `edge-${index}`, name: `가장자리${index}`, primary_emotion: 'calm',
        behavior_type: 'still', is_resident: true, is_favorite: false, encounter_count: 1,
        first_met_on: '2026-11-02', last_met_on: '2026-11-02',
        appearance: { body_part: 'basic', palette: 'mint', color: '#A9D7C3', eyebrow_part: 'brow_soft', eye_part: 'eye_closed', mouth_part: 'mouth_soft_smile', mutation_part: null },
      },
      intensity_level: 2, accessory_part: null, effect_parts: [], dialogue_lines: ['오늘의 말풍선'],
    }))
    const { container } = render(<RoomScene residents={residents} />)

    fireEvent.click(screen.getByRole('button', { name: /가장자리0/ }))
    expect(container.querySelector('.room-speech')).toHaveClass('room-speech--right')
    fireEvent.click(screen.getByRole('button', { name: /가장자리1/ }))
    expect(container.querySelector('.room-speech')).toHaveClass('room-speech--left')
  })

  it('applies the saved room background without changing fixed furniture slots', () => {
    const { container } = render(<MemoryRouter><RoomScene background="night" furniture={['bed']} residents={[]} /></MemoryRouter>)
    expect(container.querySelector('.room-background--night')).toBeInTheDocument()
    expect(container.querySelector('[data-furniture="bed"]')).toBeInTheDocument()
  })
})
