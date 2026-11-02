import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ShopPage } from './ShopPage'

function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const categories = [
  { category_id: 'window', name: '창문' },
  { category_id: 'furniture', name: '가구' },
]

const item = (itemId: string, price: number, category: string, slot: string, owned = false) => ({
  item_id: itemId, name: `${itemId} 가구`, description: '설명', price, category, slot, owned, placed: owned,
})

function mockApi(...shopStates: unknown[]) {
  const shopCalls: string[] = []
  const fetchMock = vi.fn((url: string) => {
    if (url.includes('open-meteo')) {
      return Promise.resolve(response({ current: { weather_code: 61, is_day: 1 } }))
    }
    shopCalls.push(url)
    return Promise.resolve(response(shopStates[Math.min(shopCalls.length - 1, shopStates.length - 1)]))
  })
  vi.stubGlobal('fetch', fetchMock)
  return shopCalls
}

describe('ShopPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('shows items by category and buys affordable furniture', async () => {
    const shopCalls = mockApi(
      { coins: 150, categories, items: [item('curtains', 100, 'window', 'window'), item('blinds', 400, 'window', 'window'), item('bed', 400, 'furniture', 'bed')] },
      { coins: 50, categories, items: [item('curtains', 100, 'window', 'window', true), item('blinds', 400, 'window', 'window'), item('bed', 400, 'furniture', 'bed')] },
    )

    render(<MemoryRouter><ShopPage /></MemoryRouter>)

    expect(await screen.findByLabelText('보유 코인 150')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '창문' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('bed 가구')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '코인이 부족해요' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '100코인에 사기' }))

    expect(await screen.findByLabelText('보유 코인 50')).toBeInTheDocument()
    expect(shopCalls[1]).toContain('/api/shop/curtains/purchase')
    expect(screen.getByText('놓으면 curtains 가구은(는) 창고로 가요')).toBeInTheDocument()
    const preview = screen.getByLabelText('지금 나의 감정 방')
    expect(preview.querySelector('[data-furniture="curtains"]')).toHaveAttribute(
      'src', '/assets/room/furniture/curtains.png',
    )
    expect(await screen.findByRole('img', { name: 'curtains 가구' })).toHaveAttribute(
      'src', '/assets/room/furniture/icons/curtains.png',
    )

    fireEvent.click(screen.getByRole('tab', { name: '가구' }))
    expect(screen.getByText('bed 가구')).toBeInTheDocument()
    expect(screen.queryByText('blinds 가구')).not.toBeInTheDocument()
  })
})
