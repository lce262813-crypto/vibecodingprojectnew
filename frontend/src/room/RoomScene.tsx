import { useEffect, useState } from 'react'

import { CharacterSprite } from '../characters/CharacterSprite'
import type { RoomWeather } from '../weather/roomWeather'
import { RoomBackdrop } from './RoomBackdrop'
import type { RoomResident } from './roomApi'

interface Position { x: number; y: number }
interface RoomSceneProps { residents: RoomResident[]; furniture?: string[]; weather?: RoomWeather; background?: 'cream' | 'lavender' | 'night' }

interface MovementProfile { chance: number; stepX: number; stepY: number; duration: number }

const EMOTION_MOVEMENT: Record<string, MovementProfile> = {
  joy: { chance: 0.72, stepX: 4.2, stepY: 1.8, duration: 2.5 },
  excitement: { chance: 0.78, stepX: 4.5, stepY: 2.1, duration: 2.2 },
  pride: { chance: 0.58, stepX: 3.2, stepY: 1.2, duration: 3.1 },
  moved: { chance: 0.48, stepX: 2.6, stepY: 1, duration: 3.8 },
  calm: { chance: 0.4, stepX: 2.4, stepY: 0.8, duration: 4.4 },
  fatigue: { chance: 0.27, stepX: 1.8, stepY: 0.6, duration: 5.4 },
  lethargy: { chance: 0.2, stepX: 1.4, stepY: 0.5, duration: 6 },
  sadness: { chance: 0.32, stepX: 2, stepY: 0.7, duration: 4.8 },
  loneliness: { chance: 0.25, stepX: 1.8, stepY: 0.6, duration: 5.2 },
  disappointment: { chance: 0.28, stepX: 1.8, stepY: 0.6, duration: 5 },
  anger: { chance: 0.66, stepX: 3.5, stepY: 1.2, duration: 1.9 },
  irritation: { chance: 0.72, stepX: 3.2, stepY: 1, duration: 1.8 },
  anxiety: { chance: 0.52, stepX: 2.8, stepY: 1.5, duration: 2.6 },
  confusion: { chance: 0.56, stepX: 2.6, stepY: 1.4, duration: 2.5 },
  embarrassment: { chance: 0.38, stepX: 2, stepY: 0.8, duration: 3.6 },
  surprise: { chance: 0.62, stepX: 3, stepY: 1.5, duration: 2.1 },
}

const BEHAVIOR_MOVEMENT: Record<string, MovementProfile> = {
  active: EMOTION_MOVEMENT.joy,
  calm: EMOTION_MOVEMENT.calm,
  tired: EMOTION_MOVEMENT.fatigue,
  still: EMOTION_MOVEMENT.lethargy,
  agitated: EMOTION_MOVEMENT.anger,
  unstable: EMOTION_MOVEMENT.anxiety,
}

export function movementProfile(emotion: string | null | undefined, behavior: string, intensity: number): MovementProfile {
  const profile = EMOTION_MOVEMENT[emotion ?? ''] ?? BEHAVIOR_MOVEMENT[behavior] ?? EMOTION_MOVEMENT.calm
  // Intensity changes liveliness slightly, while keeping every step short.
  const energy = Math.max(-0.08, Math.min(0.12, (intensity - 2) * 0.025))
  return { ...profile, chance: Math.max(0.12, Math.min(0.86, profile.chance + energy)) }
}

const STARTING_SPOTS: Position[] = [
  { x: 12, y: 68 }, { x: 88, y: 76 }, { x: 50, y: 84 },
  { x: 28, y: 72 }, { x: 72, y: 80 },
]

function startingPosition(index: number): Position {
  return STARTING_SPOTS[index % STARTING_SPOTS.length]
}

export function nextMovementStep(current: Position, profile: MovementProfile, randomX: number, randomY: number): Position {
  // Each timer tick moves only a few percent of the room, never to a distant random point.
  const x = current.x + (randomX * 2 - 1) * profile.stepX
  const y = current.y + (randomY * 2 - 1) * profile.stepY
  return { x: Math.max(8, Math.min(92, x)), y: Math.max(65, Math.min(88, y)) }
}

export function RoomScene({ residents, furniture = [], weather, background = 'cream' }: RoomSceneProps) {
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [speech, setSpeech] = useState<{ id: string; text: string } | null>(null)
  const [speechTurn, setSpeechTurn] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = window.setInterval(() => {
      setPositions((current) => {
        const updated = { ...current }
        residents.forEach((resident) => {
          const behavior = resident.character.behavior_type
          const profile = movementProfile(resident.character.primary_emotion, behavior, resident.intensity_level)
          if (Math.random() < profile.chance) {
            const currentPosition = updated[resident.character.character_id] ?? startingPosition(residents.indexOf(resident))
            const others = residents.flatMap((other, otherIndex) => {
              if (other.character.character_id === resident.character.character_id) return []
              return [updated[other.character.character_id] ?? startingPosition(otherIndex)]
            })
            // Try a few nearby steps to avoid another resident; otherwise stay put for this turn.
            for (let attempt = 0; attempt < 5; attempt += 1) {
              const candidate = nextMovementStep(currentPosition, profile, Math.random(), Math.random())
              if (others.every((other) => Math.abs(candidate.x - other.x) > 8 || Math.abs(candidate.y - other.y) > 10)) {
                updated[resident.character.character_id] = candidate
                break
              }
            }
          }
        })
        return updated
      })
    }, 4200)
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
      <RoomBackdrop background={background} furniture={furniture} weather={weather} />
      {residents.map((resident, index) => {
        const id = resident.character.character_id
        const position = positions[id] ?? startingPosition(index)
        const speechAlignment = position.x <= 28 ? 'room-speech--right' : position.x >= 72 ? 'room-speech--left' : ''
        return (
          <button
            aria-label={`${resident.character.name}에게 말 걸기`}
            className={`room-resident room-resident--${resident.character.behavior_type}`}
            key={id}
            onClick={() => speak(resident)}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transitionDuration: `${movementProfile(resident.character.primary_emotion, resident.character.behavior_type, resident.intensity_level).duration}s`,
            }}
            type="button"
          >
            {speech?.id === id && <span className={`room-speech ${speechAlignment}`} role="status">{speech.text}</span>}
            <CharacterSprite
              accessoryPart={resident.accessory_part}
              character={resident.character}
              effectParts={resident.effect_parts}
              size="small"
              walking
            />
          </button>
        )
      })}
    </div>
  )
}
