import type { EmotionAnalysis } from './diaryApi'
import { EMOTION_COLOR_SEEDS, EMOTION_LABELS } from '../characters/pixel/palette'
import { SECONDARY_RELATION_LABELS } from './emotionReviewLabels'

const INTENSITIES = ['아주 약함', '약함', '보통', '강함', '매우 강함']

export function EmotionAnalysisPanel({ analysis, diaryText }: { analysis: EmotionAnalysis; diaryText?: string | null }) {
  const review = analysis.review
  return <section className="analysis-panel mt-8 text-left" aria-label="AI 감정 분석 결과">
    <h2 className="mb-4 text-xl font-black">MOZI는 이렇게 읽었어요</h2>
    {analysis.analysis_mode === 'demo' && <p className="demo-badge mb-4">AI가 아닌 규칙 기반 데모 분석</p>}
    {review ? <>
      {review.status === 'uncertain' || review.emotions.length === 0 ? <p className="rounded-2xl bg-violet-50 p-4 leading-7">일기에서 감정을 판단할 단서가 충분하지 않아 캐릭터를 만들지 않았어요. 감정을 억지로 골라내지 않았습니다.</p> : <>
        <div className="flex flex-wrap gap-2" aria-label="오늘 발견된 감정">{review.emotions.map(item => <span key={item.emotion} className="rounded-full border px-3 py-2 text-sm font-bold" style={{ borderColor: EMOTION_COLOR_SEEDS[item.emotion].base }}><i aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: EMOTION_COLOR_SEEDS[item.emotion].base }} />{EMOTION_LABELS[item.emotion]} · {INTENSITIES[item.intensity - 1]}{item.emotion === review.recommended_emotion ? ' · 주감정' : item.relation ? ` · ${SECONDARY_RELATION_LABELS[item.relation]}` : ''}</span>)}</div>
        <div className="mt-5"><h3 className="font-bold">감정 흐름</h3><p className="mt-1 text-violet-800">{review.relationship.type === 'TRANSITION' ? review.relationship.sequence.map(key => EMOTION_LABELS[key]).join(' → ') : review.emotions.map(item => EMOTION_LABELS[item.emotion]).join(' + ')}</p><p className="mt-2 leading-7 text-stone-600">{review.relationship.explanation}</p></div>
        <div className="mt-5"><h3 className="font-bold">판단 근거</h3>{review.emotions.map(item => <article key={item.emotion} className="mt-3 rounded-2xl bg-violet-50 p-4"><strong>{EMOTION_LABELS[item.emotion]}</strong>{item.evidence ? <blockquote className="my-2 whitespace-pre-wrap border-l-2 border-violet-300 pl-3">{diaryText?.includes(item.evidence) ? <>{diaryText.slice(0, diaryText.indexOf(item.evidence))}<mark className="rounded bg-amber-200 px-1">{item.evidence}</mark>{diaryText.slice(diaryText.indexOf(item.evidence) + item.evidence.length)}</> : item.evidence}</blockquote> : null}<p>{item.event}</p><p className="mt-1 text-sm text-stone-600">{item.explanation}</p></article>)}</div>
      </>}
      <p className="mt-5 text-sm leading-6 text-stone-500">강도는 일기에 표현된 감정의 세기이며, 실제 마음을 객관적으로 측정한 값은 아니에요.</p>
    </> : <>
      <div className="flex flex-wrap gap-2">{analysis.display_emotions.map(item => <span className="rounded-full bg-violet-50 px-3 py-2 font-bold" key={item.key}>{item.label}</span>)}</div>
      <p className="mt-4 leading-7">{analysis.reason || analysis.event_summary}</p>
      {analysis.uncertainty_note && <p className="mt-3">{analysis.uncertainty_note}</p>}
      <p className="mt-4 text-sm text-stone-500">이 기록은 이전 분석 방식으로 저장되어 있어 당시 결과를 그대로 보여드려요.</p>
    </>}
  </section>
}
