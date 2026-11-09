import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { CoinIcon } from '../components/CoinIcon'
import { RoomBackdrop } from '../room/RoomBackdrop'
import { useRoomWeather } from '../weather/roomWeather'
import { getShop, placedFurniture, purchaseItem, setItemPlacement, type ShopItem, type ShopState } from './shopApi'
import { PageLoader } from '../components/PageLoader'

export function ShopPage() {
  const [shop, setShop] = useState<ShopState | null>(null)
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyItem, setBusyItem] = useState('')
  const { weather } = useRoomWeather()

  useEffect(() => {
    let active = true
    getShop()
      .then((result) => {
        if (!active) return
        setShop(result)
        setCategory(result.categories[0]?.category_id ?? '')
      })
      .catch(() => { if (active) setError('상점을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [])

  async function run(item: ShopItem, action: () => Promise<ShopState>, success: string) {
    setBusyItem(item.item_id); setError(''); setMessage('')
    try {
      setShop(await action())
      setMessage(success)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '요청을 처리하지 못했습니다.')
    } finally {
      setBusyItem('')
    }
  }

  function slotOccupant(item: ShopItem) {
    return shop?.items.find((other) => other.slot === item.slot && other.placed && other.item_id !== item.item_id)
  }

  function actionFor(item: ShopItem) {
    const busy = busyItem === item.item_id
    if (!item.owned) {
      const affordable = (shop?.coins ?? 0) >= item.price
      return (
        <button
          className="button button--primary"
          disabled={busy || !affordable}
          onClick={() => void run(item, () => purchaseItem(item.item_id), `${item.name}을(를) 방에 놓았어요!`)}
          type="button"
        >
          {affordable ? `${item.price}코인에 사기` : '코인이 부족해요'}
        </button>
      )
    }
    return (
      <button
        className="button button--secondary"
        disabled={busy}
        onClick={() => void run(
          item,
          () => setItemPlacement(item.item_id, !item.placed),
          item.placed ? `${item.name}을(를) 창고에 넣었어요.` : `${item.name}을(를) 다시 놓았어요.`,
        )}
        type="button"
      >
        {item.placed ? '방에서 치우기' : '방에 놓기'}
      </button>
    )
  }

  const visibleItems = shop?.items.filter((item) => item.category === category) ?? []

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="eyebrow">가구 상점</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-stone-900">감정 방을 꾸며 볼까요?</h1>
          {shop && <span className="coin-badge" aria-label={`보유 코인 ${shop.coins}`}><CoinIcon /> {shop.coins}</span>}
        </div>
        <p className="mt-2 text-sm text-stone-500">
          일기를 쓰면 100코인, 새로운 감정 몬스터를 만나면 50코인을 더 받아요.
          같은 자리에는 가구를 하나만 놓을 수 있어요.
        </p>

        {error && <p className="form-error mt-4" role="alert">{error}</p>}
        {message && <p className="form-success mt-4" role="status">{message}</p>}

        {!shop && !error && <PageLoader label="상점 문을 여는 중…" />}
        {shop && (
          <>
            <div className="emotion-room shop-preview" aria-label="지금 나의 감정 방">
              <RoomBackdrop furniture={placedFurniture(shop)} weather={weather} />
            </div>
            <div className="shop-tabs mt-8" role="tablist" aria-label="가구 종류">
              {shop.categories.map((tab) => (
                <button
                  aria-selected={tab.category_id === category}
                  className={`shop-tab${tab.category_id === category ? ' shop-tab--active' : ''}`}
                  key={tab.category_id}
                  onClick={() => setCategory(tab.category_id)}
                  role="tab"
                  type="button"
                >
                  {tab.name}
                </button>
              ))}
            </div>
            <div className="shop-grid mt-5" role="tabpanel">
              {visibleItems.map((item) => {
                const occupant = !item.placed ? slotOccupant(item) : undefined
                return (
                  <article className={`shop-item${item.owned ? ' shop-item--owned' : ''}`} key={item.item_id}>
                    <div className="shop-item__thumb">
                      <img alt={item.name} src={`/assets/room/furniture/icons/${item.item_id}.png`} />
                    </div>
                    <div className="shop-item__body">
                      <h2>{item.name}</h2>
                      <p>{item.description}</p>
                      <span className="shop-item__price">
                        {item.owned ? (item.placed ? '방에 놓여 있어요' : '창고에 보관 중') : <><CoinIcon /> {item.price}</>}
                      </span>
                      {occupant && <p className="shop-item__swap">놓으면 {occupant.name}은(는) 창고로 가요</p>}
                      {actionFor(item)}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
        <div className="mt-8 flex justify-center">
          <Link className="button button--secondary" to="/room">감정 방으로 가기</Link>
        </div>
      </section>
    </main>
  )
}
