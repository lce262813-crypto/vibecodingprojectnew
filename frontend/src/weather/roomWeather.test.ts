import { render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RoomBackdrop } from '../room/RoomBackdrop'
import { fetchWeatherReport, timeOfDay, weatherIcon, weatherKindFor } from './roomWeather'

const at = (hour: number, minute = 0) => new Date(2026, 10, 2, hour, minute)

describe('room weather', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('maps WMO weather codes to window scenes', () => {
    expect(weatherKindFor(0)).toBe('clear')
    expect(weatherKindFor(3)).toBe('cloudy')
    expect(weatherKindFor(45)).toBe('cloudy')
    expect(weatherKindFor(63)).toBe('rain')
    expect(weatherKindFor(81)).toBe('rain')
    expect(weatherKindFor(73)).toBe('snow')
    expect(weatherKindFor(95)).toBe('storm')
  })

  it('finds dawn, day, sunset and night from sunrise and sunset', () => {
    const sunrise = at(7, 0).getTime()
    const sunset = at(17, 30).getTime()

    expect(timeOfDay(at(5, 0), sunrise, sunset)).toBe('night')
    expect(timeOfDay(at(6, 40), sunrise, sunset)).toBe('dawn')
    expect(timeOfDay(at(12, 0), sunrise, sunset)).toBe('day')
    expect(timeOfDay(at(17, 0), sunrise, sunset)).toBe('sunset')
    expect(timeOfDay(at(17, 50), sunrise, sunset)).toBe('sunset')
    expect(timeOfDay(at(18, 30), sunrise, sunset)).toBe('night')
  })

  it('falls back to the clock without sun times', () => {
    expect(timeOfDay(at(6))).toBe('dawn')
    expect(timeOfDay(at(13))).toBe('day')
    expect(timeOfDay(at(18))).toBe('sunset')
    expect(timeOfDay(at(23))).toBe('night')
  })

  it('shows a sunset icon for a clear evening', () => {
    expect(weatherIcon({ kind: 'clear', time: 'sunset' })).toBe('🌇')
    expect(weatherIcon({ kind: 'rain', time: 'night' })).toBe('🌧️')
  })

  it('fetches Seoul weather and sun times without location access and caches them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      utc_offset_seconds: 32400,
      current: { weather_code: 71 },
      daily: { sunrise: ['2026-11-02T06:58'], sunset: ['2026-11-02T17:28'] },
    })))
    vi.stubGlobal('fetch', fetchMock)

    const first = await fetchWeatherReport()
    const second = await fetchWeatherReport()

    expect(first).toEqual({
      kind: 'snow',
      place: '서울',
      sunrise: Date.parse('2026-11-01T21:58:00Z'),
      sunset: Date.parse('2026-11-02T08:28:00Z'),
    })
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('latitude=37.57')
    expect(fetchMock.mock.calls[0][0]).toContain('daily=sunrise,sunset')
  })

  it('layers the sunset window and a warm room light', () => {
    const { container } = render(createElement(RoomBackdrop, { weather: { kind: 'clear', time: 'sunset' } }))

    expect(container.querySelector('[data-weather="clear-sunset"]')).toHaveAttribute(
      'src', '/assets/room/weather/clear-sunset.png',
    )
    expect(container.querySelector('[data-room-light="sunset"]')).toBeInTheDocument()
  })
})
