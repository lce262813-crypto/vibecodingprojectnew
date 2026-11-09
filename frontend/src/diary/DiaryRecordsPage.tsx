import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CharacterSprite } from '../characters/CharacterSprite'
import { MoziLoadingScreen } from '../components/MoziLoadingScreen'
import { EMOTION_LABELS } from '../characters/emotionCatalog'
import {
  getDiaryRecords,
  searchDiaryEntries,
  type DiaryCalendarRecord,
  type DiarySearchRecord,
} from './diaryApi'

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
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DiarySearchRecord[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [emotion, setEmotion] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
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

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    const normalized = query.trim()
    if (!normalized && !emotion) { setSearchResults(null); return }
    setIsSearching(true); setError('')
    try {
      const result = await searchDiaryEntries({ query: normalized, emotion })
      setSearchResults(result.records)
    } catch { setError('일기 검색에 실패했습니다.') }
    finally { setIsSearching(false) }
  }

  const recordsByDate = useMemo(
    () => records.reduce((map, record) => {
      const items = map.get(record.entry_date) ?? []
      items.push(record); map.set(record.entry_date, items)
      return map
    }, new Map<string, DiaryCalendarRecord[]>()),
    [records],
  )
  const selectedRecords = selectedDate ? recordsByDate.get(selectedDate) ?? [] : []
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

        <form className="diary-search diary-search--expanded mt-6" onSubmit={handleSearch}>
          <label className="form-field" htmlFor="diary-search"><span>제목과 본문 검색</span><input id="diary-search" maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="기억하고 싶은 단어를 입력해 보세요" value={query} /></label>
          <label className="form-field"><span>주감정</span><select aria-label="일기 감정 필터" onChange={(event) => setEmotion(event.target.value)} value={emotion}><option value="">전체 감정</option>{Object.entries(EMOTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <button className="button button--secondary" disabled={isSearching || (!query.trim() && !emotion)} type="submit">{isSearching ? '검색 중…' : '검색'}</button>
          {searchResults !== null && <button className="button button--secondary" onClick={() => { setQuery(''); setEmotion(''); setSearchResults(null) }} type="button">검색 초기화</button>}
        </form>

        {searchResults !== null && <section className="diary-search-results mt-6" aria-label="일기 검색 결과"><h2 className="text-xl font-black">검색 결과 {searchResults.length}개</h2>{searchResults.length === 0 ? <p className="mt-4 text-stone-500">일치하는 일기가 없어요.</p> : <div className="encounter-list mt-4">{searchResults.map((record) => <Link key={record.entry_id} to={`/diary/entries/${record.entry_id}`}><strong>{record.entry_date} · {record.title || '제목 없는 일기'}</strong><span>{record.primary_emotion ? `${EMOTION_LABELS[record.primary_emotion]} · ` : ''}{record.diary_preview}</span></Link>)}</div>}</section>}

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
              const dayRecords = recordsByDate.get(key) ?? []
              const record = dayRecords[0]
              const content = (
                <>
                  <span className="calendar-day__number">{day}</span>
                  {record?.character && (
                    <CharacterSprite
                      accessoryPart={record.character.accessory_part}
                      character={record.character}
                      effectParts={record.character.effect_parts}
                      size="calendar"
                    />
                  )}
                  {record && !record.character && <span className="text-xs font-bold text-violet-700">{record.status === 'uncertain' ? '감정 단서 부족' : record.status === 'ai_failed' ? '분석 실패' : '분석 대기'}</span>}
                </>
              )
              const className = `calendar-day${key === today ? ' calendar-day--today' : ''}${record ? ' calendar-day--recorded' : ''}`
              return record ? (
                <button
                  aria-label={`${key} 기록 목록 보기`}
                  className={className}
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  type="button"
                >{content}{dayRecords.length > 1 && <small>{dayRecords.length}개</small>}</button>
              ) : <span className={className} key={key}>{content}</span>
            })}
          </div>
          {isLoading && <MoziLoadingScreen variant="compact" label="Calendar records loading" />}
          {!isLoading && !error && records.length === 0 && (
            <div className="calendar-empty" role="status">
              <strong>이 달에는 아직 저장된 일기가 없어요.</strong>
              <span>기억하고 싶은 날을 골라 첫 기록을 남겨 보세요.</span>
            </div>
          )}
        </section>
        {selectedDate && <section className="date-record-list mt-6" aria-label={`${selectedDate} 기록 목록`}><div className="calendar-heading"><div><p className="eyebrow">선택한 날짜</p><h2 className="text-xl font-black">{selectedDate} 기록</h2></div><button className="button button--secondary" onClick={() => setSelectedDate('')} type="button">닫기</button></div><p className="mt-2 text-sm text-stone-500">MOZI는 현재 날짜별 대표 일기 한 편을 저장해요.</p><div className="encounter-list mt-4">{selectedRecords.map((record) => <Link key={record.entry_id} to={`/diary/entries/${record.entry_id}`}><strong>{record.title || '제목 없는 일기'}</strong><span>일기와 감정 분석 보기 →</span></Link>)}</div></section>}
      </section>
    </main>
  )
}
