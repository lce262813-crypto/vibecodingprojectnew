import { describe, expect, it } from 'vitest'

import type { DiaryCalendarResponse } from '../diary/diaryApi'
import { countDiaryStreak, noticesFor, shiftDay } from './diaryStreak'

function loaderFor(dates: string[]) {
  return async (year: number, month: number): Promise<DiaryCalendarResponse> => ({
    year,
    month,
    records: dates
      .filter((date) => date.startsWith(`${year}-${String(month).padStart(2, '0')}`))
      .map((date) => ({ entry_id: date, entry_date: date, title: null, character: {} as never })),
  })
}

describe('countDiaryStreak', () => {
  it('counts back across a month boundary', async () => {
    const dates = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']
    expect(await countDiaryStreak('2026-11-02', loaderFor(dates))).toBe(4)
  })

  it('keeps yesterday’s streak while today is still unwritten', async () => {
    expect(await countDiaryStreak('2026-11-03', loaderFor(['2026-11-01', '2026-11-02']))).toBe(2)
  })

  it('stops at a missing day', async () => {
    expect(await countDiaryStreak('2026-11-04', loaderFor(['2026-11-01', '2026-11-03', '2026-11-04']))).toBe(2)
    expect(await countDiaryStreak('2026-11-04', loaderFor([]))).toBe(0)
  })

  it('shifts days in UTC without skipping', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('noticesFor', () => {
  it('reminds to write and celebrates a streak', () => {
    const today = { status: 'not_started', entry_date: '2026-11-04' } as never
    expect(noticesFor({ today, streak: 3 }).map((notice) => notice.to)).toEqual(['/diary', '/diary/records'])
    expect(noticesFor({ today, streak: 1 })).toHaveLength(1)
  })

  it('does not ask to rewrite a deleted day and points past diaries to the report', () => {
    const deleted = { status: 'deleted', entry_date: '2026-11-04' } as never
    expect(noticesFor({ today: deleted, streak: 0 })).toEqual([])
    const past = noticesFor({ today: deleted, streak: 0, pastLabels: ['한 달 전의 오늘'] })
    expect(past).toEqual([expect.objectContaining({ to: '/reports', text: expect.stringContaining('한 달 전의 오늘') })])
  })
})
