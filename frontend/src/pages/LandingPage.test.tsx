import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('uses untouched original character assets in the room preview', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)

    expect(screen.getByRole('img', { name: '설렘이 원본 캐릭터' })).toHaveAttribute(
      'src', '/assets/characters/seollemi.png',
    )
    expect(screen.getByRole('img', { name: '평온이 원본 캐릭터' })).toHaveAttribute(
      'src', '/assets/characters/pyeongoni.png',
    )
    expect(screen.getByRole('img', { name: '녹초몽 원본 캐릭터' })).toHaveAttribute(
      'src', '/assets/characters/nokchomong.png',
    )
    expect(document.querySelector('.monster')).not.toBeInTheDocument()
  })
})
