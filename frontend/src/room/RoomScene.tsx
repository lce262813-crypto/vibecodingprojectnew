import { useEffect, useState } from 'react'

import { CharacterSprite } from '../characters/CharacterSprite'
import type { RoomWeather } from '../weather/roomWeather'
import { RoomBackdrop } from './RoomBackdrop'
import type { RoomResident } from './roomApi'

interface Position { x: number; y: number }
interface RoomSceneProps { residents: RoomResident[]; furniture?: string[]; weather?: RoomWeather }

const movementChance: Record<string, number> = {
  active: 0.9, calm: 0.45, tired: 0.25, still: 0.05, agitated: 0.95, unstable: 0.9,
}

const movementSeconds: Record<string, number> = {
  active: 5, calm: 8, tired: 8, still: 12, agitated: 3, unstable: 5,
}

function chanceFor(behavior: string, intensity: number) {
  const base = movementChance[behavior] ?? 0.4
  const adjustment = intensity * 0.05
  return behavior === 'tired' || behavior === 'still'
    ? Math.max(0.03, base - adjustment)
    : Math.min(1, base + adjustment)
}

function durationFor(behavior: string, intensity: number) {
  const base = movementSeconds[behavior] ?? 6
  return behavior === 'tired' || behavior === 'still'
    ? base + intensity * 0.8
    : Math.max(1.2, base - intensity * 0.45)
}

function nextPosition(behavior: string): Position {
  const spread = behavior === 'agitated' ? 55 : 72
  return { x: 12 + Math.random() * spread, y: 68 + Math.random() * 16 }
}

export function RoomScene({ residents, furniture = [], weather }: RoomSceneProps) {
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [speech, setSpeech] = useState<{ id: string; text: string } | null>(null)
  const [speechTurn, setSpeechTurn] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = window.setInterval(() => {
      setPositions((current) => {
        const updated = { ...current }
        for (const resident of residents) {
          const behavior = resident.character.behavior_type
          if (Math.random() < chanceFor(behavior, resident.intensity_level)) {
            updated[resident.character.character_id] = nextPosition(behavior)
          }
        }
        return updated
      })
    }, 2400)
    return () => window.clearInterval(timer)
  }, [residents])

  useEffect(() => {
    if (!speech) return
    const timer = window.setTimeout(() => setSpeech(null), 3500)
    return () => window.clearTimeout(timer)
  }, [speech])

  function speak(resident: RoomResident) {
    const lines = resident.dialogue_lines
    const text = lines[speechTurn % lines.length]
    setSpeech({ id: resident.character.character_id, text })
    setSpeechTurn((current) => current + 1)
  }

  return (
    <div className="emotion-room" aria-label="입주 캐릭터가 생활하는 나의 감정 방">
      <RoomBackdrop furniture={furniture} weather={weather} />
      {residents.map((resident, index) => {
        const id = resident.character.character_id
        const position = positions[id] ?? {
          x: 12 + (index % 5) * 17,
          y: 70 + (index % 2) * 9,
        }
        return (
          <button
            aria-label={`${resident.character.name}에게 말 걸기`}
            className={`room-resident room-resident--${resident.character.behavior_type}`}
            key={id}
            onClick={() => speak(resident)}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transitionDuration: `${durationFor(resident.character.behavior_type, resident.intensity_level)}s`,
            }}
            type="button"
          >
            {speech?.id === id && <span className="room-speech" role="status">{speech.text}</span>}
            <CharacterSprite
              accessoryPart={resident.accessory_part}
              character={resident.character}
              effectParts={resident.effect_parts}
              size="small"
            />
          </button>
        )
      })}
    </div>
  )
}
