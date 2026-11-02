import { apiRequest } from '../api/client'

export interface ShopItem {
  item_id: string
  name: string
  description: string
  price: number
  category: string
  slot: string
  owned: boolean
  placed: boolean
}

export interface ShopCategory {
  category_id: string
  name: string
}

export interface ShopState {
  coins: number
  categories: ShopCategory[]
  items: ShopItem[]
}

export const getShop = () => apiRequest<ShopState>('/api/shop')
export const purchaseItem = (itemId: string) =>
  apiRequest<ShopState>(`/api/shop/${itemId}/purchase`, { method: 'POST' })
export const setItemPlacement = (itemId: string, placed: boolean) =>
  apiRequest<ShopState>(`/api/shop/${itemId}/placement`, {
    method: 'PATCH', body: JSON.stringify({ placed }),
  })

export const placedFurniture = (shop: ShopState | null) =>
  shop?.items.filter((item) => item.placed).map((item) => item.item_id) ?? []
