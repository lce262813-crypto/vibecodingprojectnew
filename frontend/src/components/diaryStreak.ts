import { getDiaryRecords, getTodayDiary, type TodayDiary } from '../diary/diaryApi'
import { getOnThisDay } from '../reports/reportsApi'

/** How many months the streak lookup may load before it stops walking back. */
const MAX_MONTHS = 24

export function shiftDay(date: string, delta: number) {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + delta)
  return day.toISOString().slice(0, 10)
}

/**
 * Consecutive days with a diary, counting back from today (or from yesterday when
 * today's diary isn't written yet, so the streak doesn't look broken in the morning).
 */
export async function countDiaryStreak(today: string, loadMonth = getDiaryRecords) {
  const recorded = new Set<string>()
  const fetched = new Set<string>()
  const ensureMonth = async (date: string) => {
    const key = date.slice(0, 7)
    if (fetched.has(key)) return
    fetched.add(key)
    const [year, month] = key.split('-').map(Number)
    const { records } = await loadMonth(year, month)
    for (const record of records) recorded.add(record.entry_date)
  }

  await ensureMonth(today)
  let day = recorded.has(today) ? today : shiftDay(today, -1)
  let streak = 0
  while (fetched.size <= MAX_MONTHS) {
    await ensureMonth(day)
    if (!recorded.has(day)) break
    streak += 1
    day = shiftDay(day, -1)
  }
  return streak
}

export interface HeaderStatus {
  today: TodayDiary
  streak: number
  /** Labels of past days (e.g. 한 달 전의 오늘) that have a diary to look back on. */
  pastLabels?: string[]
}

export async function loadHeaderStatus(): Promise<HeaderStatus> {
  const today = await getTodayDiary()
  const [streak, pastLabels] = await Promise.all([
    countDiaryStreak(today.entry_date),
    getOnThisDay(today.entry_date)
      .then((past) => [past.one_month_ago, past.one_year_ago]
        .filter((moment) => moment.entries.length > 0)
        .map((moment) => moment.label))
      .catch(() => []),
  ])
  return { today, streak, pastLabels }
}

export interface Notice {
  id: string
  text: string
  to: string
}

export function noticesFor({ today, streak, pastLabels = [] }: HeaderStatus): Notice[] {
  const date = today.entry_date
  const notices: Notice[] = []
  // A deleted day can't be rewritten, so only a day that was never started gets the reminder.
  if (today.status === 'not_started') {
    notices.push({ id: `${date}:write`, text: '오늘의 일기를 아직 쓰지 않았어요. 마음을 들려주세요.', to: '/diary' })
  }
  if (today.status === 'completed') {
    notices.push({ id: `${date}:arrived`, text: '오늘의 감정 몬스터가 도착했어요!', to: '/diary/generating' })
  }
  if (today.status === 'ai_failed') {
    notices.push({ id: `${date}:failed`, text: '감정 분석이 끝나지 않았어요. 다시 확인해 주세요.', to: '/diary/generating' })
  }
  if (streak >= 2) {
    notices.push({ id: `${date}:streak:${streak}`, text: `${streak}일 연속으로 일기를 쓰고 있어요. 멋져요!`, to: '/diary/records' })
  }
  if (pastLabels.length > 0) {
    notices.push({ id: `${date}:past`, text: `${pastLabels.join('·')} 기록이 기다리고 있어요. 다시 만나 볼까요?`, to: '/reports' })
  }
  return notices
}
