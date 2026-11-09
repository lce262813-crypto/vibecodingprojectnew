import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '../api/client'
import { CharacterSprite } from '../characters/CharacterSprite'
import { EMOTION_LABELS } from '../characters/emotionCatalog'
import { EmotionCountChart } from './EmotionCountChart'
import { EmotionTimeline } from './EmotionTimeline'
import { GroupDistribution } from './GroupDistribution'
import { IntensityChart } from './IntensityChart'
import { MindLetter } from './MindLetter'
import { monthDay, monthRange, presetOf, rangeProblem, weekRange, type DateRange } from './reportFormat'
import { generateReflection, getEmotionReport, getOnThisDay, type EmotionReport, type OnThisDay, type PastMoment, type ReflectionResult, type ReportPeriod } from './reportsApi'
import { PageLoader } from '../components/PageLoader'

function todayInSeoul() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function PastSection({ moment }: { moment: PastMoment }) {
  return <article className="past-card"><div><p className="eyebrow">{moment.label}</p><h3>{moment.target_date}</h3></div>{moment.entries.length === 0 ? <p className="report-empty-copy">이 날짜에는 아직 남아 있는 기록이 없어요.</p> : moment.entries.map((entry) => <Link className="past-entry" key={entry.entry_id} to={`/diary/entries/${entry.entry_id}`}>{entry.character && <CharacterSprite accessoryPart={entry.character.accessory_part} character={entry.character} effectParts={entry.character.effect_parts} size="small" />}<span><strong>{entry.title || '제목 없는 일기'}</strong><small>{EMOTION_LABELS[entry.primary_emotion]}</small><p>{entry.diary_text.slice(0, 90)}</p></span></Link>)}</article>
}

/** Observations only: a change is described, never scored as better or worse. */
function comparisonNote(report: EmotionReport) {
  const before = report.previous
  const unit = report.custom_range ? '직전 같은 기간' : report.period === 'month' ? '직전 달' : '직전 주'
  const withUnit = report.custom_range ? '직전 같은 기간과' : report.period === 'month' ? '직전 달과' : '직전 주와'
  if (!before) return null
  const gap = report.diary_days - before.diary_days
  const days = gap === 0 ? `${withUnit} 같은 날수만큼 기록했어요` : `${unit}보다 기록한 날이 ${Math.abs(gap)}일 ${gap > 0 ? '많아요' : '적어요'}`
  const emotion = before.most_frequent_primary ? ` ${unit}의 대표 감정: ${EMOTION_LABELS[before.most_frequent_primary] ?? before.most_frequent_primary}` : ''
  return `${days}.${emotion}`
}

function MindSummary({ report }: { report: EmotionReport }) {
  const topGroup = [...report.group_counts].sort((a, b) => b.count - a.count)[0]
  const note = comparisonNote(report)
  return (
    <section className="mt-7">
      <h2 className="report-section-title">이번 기간의 마음 요약</h2>
      <div className="report-summary-grid">
        <article><span>기록한 날</span><strong>{report.diary_days}일</strong><small>{monthDay(report.start_date)} ~ {monthDay(report.end_date)}</small></article>
        <article><span>가장 자주 만난 감정</span><strong>{report.most_frequent_primary ? EMOTION_LABELS[report.most_frequent_primary] : '-'}</strong><small>대표 감정 기준</small></article>
        <article><span>가장 많이 머문 그룹</span><strong className="report-summary-grid__group">{topGroup?.count ? topGroup.label : '-'}</strong><small>6가지 감정 그룹 중</small></article>
      </div>
      {note && <p className="report-comparison">{note}</p>}
    </section>
  )
}

