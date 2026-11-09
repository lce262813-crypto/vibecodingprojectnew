import type { RoomWeather } from '../weather/roomWeather'

// The room picture is split into the bare wall/floor and the window, so a tall mobile room
// can lift the window (and everything hung around it) higher than the floor furniture.
const ROOM_BACKGROUND = '/assets/room/pixel-room-wall.png'
const ROOM_WINDOW = '/assets/room/window.png'
const ANIMATED_WEATHER = new Set(['rain', 'snow', 'storm'])
const WALL_ITEMS = new Set(['picture', 'picture_star', 'poster', 'clock', 'mirror', 'curtains', 'curtains_sky', 'blinds'])
const WALL = 'emotion-room__background emotion-room__wall-item'

interface RoomBackdropProps {
  furniture?: string[]
  weather?: Pick<RoomWeather, 'kind' | 'time'>
  background?: 'cream' | 'lavender' | 'night'
}

/** The empty pixel room, the window and its weather, then each placed furniture layer. */
export function RoomBackdrop({ furniture = [], weather, background = 'cream' }: RoomBackdropProps) {
  const weatherSrc = weather && `/assets/room/weather/${weather.kind}-${weather.time}`
  return (
    <>
      <img className={`emotion-room__background room-background--${background}`} src={ROOM_BACKGROUND} alt="" aria-hidden="true" />
      <img className={WALL} src={ROOM_WINDOW} alt="" aria-hidden="true" />
      {weatherSrc && (
        <img
          aria-hidden="true"
          alt=""
          className={WALL}
          data-weather={`${weather.kind}-${weather.time}`}
          src={`${weatherSrc}.png`}
        />
      )}
      {weatherSrc && ANIMATED_WEATHER.has(weather.kind) && (
        <img
          aria-hidden="true"
          alt=""
          className={`${WALL} emotion-room__weather-alt`}
          src={`${weatherSrc}-2.png`}
        />
      )}
      {furniture.map((itemId) => (
        <img
          aria-hidden="true"
          alt=""
          className={`${WALL_ITEMS.has(itemId) ? WALL : 'emotion-room__background'} emotion-room__furniture`}
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
