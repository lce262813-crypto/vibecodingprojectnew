import { Link } from 'react-router-dom'

import { EMOTION_CHART_COLORS, EMOTION_LABELS } from '../characters/emotionCatalog'
import { WEEKDAYS, dayCellLabel, datesInRange, monthDay, weekdayIndex } from './reportFormat'
import type { EmotionReport, EmotionTrendPoint } from './reportsApi'

const label = (emotion: string) => EMOTION_LABELS[emotion] ?? emotion

interface TimelineProps {
  report: EmotionReport
  selected: string | null
  onSelect: (date: string) => void
}

function DayDetail({ point }: { point: EmotionTrendPoint }) {
  return (
    <div className="timeline-detail">
      <p className="timeline-detail__date">{monthDay(point.entry_date)}</p>
      <p className="timeline-detail__emotion">
        <i aria-hidden="true" style={{ background: EMOTION_CHART_COLORS[point.primary_emotion] }} />
        <b>{label(point.primary_emotion)}</b>
        {(point.co_emotions?.length ?? 0) > 0 && <span>함께: {point.co_emotions?.map(label).join(', ')}</span>}
      </p>
      {point.title && <p className="timeline-detail__title">{point.title}</p>}
      {point.summary && <p className="timeline-detail__summary">{point.summary}</p>}
      {point.entry_id && <Link className="timeline-detail__link" to={`/diary/entries/${point.entry_id}`}>일기 다시 읽기</Link>}
    </div>
  )
}

/** One cell per calendar day, so gaps stay visible. A day without a diary is empty, never zero. */
export function EmotionTimeline({ report, selected, onSelect }: TimelineProps) {
  const dates = datesInRange(report.start_date, report.end_date)
  const byDate = new Map(report.trend.map((point) => [point.entry_date, point]))
  const leading = weekdayIndex(report.start_date)
  const shownDate = selected && byDate.has(selected) ? selected : report.trend.at(-1)?.entry_date
  const shown = shownDate ? byDate.get(shownDate) : undefined
  const legend = [...new Set(report.trend.map((point) => point.primary_emotion))]

  return (
    <>
      <div className="timeline-grid">
        {WEEKDAYS.map((day) => <span aria-hidden="true" className="timeline-grid__weekday" key={day}>{day}</span>)}
        {Array.from({ length: leading }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
        {dates.map((date) => {
          const point = byDate.get(date)
          if (!point) return <span aria-label={`${monthDay(date)} 기록 없음`} className="timeline-day timeline-day--empty" key={date} role="img">{dayCellLabel(date)}</span>
          return (
            <button
              aria-label={`${monthDay(date)} ${label(point.primary_emotion)}`}
              aria-pressed={date === shownDate}
              className={`timeline-day${date === shownDate ? ' is-selected' : ''}`}
              key={date}
              onClick={() => onSelect(date)}
              style={{ background: EMOTION_CHART_COLORS[point.primary_emotion] }}
              type="button"
            >
              {dayCellLabel(date)}
            </button>
          )
        })}
      </div>
      <ul aria-label="색상 안내" className="timeline-legend">
        {legend.map((emotion) => <li key={emotion}><i aria-hidden="true" style={{ background: EMOTION_CHART_COLORS[emotion] }} />{label(emotion)}</li>)}
      </ul>
      {shown && <DayDetail point={shown} />}
    </>
  )
}