export function EmotionReportPage() {
  const [range, setRange] = useState<DateRange>(() => monthRange(todayInSeoul()))
  // What the inputs show. It only becomes the report's range once it is valid.
  const [draft, setDraft] = useState(range)
  const preset = presetOf(range)
  const draftProblem = rangeProblem(draft)
  const [report, setReport] = useState<EmotionReport | null>(null)
  const [past, setPast] = useState<OnThisDay | null>(null)
  const [reflection, setReflection] = useState<ReflectionResult | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const reflectionRequest = useRef(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isReflecting, setIsReflecting] = useState(false)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const today = todayInSeoul()
    getEmotionReport(range)
      .then((nextReport) => { if (active) { setReport(nextReport); setError('') } })
      .catch((caught) => { if (active) setError(caught instanceof ApiError ? caught.message : '감정 통계를 불러오지 못했어요. 서버 연결을 확인해 주세요.') })
      .finally(() => { if (active) setIsLoading(false) })
    getOnThisDay(range.end < today ? range.end : today)
      .then((nextPast) => { if (active) setPast(nextPast) })
      .catch(() => { if (active) setPast(null) })
    return () => { active = false }
  }, [range, loadAttempt])

  function prepareReportChange() {
    reflectionRequest.current += 1 // A letter still being written belongs to the old period.
    setIsLoading(true); setError(''); setReport(null); setPast(null); setReflection(null); setSelectedDate(null); setIsReflecting(false)
  }

  function changeRange(next: DateRange) {
    setDraft(next)
    if (rangeProblem(next) || (next.start === range.start && next.end === range.end)) return
    prepareReportChange(); setRange(next)
  }

  function choosePreset(next: ReportPeriod) {
    const today = todayInSeoul()
    const from = range.end < today ? range.end : today
    changeRange(next === 'week' ? weekRange(from) : monthRange(from))
  }

  async function handleReflection() {
    const request = reflectionRequest.current + 1
    reflectionRequest.current = request
    setIsReflecting(true); setError('')
    try {
      const result = await generateReflection(range)
      if (request === reflectionRequest.current) setReflection(result)
    } catch (caught) {
      if (request === reflectionRequest.current) setError(caught instanceof ApiError ? caught.message : '마음 편지를 쓰지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      if (request === reflectionRequest.current) setIsReflecting(false)
    }
  }

  return <main className="report-page min-h-screen px-4 py-7 sm:px-8"><section className="mx-auto max-w-6xl">
    <div className="report-heading"><div><p className="eyebrow">나의 기록 돌아보기</p><h1>감정 리포트</h1><p>저장된 감정 분석을 모아 흐름을 가볍게 살펴봐요.</p></div><div className="report-controls"><div aria-label="리포트 기간" className="period-switch"><button aria-pressed={preset === 'week'} className={preset === 'week' ? 'is-active' : ''} onClick={() => choosePreset('week')} type="button">주간</button><button aria-pressed={preset === 'month'} className={preset === 'month' ? 'is-active' : ''} onClick={() => choosePreset('month')} type="button">월간</button></div><div className="report-controls__dates"><label><span>시작일</span><input aria-invalid={Boolean(draftProblem)} max={draft.end || undefined} onChange={(event) => changeRange({ ...draft, start: event.target.value })} type="date" value={draft.start} /></label><label><span>종료일</span><input aria-invalid={Boolean(draftProblem)} min={draft.start || undefined} onChange={(event) => changeRange({ ...draft, end: event.target.value })} type="date" value={draft.end} /></label></div></div></div>
    {draftProblem && <p className="form-error mt-5" role="alert">{draftProblem}</p>}
    {error && <div className="form-error mt-5 flex flex-wrap items-center justify-between gap-3" role="alert"><span>{error}</span><button className="button button--secondary" onClick={() => { setIsLoading(true); setError(''); setLoadAttempt((value) => value + 1) }} type="button">다시 불러오기</button></div>}
    {isLoading && <PageLoader label="기록을 정리하는 중이에요…" />}
    {!isLoading && report && report.diary_count === 0 && <section className="report-empty"><span aria-hidden="true">☁</span><h2>이 기간에는 분석된 일기가 없어요</h2><p>오늘의 마음을 기록하면 이곳에 감정 흐름이 쌓여요.</p><Link className="button button--primary" to="/diary">일기 쓰기</Link></section>}
    {!isLoading && report && report.diary_count > 0 && <>
      <MindSummary report={report} />
      <MindLetter custom={Boolean(report.custom_range)} isWriting={isReflecting} onRequest={() => void handleReflection()} onSelectDate={setSelectedDate} period={report.period} result={reflection} />
      <section className="report-panel mt-6"><div className="report-panel__title"><h2>이번 기간의 감정 타임라인</h2><span>날짜별 대표 감정</span></div><EmotionTimeline onSelect={setSelectedDate} report={report} selected={selectedDate} /></section>
      <section className="report-panel mt-6"><div className="report-panel__title"><h2>감정별 등장 횟수</h2><span>일기 {report.diary_count}편 기준</span></div><EmotionCountChart counts={report.emotion_counts} diaryCount={report.diary_count} /></section>
      <section className="report-panel mt-6"><div className="report-panel__title"><h2>감정 그룹 분포</h2><span>6가지 그룹</span></div><GroupDistribution diaryCount={report.diary_count} groups={report.group_counts} /></section>
      <section className="report-panel mt-6"><div className="report-panel__title"><h2>감정 표현 강도 추이</h2><span>날짜를 누르면 자세히 보여요</span></div><IntensityChart onSelect={setSelectedDate} report={report} selected={selectedDate} today={todayInSeoul()} /></section>
      {!reflection?.safety && <section className="next-step mt-6"><h2>다음 기간을 위한 작은 제안</h2>{reflection?.letter.suggestion ? <p>{reflection.letter.suggestion}</p> : <p className="next-step__hint">마음 편지를 받으면 기록에 맞춘 작은 제안을 여기에서 볼 수 있어요.</p>}{reflection?.letter.reflection_question && <p className="next-step__question">{reflection.letter.reflection_question}</p>}</section>}
      {report.frequent_keywords.length > 0 && <section className="report-keywords mt-6"><h2>자주 등장한 키워드</h2><div>{report.frequent_keywords.map((item) => <span key={item.keyword}>#{item.keyword} <b>{item.count}</b></span>)}</div></section>}
    </>}
    {!isLoading && past && <section className="past-section mt-8"><div className="report-panel__title"><div><p className="eyebrow">과거의 오늘</p><h2>예전의 나를 만나봐요</h2></div><span>{past.anchor_date} 기준</span></div><div className="past-grid"><PastSection moment={past.one_month_ago} /><PastSection moment={past.one_year_ago} /></div></section>}
  </section></main>
}
