import { EMOTION_CHART_COLORS, EMOTION_LABELS } from '../characters/emotionCatalog'
import { percent } from './reportFormat'
import type { EmotionCount } from './reportsApi'

const appearances = (item: EmotionCount) => item.appearance_count ?? item.count

/** How many diaries each emotion appeared in, most frequent first. */
export function EmotionCountChart({ counts, diaryCount }: { counts: EmotionCount[]; diaryCount: number }) {
  const sorted = [...counts].sort((a, b) => appearances(b) - appearances(a) || b.count - a.count)
  const shown = sorted.filter((item) => appearances(item) > 0)
  const unseen = sorted.filter((item) => appearances(item) === 0)

  return (
    <>
      <ul className="count-chart">
        {shown.map((item) => {
          const share = percent(appearances(item), diaryCount)
          return (
            <li key={item.emotion}>
              <span className="count-chart__label">{EMOTION_LABELS[item.emotion] ?? item.emotion}</span>
              <span aria-hidden="true" className="count-chart__track"><i style={{ background: EMOTION_CHART_COLORS[item.emotion], width: `${share}%` }} /></span>
              <span className="count-chart__value"><b>{appearances(item)}번</b> {share}%</span>
            </li>
          )
        })}
      </ul>
      {unseen.length > 0 && <p className="chart-note">이번에 만나지 않은 감정 {unseen.length}가지: {unseen.map((item) => EMOTION_LABELS[item.emotion] ?? item.emotion).join(', ')}</p>}
      <p className="chart-note">일기 한 편에 여러 감정이 있으면 감정마다 한 번씩 세요. 그래서 합계가 일기 수({diaryCount}편)보다 많을 수 있고, %는 전체 일기 중 그 감정이 나타난 일기의 비율이에요.</p>
    </>
  )
}
