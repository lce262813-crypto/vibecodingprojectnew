import { describe, expect, it } from 'vitest'

import { isReminderDue, seoulNow } from './diaryReminder'

describe('seoulNow', () => {
  it('uses the Seoul date even when UTC is still on the previous day', () => {
    // 2026-12-01 00:30 in Seoul is 2026-11-30 15:30 UTC.
    expect(seoulNow(new Date('2026-11-30T15:30:00Z'))).toEqual({ day: '2026-12-01', time: '00:30' })
  })
})

describe('isReminderDue', () => {
  const evening = { day: '2026-11-04', time: '21:05' }

  it('reminds once the time has passed, even if the exact minute was missed', () => {
    expect(isReminderDue(evening, '21:00', null)).toBe(true)
    expect(isReminderDue(evening, '21:00', '2026-11-03')).toBe(true)
  })

  it('waits for the time and reminds at most once a day', () => {
    expect(isReminderDue({ day: '2026-11-04', time: '20:59' }, '21:00', null)).toBe(false)
    expect(isReminderDue(evening, '21:00', '2026-11-04')).toBe(false)
  })
})
