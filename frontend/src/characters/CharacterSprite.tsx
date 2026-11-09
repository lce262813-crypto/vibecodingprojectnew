import { SoftFriendCanvas } from './concepts/SoftFriendCanvas'
import { EMOTION_KEYS, type EmotionKey } from './pixel/palette'

export interface CharacterSpriteData {
  name: string
  behavior_type: string
  appearance: {
    body_part: string
    color: string
    eyebrow_part: string
    eye_part: string
    mouth_part: string
    mutation_part: string | null
    renderer_version?: string | null
    render_spec?: {
      seed: number
      primary_emotion: string
      primary_intensity: number
      secondary_emotion: string | null
      secondary_intensity: number
      secondary_relation?: 'companion' | 'residual' | 'relief' | 'reversal' | null
      silhouette_id: string
      decoration_id: string | null
      animal_feature_id?: string | null
      objects?: string[]
    } | null
  }
}

interface CharacterSpriteProps {
  character: CharacterSpriteData
  size?: 'calendar' | 'small' | 'large'
  walking?: boolean
  accessoryPart?: string | null
  effectParts?: string[]
}

const LEGACY_COLOR_EMOTION: Record<string, EmotionKey> = {
  '#f6cf65': 'joy', '#f39a78': 'anger', '#f3a9c8': 'excitement',
  '#a9d7c3': 'calm', '#afc9ee': 'sadness', '#c2afe8': 'anxiety',
  '#a8e1e0': 'moved', '#b8b8c8': 'fatigue',
}

function emotionFromLegacyCharacter(character: CharacterSpriteData): EmotionKey {
  const appearance = character.appearance
  const expressive: Record<string, EmotionKey> = {
    brow_angry: 'anger', brow_low: 'irritation', brow_asym: 'confusion',
    brow_sad: 'sadness', brow_worry: 'anxiety', eye_half: 'fatigue',
    eye_closed: 'calm', eye_sparkle: 'excitement', eye_watery: 'moved',
    eye_teary: 'sadness', eye_blank: 'lethargy', eye_wide: 'embarrassment',
  }
  return expressive[appearance.eyebrow_part] ?? expressive[appearance.eye_part]
    ?? LEGACY_COLOR_EMOTION[appearance.color.toLowerCase()]
    ?? ({ active: 'joy', calm: 'calm', still: 'lethargy', agitated: 'anger', unstable: 'anxiety', tired: 'fatigue' }[character.behavior_type] as EmotionKey | undefined)
    ?? 'calm'
}

function intensityFromLegacyCharacter(character: CharacterSpriteData): number {
  const { eyebrow_part, eye_part, mouth_part } = character.appearance
  if (mouth_part === 'mouth_shout' || eye_part === 'eye_glare') return 90
  if (eyebrow_part === 'brow_angry' || eye_part === 'eye_teary') return 70
  return 50
}

export function CharacterSprite({
  character,
  size = 'large',
  walking = false,
  accessoryPart = null,
}: CharacterSpriteProps) {
  const spec = character.appearance.render_spec
  const primary = spec?.primary_emotion
  const secondary = spec?.secondary_emotion
  const validPrimary = EMOTION_KEYS.includes(primary as EmotionKey)
  const validSecondary = EMOTION_KEYS.includes(secondary as EmotionKey)
  const softSpec = spec && validPrimary
    ? {
        primary: { key: primary as EmotionKey, score: spec.primary_intensity },
        secondary: validSecondary ? { key: secondary as EmotionKey, score: spec.secondary_intensity } : null,
      }
    : { primary: { key: emotionFromLegacyCharacter(character), score: intensityFromLegacyCharacter(character) }, secondary: null }
  // The calendar's size comes from its CSS, which steps with the width of the screen.
  const scale = size === 'calendar' ? 3 : size === 'small' ? 2 : 4

  return (
    <div
      className={`character-sprite character-sprite--${size} character-sprite--${character.behavior_type}`}
      data-character-source={spec && validPrimary ? 'soft-friend-v1' : 'soft-friend-legacy'}
    >
      <SoftFriendCanvas
        spec={softSpec}
        label={`${character.name} character`}
        scale={scale}
        walking={walking}
        secondaryRelation={spec?.secondary_relation ?? null}
        item={accessoryPart ?? spec?.decoration_id ?? null}
      />
    </div>
  )
}
