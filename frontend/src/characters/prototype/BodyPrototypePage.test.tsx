import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { BodyPrototypePage } from './BodyPrototypePage'

describe('BodyPrototypePage', () => {
  it('shows exactly one face-free fixed body asset', () => {
    render(<MemoryRouter><BodyPrototypePage /></MemoryRouter>)

    const body = screen.getByRole('img', { name: '얼굴과 장식이 없는 공통 기본 젤리 몸통' })
    expect(body).toHaveAttribute('src', '/assets/character-prototype/bodies/basic.png')
    expect(screen.getByText('고정 1종')).toBeInTheDocument()
    expect(screen.queryByText('표정')).not.toBeInTheDocument()
  })
})
