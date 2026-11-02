import { useEffect, useState } from 'react'

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm'
export type DayTime = 'dawn' | 'day' | 'sunset' | 'night'

export interface RoomWeather {
  kind: WeatherKind
  time: DayTime
  place: string
}

/** What is fetched and cached; the time of day is worked out from it on every tick. */
interface WeatherReport {
  kind: WeatherKind
  place: string
  sunrise: number | null
  sunset: number | null
}

const SEOUL = { latitude: 37.57, longitude: 126.98 }
const CACHE_KEY = 'mozi-room-weather-v2'
const CACHE_MINUTES = 30
const MINUTE = 60 * 1000

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈', storm: '뇌우',
}

export const TIME_LABELS: Record<DayTime, string> = {
  dawn: '해 뜨는 아침', day: '낮', sunset: '노을 지는 저녁', night: '밤',
}

const CLEAR_ICONS: Record<DayTime, string> = { dawn: '🌅', day: '☀️', sunset: '🌇', night: '🌙' }
const WEATHER_ICONS: Record<Exclude<WeatherKind, 'clear'>, string> = {
  cloudy: '☁️', rain: '🌧️', snow: '❄️', storm: '⛈️',
}

export function weatherIcon({ kind, time }: Pick<RoomWeather, 'kind' | 'time'>) {
  return kind === 'clear' ? CLEAR_ICONS[time] : WEATHER_ICONS[kind]
}

/** Map a WMO weather code (as returned by Open-Meteo) to a window scene. */
export function weatherKindFor(code: number): WeatherKind {
  if (code >= 95) return 'storm'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 2) return 'cloudy'
  return 'clear'
}

/**
 * Dawn and sunset are the glowing windows around sunrise and sunset. Without
 * sun times (no network), a typical Korean day is assumed from the clock.
 */
export function timeOfDay(
  now: Date,
  sunrise: number | null = null,
  sunset: number | null = null,
): DayTime {
  const time = now.getTime()
  if (sunrise !== null && sunset !== null) {
    if (time >= sunrise - 40 * MINUTE && time < sunrise + 40 * MINUTE) return 'dawn'
    if (time >= sunset - 50 * MINUTE && time < sunset + 30 * MINUTE) return 'sunset'
    return time > sunrise && time < sunset ? 'day' : 'night'
  }
  const hour = now.getHours()
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'day'
  if (hour >= 17 && hour < 19) return 'sunset'
  return 'night'
}

function currentPosition(): Promise<{ latitude: number; longitude: number; place: string }> {
  const seoul = { ...SEOUL, place: '서울' }
  if (!('geolocation' in navigator)) return Promise.resolve(seoul)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      // Rounded to about 1km so the exact location is never sent.
      ({ coords }) => resolve({
        latitude: Math.round(coords.latitude * 100) / 100,
        longitude: Math.round(coords.longitude * 100) / 100,
        place: '현재 위치',
      }),
      () => resolve(seoul),
      { timeout: 5000, maximumAge: 60 * MINUTE },
    )
  })
}

function readCache(): WeatherReport | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as
      (WeatherReport & { savedAt: number }) | null
    if (cached && Date.now() - cached.savedAt < CACHE_MINUTES * MINUTE) {
      return { kind: cached.kind, place: cached.place, sunrise: cached.sunrise, sunset: cached.sunset }
    }
  } catch {
    // Ignore broken cache entries.
  }
  return null
}

/** Open-Meteo returns local wall-clock times plus the place's UTC offset. */
function toEpoch(localTime: string | undefined, offsetSeconds: number): number | null {
  if (!localTime) return null
  const asUtc = Date.parse(`${localTime}:00Z`)
  return Number.isNaN(asUtc) ? null : asUtc - offsetSeconds * 1000
}

export async function fetchWeatherReport(): Promise<WeatherReport> {
  const cached = readCache()
  if (cached) return cached

  const { latitude, longitude, place } = await currentPosition()
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
    + '&current=weather_code&daily=sunrise,sunset&forecast_days=1&timezone=auto'
  const response = await fetch(url)
  if (!response.ok) throw new Error('weather unavailable')
  const body = (await response.json()) as {
    utc_offset_seconds?: number
    current?: { weather_code?: number }
    daily?: { sunrise?: string[]; sunset?: string[] }
  }
  if (typeof body.current?.weather_code !== 'number') throw new Error('weather unavailable')

  const offset = body.utc_offset_seconds ?? 0
  const report: WeatherReport = {
    kind: weatherKindFor(body.current.weather_code),
    place,
    sunrise: toEpoch(body.daily?.sunrise?.[0], offset),
    sunset: toEpoch(body.daily?.sunset?.[0], offset),
  }
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...report, savedAt: Date.now() }))
  return report
}

/** Today's real weather and time of day for the room window; clear sky until it loads or if it fails. */
export function useRoomWeather() {
  const [report, setReport] = useState<WeatherReport | null>(() => readCache())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let active = true
    fetchWeatherReport()
      .then((result) => { if (active) setReport(result) })
      .catch(() => { /* Keep the fallback sky. */ })
    const timer = window.setInterval(() => setNow(new Date()), MINUTE)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const weather: RoomWeather = {
    kind: report?.kind ?? 'clear',
    time: timeOfDay(now, report?.sunrise, report?.sunset),
    place: report?.place ?? '',
  }
  return { weather, isLive: report !== null }
}
