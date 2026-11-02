import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/authContextValue'
import { CoinIcon } from '../components/CoinIcon'
import { getTodayDiary, type TodayDiary } from '../diary/diaryApi'
import { getShop, placedFurniture, type ShopState } from '../shop/shopApi'
import { TIME_LABELS, useRoomWeather, weatherIcon, WEATHER_LABELS } from '../weather/roomWeather'
import { RoomBackdrop } from './RoomBackdrop'
import { RoomScene } from './RoomScene'
import { getResidents, type ResidentListResponse } from './roomApi'

export function RoomPage() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [today, setToday] = useState<TodayDiary | null>(null)
  const [room, setRoom] = useState<ResidentListResponse | null>(null)
  const [shop, setShop] = useState<ShopState | null>(null)
  const { weather, isLive } = useRoomWeather()

  useEffect(() => {
    let active = true
    getTodayDiary()
      .then((result) => {
        if (active) setToday(result)
      })
      .catch(() => {
        if (active) setError('오늘의 기록 상태를 불러오지 못했습니다.')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    getResidents()
      .then((result) => { if (active) setRoom(result) })
      .catch(() => { if (active) setError('감정 방의 입주 정보를 불러오지 못했습니다.') })
    getShop()
      .then((result) => { if (active) setShop(result) })
      .catch(() => { /* The room still works without furniture. */ })
    return () => { active = false }
  }, [])

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="eyebrow">나의 감정 방</p>
        <h1 className="mt-3 text-3xl font-black text-stone-900">
          {user?.nickname}님, 오늘도 이상한 친구들이 모였어요.
        </h1>
        {error && <p className="form-error mt-4" role="alert">{error}</p>}

        <section className="today-card mt-7">
          <div>
            <p className="eyebrow">오늘의 기록</p>
            <h2 className="mt-2 text-xl font-black text-stone-900">
              {!today && '상태를 확인하고 있어요'}
              {today?.status === 'not_started' && '아직 오늘의 일기를 쓰지 않았어요'}
              {today?.status === 'analyzing' && '오늘의 일기가 확정되었어요'}
              {today?.status === 'completed' && '오늘의 감정 몬스터가 도착했어요'}
              {today?.status === 'ai_failed' && '감정 분석을 다시 확인해 주세요'}
              {today?.status === 'deleted' && '오늘의 기록을 삭제했어요'}
            </h2>
          </div>
          {today?.status === 'not_started' && (
            <Link className="button button--primary" to="/diary">오늘 일기 쓰기</Link>
          )}
          {today && today.status !== 'not_started' && today.status !== 'deleted' && (
            <Link className="button button--secondary" to="/diary/generating">
              오늘의 기록 보기
            </Link>
          )}
        </section>

        {isLive && (
          <p className="weather-chip mt-6" role="status">
            {weatherIcon(weather)} {TIME_LABELS[weather.time]}, 창밖은 {WEATHER_LABELS[weather.kind]}
            {weather.place && <span> · {weather.place}</span>}
          </p>
        )}
        {room && room.count > 0 ? (
          <RoomScene furniture={placedFurniture(shop)} residents={room.residents} weather={weather} />
        ) : (
          <div className="empty-room mt-8">
            <RoomBackdrop furniture={placedFurniture(shop)} weather={weather} />
            <p>아직 입주한 감정 몬스터가 없어요.</p>
            <span>도감에서 마음에 드는 캐릭터를 입주시켜 보세요.</span>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="button button--secondary" to="/characters">캐릭터 도감</Link>
          <Link className="button button--secondary" to="/shop">가구 상점{shop && <> · <CoinIcon /> {shop.coins}</>}</Link>
          <Link className="button button--primary" to="/room/manage">입주 관리 {room ? `${room.count}/${room.limit}` : ''}</Link>
        </div>
      </section>
    </main>
  )
}
