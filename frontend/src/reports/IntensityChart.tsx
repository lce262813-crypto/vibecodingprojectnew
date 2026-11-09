import { EMOTION_CHART_COLORS, EMOTION_LABELS } from '../characters/emotionCatalog'
import { STAGE_LABELS, daysBetween, monthDay, shortDate, stageOf, datesInRange } from './reportFormat'
import type { EmotionReport } from './reportsApi'

const STAGES = [4, 3, 2, 1]

interface IntensityChartProps {
  report: EmotionReport
  today: string
  selected: string | null
  onSelect: (date: string) => void
}

const label = (emotion: string) => EMOTION_LABELS[emotion] ?? emotion

/** The axis stops at today, so a month in progress fills the chart instead of ending in empty future days. */
function lastChartDate({ end_date: end, trend }: EmotionReport, today: string) {
  const lastRecord = trend.at(-1)?.entry_date ?? ''
  const shownUntil = end < today ? end : today
  return lastRecord > shownUntil ? lastRecord : shownUntil
}

/** Most frequent first, so the legend starts with what the period was mostly about. */
function emotionsByFrequency(report: EmotionReport) {
  const counts = new Map<string, number>()
  report.trend.forEach((point) => counts.set(point.primary_emotion, (counts.get(point.primary_emotion) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([emotion]) => emotion)
}

/** Written intensity over real calendar time, with each diary as a dot in its emotion's colour.
 *  Days without a diary stay missing: neighbours join with a faint dashed line, never a dip to zero. */
export function IntensityChart({ report, today, selected, onSelect }: IntensityChartProps) {
  const lastDate = lastChartDate(report, today)
  const span = Math.max(daysBetween(report.start_date, lastDate), 1)
  const points = report.trend.map((point) => {
    const stage = stageOf(point)
    const day = daysBetween(report.start_date, point.entry_date)
    return { point, stage, day, x: (day / span) * 100, y: ((4 - stage) / 3) * 100 }
  })
  const segments = points.slice(1).map((end, index) => ({ start: points[index], end, joined: end.day - points[index].day === 1 }))
  const chosen = points.find((item) => item.point.entry_date === selected)
  // About six labels at most, on whole weeks where the range allows it.
  const tickStep = span < 7 ? 1 : span < 14 ? 2 : span <= 49 ? 7 : Math.ceil(span / 6)
  const ticks = datesInRange(report.start_date, lastDate).filter((_, index) => index % tickStep === 0)
  const column = 100 / (span + 1)

  return (
    <>
      <div className="intensity-chart">
        <div aria-hidden="true" className="intensity-chart__stages">
          {STAGES.map((stage) => <span key={stage} style={{ top: `${((4 - stage) / 3) * 100}%` }}>{STAGE_LABELS[stage]}</span>)}
        </div>
        <div className="intensity-chart__plot">
          {STAGES.map((stage) => <i aria-hidden="true" className="intensity-chart__grid" key={stage} style={{ top: `${((4 - stage) / 3) * 100}%` }} />)}
          <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
            {segments.map(({ start, end, joined }) => (
              <line className={joined ? '' : 'is-gap'} key={end.day} vectorEffect="non-scaling-stroke" x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
            ))}
          </svg>
          {points.map((item) => (
            <i
              aria-hidden="true"
              className={`intensity-chart__dot${points.length > 45 ? ' is-small' : ''}`}
              key={item.day}
              style={{ background: EMOTION_CHART_COLORS[item.point.primary_emotion], left: `${item.x}%`, top: `${item.y}%` }}
            />
          ))}
          {points.map((item) => (
            <button
              aria-label={`${monthDay(item.point.entry_date)} ${label(item.point.primary_emotion)} 표현 강도 ${item.stage}단계`}
              aria-pressed={item.point.entry_date === selected}
              className="intensity-chart__hit"
              key={item.day}
              onClick={() => onSelect(item.point.entry_date)}
              style={{ left: `${item.x}%`, width: `clamp(1.5rem, ${column}%, 3rem)` }}
              type="button"
            />
          ))}
          {chosen && (
            <>
              <i aria-hidden="true" className="intensity-chart__marker" style={{ background: EMOTION_CHART_COLORS[chosen.point.primary_emotion], left: `${chosen.x}%`, top: `${chosen.y}%` }} />
              <p className={`intensity-chart__tip${chosen.x > 66 ? ' is-right' : chosen.x < 34 ? ' is-left' : ''}${chosen.y < 40 ? ' is-below' : ''}`} role="status" style={{ left: `${chosen.x}%`, top: `${chosen.y}%` }}>
                <b>{monthDay(chosen.point.entry_date)}</b>
                <span>{label(chosen.point.primary_emotion)} · {chosen.stage}단계</span>
              </p>
            </>
          )}
        </div>
        <div aria-hidden="true" className="intensity-chart__dates">
          {ticks.map((date) => <span key={date} style={{ left: `${(daysBetween(report.start_date, date) / span) * 100}%` }}>{shortDate(date)}</span>)}
        </div>
      </div>
      <ul aria-label="점 색깔이 나타내는 감정" className="timeline-legend">
        {emotionsByFrequency(report).map((emotion) => <li key={emotion}><i aria-hidden="true" style={{ background: EMOTION_CHART_COLORS[emotion] }} />{label(emotion)}</li>)}
      </ul>
      <p className="chart-note">점 하나가 일기 하나이고, 색은 그날의 감정이에요. 1~4단계는 글에서 추정한 표현의 세기예요. 실제 마음 상태를 잰 값은 아니에요. 기록이 없는 날은 비워 두고, 점선은 기록 사이를 이어 줄 뿐이에요.</p>
      {report.legacy_intensity_converted && <p className="chart-note">이전 기록의 강도는 25점 구간으로 환산해 함께 표시해요.</p>}
    </>
  )
}
