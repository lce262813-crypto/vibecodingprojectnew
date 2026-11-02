import { PixelMonster, type PixelMonsterParts } from './PixelMonster'

interface CharacterSpriteData {
  name: string
  behavior_type: string
  appearance: {
    body_part: string
    color: string
    eyebrow_part: string
    eye_part: string
    mouth_part: string
    mutation_part: string | null
  }
}

interface CharacterSpriteProps {
  character: CharacterSpriteData
  size?: 'calendar' | 'small' | 'large'
  accessoryPart?: string | null
  effectParts?: string[]
}

const bodyParts: Record<string, string> = {
  basic: 'basic', wide: 'basic', plump: 'basic', tall: 'basic', low: 'basic',
  soft: 'basic', round: 'basic', drop: 'basic', square: 'basic', ears: 'basic',
}

const eyebrowParts: Record<string, string> = {
  brow_angry: 'angry', brow_low: 'angry', brow_flat: 'soft',
  brow_asym: 'asymmetric', brow_confident: 'confident',
  brow_sad: 'worried', brow_worry: 'worried', brow_up: 'worried',
  brow_soft: 'soft',
}

const eyeParts: Record<string, string> = {
  eye_sparkle: 'sparkle', eye_watery: 'teary', eye_teary: 'teary',
  eye_half: 'half', eye_side: 'half', eye_down: 'half',
  eye_mixed: 'mixed', eye_shaky: 'mixed', eye_wide: 'mixed',
  eye_blank: 'blank', eye_closed: 'blank', eye_smile: 'blank',
  eye_confident: 'half', eye_glare: 'half',
}

const mouthParts: Record<string, string> = {
  mouth_crooked: 'crooked', mouth_wavy: 'crooked', mouth_o: 'crooked',
  mouth_flat: 'flat', mouth_small: 'flat',
  mouth_frown: 'frown', mouth_shout: 'frown',
  mouth_soft_smile: 'small_smile', mouth_open_smile: 'small_smile',
  mouth_small_smile: 'small_smile', mouth_laugh: 'small_smile',
  mouth_smirk: 'smirk',
}

const decorations: Record<string, string> = { cup: 'coffee', heart: 'hearts' }
const effects: Record<string, string> = {
  sweat: 'sweat', sparkles: 'sparkle', crown_glow: 'sparkle',
  tear_glow: 'sparkle', intense_aura: 'sparkle',
}

function generatedParts(
  character: CharacterSpriteData,
  accessoryPart?: string | null,
  effectParts: string[] = [],
): PixelMonsterParts {
  const appearance = character.appearance
  return {
    body: bodyParts[appearance.body_part] ?? 'basic',
    color: appearance.color,
    eyebrow: eyebrowParts[appearance.eyebrow_part] ?? 'soft',
    eyes: eyeParts[appearance.eye_part] ?? 'blank',
    mouth: mouthParts[appearance.mouth_part] ?? 'flat',
    mutation: appearance.mutation_part === 'single_spot' ? 'single_spot' : null,
    decoration: accessoryPart ? decorations[accessoryPart] ?? null : null,
    effects: [...new Set(effectParts.map((effect) => effects[effect]).filter(Boolean))],
  }
}

export function CharacterSprite({
  character,
  size = 'large',
  accessoryPart,
  effectParts = [],
}: CharacterSpriteProps) {
  return (
    <div
      className={`character-sprite character-sprite--${size} character-sprite--${character.behavior_type}`}
      data-character-source="generated"
    >
      <PixelMonster
        alt={`${character.name} 생성 캐릭터`}
        parts={generatedParts(character, accessoryPart, effectParts)}
      />
    </div>
  )
}
