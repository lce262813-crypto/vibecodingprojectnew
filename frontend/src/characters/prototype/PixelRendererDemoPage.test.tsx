import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PixelRendererDemoPage } from './PixelRendererDemoPage'

describe('PixelRendererDemoPage', () => {
  beforeEach(() => {
    // jsdom에는 canvas 2D 컨텍스트가 없다.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows layer comparisons, the 30-character automatic set, and verified silhouettes', () => {
    render(<MemoryRouter><PixelRendererDemoPage /></MemoryRouter>)

    expect(screen.getAllByRole('button', { name: /캐릭터/ })).toHaveLength(192)
    expect(screen.getByText('6개 감정 그룹 몸통')).toBeInTheDocument()
    expect(screen.getByText('감정별 모양과 색상')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '기쁨 기본 캐릭터' })).toHaveAttribute('width', '80')
    expect(screen.getByRole('checkbox', { name: '감정 이펙트' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '위아래 움직임' })).toBeChecked()
    expect(screen.getByText('#FFD84D')).toBeInTheDocument()
    expect(screen.getByText('감정 기반 선택형 캐릭터')).toBeInTheDocument()
    expect(screen.getByText('일기에서 태어나는 소품 40종')).toBeInTheDocument()
    expect(screen.getByText(/같은 seed 재현 ✓ 일치/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '분노 매우 강함 캐릭터' })).toHaveAttribute('width', '64')
    expect(screen.getByRole('img', { name: '무기력 매우 강함 캐릭터' })).toHaveAttribute('width', '64')
    expect(screen.getAllByText(/연결 1 · 구멍 0 · 튐 0 · 파임 0 · 대칭/)).toHaveLength(10)
  }, 15_000)

  it('loads a card into the playground', () => {
    render(<MemoryRouter><PixelRendererDemoPage /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /“벚꽃 산책” 캐릭터/ }))
    expect(screen.getByLabelText('일기 내용에서 소품 찾기')).toHaveValue('벚꽃 산책')
    expect(screen.getByLabelText('주 감정')).toHaveValue('joy')

    fireEvent.click(screen.getByRole('button', { name: /보조 감정 \+ 손 소품 \+ 이펙트 캐릭터/ }))
    expect(screen.getByLabelText('이펙트')).toHaveValue('sparkle')
    expect(screen.getByLabelText('랜덤 seed')).toHaveValue(418)
  }, 15_000)

  it('can turn the emotion effect layer and its animation off', () => {
    render(<MemoryRouter><PixelRendererDemoPage /></MemoryRouter>)

    fireEvent.click(screen.getByRole('checkbox', { name: '감정 이펙트' }))
    expect(screen.getByRole('img', { name: '기쁨 기본 캐릭터' })).toHaveAttribute('width', '64')
    expect(screen.getByRole('checkbox', { name: '위아래 움직임' })).toBeDisabled()
  })
})
