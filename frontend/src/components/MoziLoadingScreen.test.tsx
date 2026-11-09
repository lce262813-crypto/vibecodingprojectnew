import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MoziLoadingScreen } from './MoziLoadingScreen'

describe('MoziLoadingScreen', () => {
  afterEach(cleanup)

  it('shows the shared pixel friends and loading message', () => {
    render(<MemoryRouter><MoziLoadingScreen label="test loading" /></MemoryRouter>)

    expect(screen.getByRole('status', { name: 'test loading' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'MOZI.' })).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByText('\uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824 \uC8FC\uC138\uC694!')).toBeInTheDocument()
    expect(screen.getByText('MOZI\uAC00 \uC5F4\uC2EC\uD788 \uC900\uBE44\uD558\uACE0 \uC788\uC5B4\uC694...')).toBeInTheDocument()
  })

  it('ends the loading state and offers retry when an error is supplied', () => {
    const onRetry = vi.fn()
    render(<MemoryRouter><MoziLoadingScreen error="Request failed" onRetry={onRetry} /></MemoryRouter>)

    expect(screen.getByRole('alert')).toHaveTextContent('Request failed')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    screen.getByRole('button', { name: '\uB2E4\uC2DC \uC2DC\uB3C4' }).click()
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
