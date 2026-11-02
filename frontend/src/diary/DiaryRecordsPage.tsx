import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CharacterSprite } from '../characters/CharacterSprite'
import { getDiaryRecords, type DiaryCalendarRecord } from './diaryApi'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

interface YearMonth { year: number; month: number }

function seoulToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function initialMonth(): YearMonth {
  const [year, month] = seoulToday().split('-').map(Number)
  return { year, month }
}

function moveMonth(current: YearMonth, amount: number): YearMonth {
  const zeroBased = current.month - 1 + amount
  return {
    year: current.year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  }
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function DiaryRecordsPage() {
  const [visible, setVisible] = useState<YearMonth>(initialMonth)
  const [records, setRecords] = useState<DiaryCalendarRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const today = seoulToday()

  useEffect(() => {
    let active = true
    getDiaryRecords(visible.year, visible.month)
      .then((result) => { if (active) setRecords(result.records) })
      .catch(() => { if (active) setError('일기 기록을 불러오지 못했습니다.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [visible])

  function showAdjacentMonth(amount: number) {
    setIsLoading(true)
    setError('')
    setVisible((current) => moveMonth(current, amount))
  }

  const recordByDate = useMemo(
    () => new Map(records.map((record) => [record.entry_date, record])),
    [records],
  )
  const firstWeekday = new Date(Date.UTC(visible.year, visible.month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(visible.year, visible.month, 0)).getUTCDate()
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => (
    index < firstWeekday ? null : index - firstWeekday + 1
  ))
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <main className="min-h-screen px-3 py-6 sm:px-8">
      <section className="mx-auto max-w-6xl">
        <p className="eyebrow">나의 기록</p>
        <div className="calendar-heading mt-3">
          <div>
            <h1 className="text-3xl font-black text-stone-900">나의 감정 달력</h1>
            <p className="mt-2 text-stone-600">일기를 쓴 날에 태어난 캐릭터를 확인해 보세요.</p>
          </div>
          <Link className="button button--primary" to="/diary">오늘 일기 쓰기</Link>
        </div>

        <section className="emotion-calendar mt-7" aria-label={`${visible.year}년 ${visible.month}월 감정 달력`}>
          <header className="emotion-calendar__controls">
            <button aria-label="이전 달" onClick={() => showAdjacentMonth(-1)} type="button">←</button>
            <h2>{visible.year}년 {visible.month}월</h2>
            <button aria-label="다음 달" onClick={() => showAdjacentMonth(1)} type="button">→</button>
          </header>

          {error && <p className="form-error m-4" role="alert">{error}</p>}
          <div className="calendar-weekdays" aria-hidden="true">
            {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="calendar-grid">
            {cells.map((day, index) => {
              if (day === null) return <span aria-hidden="true" className="calendar-day calendar-day--empty" key={`empty-${index}`} />
              const key = dateKey(visible.year, visible.month, day)
              const record = recordByDate.get(key)
              const content = (
                <>
                  <span className="calendar-day__number">{day}</span>
                  {record && (
                    <CharacterSprite
                      accessoryPart={record.character.accessory_part}
                      character={record.character}
                      effectParts={record.character.effect_parts}
                      size="calendar"
                    />
                  )}
                </>
              )
              const className = `calendar-day${key === today ? ' calendar-day--today' : ''}${record ? ' calendar-day--recorded' : ''}`
              return record ? (
                <Link
                  aria-label={`${key} 일기 보기`}
                  className={className}
                  key={key}
                  to={`/characters/${record.character.character_id}/encounters/${record.character.encounter_id}`}
                >{content}</Link>
              ) : <span className={className} key={key}>{content}</span>
            })}
          </div>
          {isLoading && <p className="calendar-loading" role="status">달력을 불러오는 중…</p>}
        </section>
      </section>
    </main>
  )
}
