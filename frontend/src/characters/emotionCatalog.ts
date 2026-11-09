export const EMOTION_LABELS: Record<string, string> = {
  joy: '기쁨', excitement: '설렘', calm: '평온', pride: '뿌듯함', moved: '감동',
  sadness: '슬픔', anger: '분노', irritation: '짜증', anxiety: '불안',
  loneliness: '외로움', disappointment: '실망', embarrassment: '당황',
  confusion: '혼란', shyness: '부끄러움', fatigue: '피로', lethargy: '무기력',
}

export const EMOTION_GROUPS: Record<string, { label: string; emotions: string[] }> = {
  achievement: { label: '행복·성취', emotions: ['joy', 'pride', 'moved'] },
  flutter: { label: '두근거림·자의식', emotions: ['excitement', 'shyness'] },
  lowEnergy: { label: '안정·저활력', emotions: ['calm', 'fatigue', 'lethargy'] },
  loss: { label: '상실·침체', emotions: ['sadness', 'loneliness', 'disappointment'] },
  anger: { label: '분노·불쾌', emotions: ['anger', 'irritation'] },
  tension: { label: '긴장·인지적 혼란', emotions: ['anxiety', 'embarrassment', 'confusion'] },
}

export function emotionGroupFor(emotion: string) {
  return Object.entries(EMOTION_GROUPS).find(([, group]) => group.emotions.includes(emotion))?.[0] ?? ''
}

// Emotion colours live in two places on purpose:
// - Character bodies (and the app icon) use the pixel palette in characters/pixel/palette.ts.
// - Report charts use these softer, flat tones so bars stay readable side by side.
export const EMOTION_CHART_COLORS: Record<string, string> = {
  joy: '#f5c84b', excitement: '#ff91bb', calm: '#86c9ad', pride: '#e7ad46', moved: '#79b9d9', sadness: '#72a8df', anger: '#ed625b', irritation: '#e88a55', anxiety: '#9d87d2', loneliness: '#7183b8', disappointment: '#555967', embarrassment: '#ff987e', confusion: '#ae8ad8', shyness: '#f2a2b5', fatigue: '#77798f', lethargy: '#91a0aa',
}
