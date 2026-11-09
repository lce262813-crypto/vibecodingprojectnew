import type { RelationshipType } from './diaryApi'

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  SINGLE: '단일 감정',
  MIXED: '함께 느낀 감정',
  TRANSITION: '시간에 따른 변화',
  CONTRAST: '상황과 마음의 대비',
  UNCERTAIN: '아직 분명하지 않아요',
}

export const SECONDARY_RELATION_LABELS = {
  companion: '함께 느낀 마음',
  residual: '마음에 남은 감정',
  relief: '앞선 감정을 덜어 준 감정',
  reversal: '시간이 지나며 달라진 감정',
} as const
