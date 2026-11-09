import type { EmotionTrendPoint } from './reportsApi'

/** Calendar dates are handled as UTC so a user's time zone can never shift a day. */
function toUtc(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function daysBetween(start: string, end: string) {
  return Math.round((toUtc(end).getTime() - toUtc(start).getTime()) / 86_400_000)
}

export function datesInRange(start: string, end: string) {
  return Array.from({ length: daysBetween(start, end) + 1 }, (_, index) => {
    const date = toUtc(start)
    date.setUTCDate(date.getUTCDate() + index)
    return date.toISOString().slice(0, 10)
  })
}

export interface DateRange { start: string; end: string }

export function weekRange(date: string): DateRange {
  const start = toUtc(date)
  start.setUTCDate(start.getUTCDate() - weekdayIndex(date))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export function monthRange(date: string): DateRange {
  const day = toUtc(date)
  const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0))
  return { start: `${date.slice(0, 7)}-01`, end: end.toISOString().slice(0, 10) }
}

/** Which button a range matches, or null when the user chose the dates themselves. */
export function presetOf(range: DateRange): 'week' | 'month' | null {
  const week = weekRange(range.start)
  if (week.start === range.start && week.end === range.end) return 'week'
  const month = monthRange(range.start)
  return month.start === range.start && month.end === range.end ? 'month' : null
}

export const MAX_RANGE_DAYS = 366

export function rangeProblem(range: DateRange) {
  if (!range.start || !range.end) return '시작일과 종료일을 모두 선택해 주세요.'
  if (range.start > range.end) return '시작일은 종료일보다 늦을 수 없어요.'
  if (daysBetween(range.start, range.end) + 1 > MAX_RANGE_DAYS) return '기간은 최대 1년까지 선택할 수 있어요.'
  return ''
}

export const monthDay = (value: string) => `${toUtc(value).getUTCMonth() + 1}월 ${toUtc(value).getUTCDate()}일`
export const shortDate = (value: string) => `${toUtc(value).getUTCMonth() + 1}.${toUtc(value).getUTCDate()}`
export const dayOfMonth = (value: string) => toUtc(value).getUTCDate()
/** The 1st carries its month so a range across months stays readable. */
export const dayCellLabel = (value: string) => (dayOfMonth(value) === 1 ? shortDate(value) : String(dayOfMonth(value)))

/** Monday = 0, matching the Monday-first weeks the report periods use. */
export const weekdayIndex = (value: string) => (toUtc(value).getUTCDay() + 6) % 7
export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

/** Older points may lack a stage; the saved 0–100 score converts the same way as on the server. */
export function stageOf(point: EmotionTrendPoint) {
  return point.expression_intensity ?? Math.min(4, Math.max(1, Math.floor((point.average_intensity + 24) / 25)))
}

export const STAGE_LABELS: Record<number, string> = { 1: '약함', 2: '명확함', 3: '강함', 4: '매우 강함' }

export function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}
