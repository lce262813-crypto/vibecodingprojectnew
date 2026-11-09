import { useEffect } from 'react'

import type { User } from '../auth/types'
import { getTodayDiary } from '../diary/diaryApi'

const CHECK_INTERVAL_MS = 30_000

/** The current date (YYYY-MM-DD) and time (HH:MM) in Seoul, which is what diary days use. */
export function seoulNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return { day: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` }
}

/**
 * Due once the reminder time has passed today and today hasn't been handled yet,
 * so a tab opened (or woken) after the exact minute still reminds.
 */
export function isReminderDue(now: { day: string; time: string }, reminderTime: string, handledDay: string | null) {
  return now.time >= reminderTime && handledDay !== now.day
}

/**
 * Browser notification reminding the user to write today's diary. Only for users who opted in and
 * granted permission, only while MOZI is open, at most once a day, and never once today's diary exists.
 */
export function useDiaryReminder(user: User | null) {
  useEffect(() => {
    if (!user?.notifications_enabled || !('Notification' in window) || Notification.permission !== 'granted') return
    const key = `mozi-reminder-${user.id}`
    let checking = false
    const check = async () => {
      const now = seoulNow()
      if (checking || !isReminderDue(now, user.notification_time, localStorage.getItem(key))) return
      checking = true
      try {
        const today = await getTodayDiary()
        localStorage.setItem(key, now.day)
        if (today.status === 'not_started') {
          new Notification('MOZI 감정 일기', { body: '오늘의 마음을 천천히 기록해 볼까요?' })
        }
      } catch {
        // Try again on the next check.
      } finally {
        checking = false
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [user])
}
