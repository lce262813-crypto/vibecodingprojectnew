import type { RoomWeather } from '../weather/roomWeather'

const ROOM_BACKGROUND = '/assets/room/pixel-room.png'
const ANIMATED_WEATHER = new Set(['rain', 'snow', 'storm'])

interface RoomBackdropProps {
  furniture?: string[]
  weather?: Pick<RoomWeather, 'kind' | 'time'>
}

/** The empty pixel room, the weather in its window, then each placed furniture layer. */
export function RoomBackdrop({ furniture = [], weather }: RoomBackdropProps) {
  const weatherSrc = weather && `/assets/room/weather/${weather.kind}-${weather.time}`
  return (
    <>
      <img className="emotion-room__background" src={ROOM_BACKGROUND} alt="" aria-hidden="true" />
      {weatherSrc && (
        <img
          aria-hidden="true"
          alt=""
          className="emotion-room__background"
          data-weather={`${weather.kind}-${weather.time}`}
          src={`${weatherSrc}.png`}
        />
      )}
      {weatherSrc && ANIMATED_WEATHER.has(weather.kind) && (
        <img
          aria-hidden="true"
          alt=""
          className="emotion-room__background emotion-room__weather-alt"
          src={`${weatherSrc}-2.png`}
        />
      )}
      {furniture.map((itemId) => (
        <img
          aria-hidden="true"
          alt=""
          className="emotion-room__background emotion-room__furniture"
          data-furniture={itemId}
          key={itemId}
          src={`/assets/room/furniture/${itemId}.png`}
        />
      ))}
      {weather && weather.time !== 'day' && (
        <div aria-hidden="true" className={`room-light room-light--${weather.time}`} data-room-light={weather.time} />
      )}
    </>
  )
}
