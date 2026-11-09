import { EMOTION_KEYS, type EmotionKey } from './palette'
import { renderCharacter } from './renderCharacter'
import { renderHumanCharacter } from './renderHumanCharacter'
import { renderReviewedCharacter, type ReviewDesign } from './renderReviewedCharacter'
import { SILHOUETTE_IDS, type SilhouetteId } from './silhouettes'

interface StoredCharacterData {
  appearance: {
    renderer_version?: string | null
    render_spec?: ReviewDesign & {
      seed: number; primary_emotion: string; primary_intensity: number
      secondary_emotion: string | null; secondary_intensity: number
      silhouette_id: string; decoration_id: string | null
      animal_feature_id?: string | null; objects?: string[]
    } | null
  }
}

const isEmotion = (value: string): value is EmotionKey => EMOTION_KEYS.includes(value as EmotionKey)
const isSilhouette = (value: string): value is SilhouetteId => SILHOUETTE_IDS.includes(value as SilhouetteId)
export function renderStoredPixelCharacter(character: StoredCharacterData) {
  const spec = character.appearance.render_spec
  const version = character.appearance.renderer_version
  if (!['pixel-v5', 'human-v1', 'human-review-v1'].includes(version ?? '') || !spec || !isEmotion(spec.primary_emotion)) return null
  const animalFeature = spec.animal_feature_id === 'cat_ears' || spec.animal_feature_id === 'bear_ears' ? spec.animal_feature_id : null
  const characterSpec = {
    primary: { key: spec.primary_emotion, score: spec.primary_intensity },
    secondary: spec.secondary_emotion && isEmotion(spec.secondary_emotion) ? { key: spec.secondary_emotion, score: spec.secondary_intensity } : null,
    keywords: [] as string[], seed: spec.seed,
    silhouette: isSilhouette(spec.silhouette_id) ? spec.silhouette_id : undefined,
    features: { animalFeature, decoration: null, effect: null },
  } as const
  if (version === 'human-review-v1') return renderReviewedCharacter(characterSpec, spec)
  return version === 'human-v1' ? renderHumanCharacter(characterSpec) : renderCharacter(characterSpec)
}
