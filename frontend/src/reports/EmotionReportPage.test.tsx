import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EMOTION_CHART_COLORS } from '../characters/emotionCatalog'
import { EmotionReportPage } from './EmotionReportPage'
import { daysBetween, datesInRange, monthRange, presetOf, stageOf, weekRange } from './reportFormat'
import type { EmotionReport, EmotionTrendPoint, ReflectionResult } from './reportsApi'

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const EMOTIONS = ['joy', 'excitement', 'calm', 'pride', 'moved', 'sadness', 'anger', 'irritation', 'anxiety', 'loneliness', 'disappointment', 'embarrassment', 'confusion', 'shyness', 'fatigue', 'lethargy']
const emptyReport: EmotionReport = {
  period: 'month', start_date: '2026-11-01', end_date: '2026-11-30', diary_days: 0, diary_count: 0,
  most_frequent_primary: null, average_intensity: null, frequent_keywords: [], trend: [],
  emotion_counts: EMOTIONS.map((emotion) => ({ emotion, count: 0, appearance_count: 0 })),
  group_counts: [{ group: 'achievement', label: '행복·성취', count: 0 }, { group: 'low_energy', label: '안정·저활력', count: 0 }],
}
const past = {
  anchor_date: '2026-11-04',
  one_month_ago: { label: '한 달 전의 오늘', target_date: '2026-10-04', entries: [] },
  one_year_ago: { label: '일 년 전의 오늘', target_date: '2025-11-04', entries: [] },
}

function point(entry_date: string, primary_emotion: string, expression_intensity: number, extra: Partial<EmotionTrendPoint> = {}): EmotionTrendPoint {
  return { entry_date, diary_count: 1, primary_emotion, average_intensity: expression_intensity * 25, expression_intensity, ...extra }
}

const report: EmotionReport = {
  ...emptyReport, diary_days: 3, diary_count: 3, most_frequent_primary: 'joy', average_intensity: 68,
  emotion_counts: emptyReport.emotion_counts.map((item) => ({
    ...item,
    count: item.emotion === 'joy' ? 2 : item.emotion === 'fatigue' ? 1 : 0,
    appearance_count: item.emotion === 'joy' ? 2 : item.emotion === 'fatigue' ? 3 : 0,
  })),
  group_counts: [{ group: 'achievement', label: '행복·성취', count: 2 }, { group: 'low_energy', label: '안정·저활력', count: 1 }],
  frequent_keywords: [{ keyword: '산책', count: 2 }],
  trend: [
    point('2026-11-03', 'joy', 2, { entry_id: 'entry-1', title: '산책한 날', summary: '공원을 걸었다', co_emotions: ['fatigue'] }),
    point('2026-11-04', 'joy', 3),
    point('2026-11-20', 'fatigue', 4),
  ],
  previous: { start_date: '2026-10-01', end_date: '2026-10-31', diary_days: 1, most_frequent_primary: 'calm', average_expression_intensity: 2 },
}

const letter: ReflectionResult = {
  reflection: '본문', provider: 'openai', model_name: 'test', privacy_note: '일기 일부를 전달했어요.', safety: null,
  letter: {
    title: '조용히 걸은 달', empathy: '공원을 걸으며 하루를 정리하셨네요.', insight: '걷는 시간이 쉼이었을 수도 있겠어요.', underlying_need: '잠시 멈추고 싶은 마음이 있었을 수도 있어요.',
    encouragement: '그 시간을 챙기신 것이 보여요.', suggestion: '다음 달에도 짧게 걸어 보시면 어떨까요?',
    reflection_question: '가장 편안했던 순간은 언제였나요?', evidence_dates: ['2026-11-03'], limitations: ['기록이 적어요.'],
  },
}

function stub(body: EmotionReport, reflection: unknown = letter) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/reflection')) return Promise.resolve(response(reflection))
    return Promise.resolve(response(url.includes('on-this-day') ? past : body))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function open(body: EmotionReport, reflection?: unknown) {
  const fetchMock = stub(body, reflection)
  const view = render(<MemoryRouter><EmotionReportPage /></MemoryRouter>)
  if (body.diary_count > 0) await screen.findByText('감정 표현 강도 추이')
  return { fetchMock, view }
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('EmotionReportPage', () => {
  it('keeps the report visible when the past-moment request fails', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('on-this-day')) return Promise.resolve(response({ detail: 'past unavailable' }, 503))
      return Promise.resolve(response(report))
    }))
    render(<MemoryRouter><EmotionReportPage /></MemoryRouter>)
    expect((await screen.findAllByRole('heading', { level: 2 })).length).toBeGreaterThan(0)
  })
  it('shows the server error and lets the user retry loading the report', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(response({ detail: '리포트 조회 실패' }, 503)))
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><EmotionReportPage /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('리포트 조회 실패')
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
  })

  it('shows a natural empty state without offering a letter', async () => {
    await open(emptyReport)
    expect(await screen.findByText('이 기간에는 분석된 일기가 없어요')).toBeInTheDocument()
    expect(screen.getByText('한 달 전의 오늘')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '마음 편지 받기' })).not.toBeInTheDocument()
  })

  it('lays the sections out in the planned order', async () => {
    const { view } = await open(report)
    const headings = [...view.container.querySelectorAll('h2')].map((item) => item.textContent)
    expect(headings.slice(0, 7)).toEqual([
      '이번 기간의 마음 요약', expect.stringContaining('편지를 써 드릴게요'), '이번 기간의 감정 타임라인',
      '감정별 등장 횟수', '감정 그룹 분포', '감정 표현 강도 추이', '다음 기간을 위한 작은 제안',
    ])
  })

  it('describes the change from last period without judging it', async () => {
    await open(report)
    expect(screen.getByText('직전 달보다 기록한 날이 2일 많아요. 직전 달의 대표 감정: 평온')).toBeInTheDocument()
  })

  it('sorts emotions by appearances and explains how they are counted', async () => {
    const { view } = await open(report)
    const rows = [...view.container.querySelectorAll('.count-chart li')].map((item) => item.textContent)
    expect(rows).toEqual(['피로3번 100%', '기쁨2번 67%'])
    expect(screen.getByText(/이번에 만나지 않은 감정 14가지/)).toBeInTheDocument()
    expect(screen.getByText(/합계가 일기 수\(3편\)보다 많을 수 있고/)).toBeInTheDocument()
  })

  it('shows every group with its share and states the basis', async () => {
    await open(report)
    expect(screen.getByRole('img', { name: /감정 그룹 분포: 행복·성취 67%, 안정·저활력 33%/ })).toBeInTheDocument()
    expect(screen.getByText(/합계는 일기 수와 같아요/)).toBeInTheDocument()
  })

  it('keeps days without a diary empty on the timeline', async () => {
    const { view } = await open(report)
    const timeline = view.container.querySelector('.timeline-grid') as HTMLElement
    expect(within(timeline).getAllByRole('button')).toHaveLength(3)
    expect(within(timeline).getByRole('img', { name: '11월 5일 기록 없음' })).toBeInTheDocument()
    expect(within(timeline).getByRole('button', { name: '11월 3일 기쁨' })).toBeInTheDocument()
  })

  it('shows the emotion and summary of the chosen day', async () => {
    await open(report)
    fireEvent.click(screen.getByRole('button', { name: '11월 3일 기쁨' }))
    expect(screen.getByText('공원을 걸었다')).toBeInTheDocument()
    expect(screen.getByText('함께: 피로')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '일기 다시 읽기' })).toHaveAttribute('href', '/diary/entries/entry-1')
  })

  it('shows no selection on the intensity line until a day is chosen', async () => {
    const { view } = await open(report)
    expect(view.container.querySelector('.intensity-chart__marker')).toBeNull()
    expect(view.container.querySelector('.intensity-chart__tip')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '11월 4일 기쁨 표현 강도 3단계' }))
    expect(view.container.querySelectorAll('.intensity-chart__marker')).toHaveLength(1)
    expect(view.container.querySelector('.intensity-chart__tip')).toHaveTextContent('11월 4일기쁨 · 3단계')
  })

  it('keeps real date gaps and never treats a missing day as zero', async () => {
    vi.useFakeTimers({ now: new Date('2026-12-05T12:00:00+09:00'), toFake: ['Date'] })
    const { view } = await open(report)
    const lines = [...view.container.querySelectorAll('.intensity-chart__plot line')]
    expect(lines).toHaveLength(2)
    expect(lines[0]).not.toHaveClass('is-gap') // 3rd to 4th are neighbours.
    expect(lines[1]).toHaveClass('is-gap') // The 5th to the 19th have no diary.
    // Positions follow the calendar: the 20th sits 19/29 of the way along, not at 2/2.
    expect(Number(lines[1].getAttribute('x2'))).toBeCloseTo((19 / 29) * 100)
    // Stage 4 is the top of the chart (y 0) and stage 1 is the bottom; there is no zero to fall to.
    expect(Number(lines[1].getAttribute('y2'))).toBe(0)
  })

  it('lines the stage labels up with the values they name', async () => {
    const { view } = await open(report)
    const labels = [...view.container.querySelectorAll<HTMLElement>('.intensity-chart__stages span')]
    expect(labels.map((item) => [item.textContent, Math.round(parseFloat(item.style.top))])).toEqual([
      ['매우 강함', 0], ['강함', 33], ['명확함', 67], ['약함', 100],
    ])
  })

  it('ends the axis at today while the month is still going', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T12:00:00+09:00'), toFake: ['Date'] })
    const { view } = await open(report)
    const lines = [...view.container.querySelectorAll('.intensity-chart__plot line')]
    expect(Number(lines[1].getAttribute('x2'))).toBeCloseTo((19 / 24) * 100)
  })

  it('colours one dot per diary by its emotion and names those colours', async () => {
    const { view } = await open(report)
    const dots = [...view.container.querySelectorAll<HTMLElement>('.intensity-chart__dot')]
    expect(dots).toHaveLength(report.trend.length)
    dots.forEach((dot, index) => {
      const swatch = document.createElement('i')
      swatch.style.background = EMOTION_CHART_COLORS[report.trend[index].primary_emotion]
      expect(dot.style.background).toBe(swatch.style.background)
    })
    const legend = screen.getByRole('list', { name: '점 색깔이 나타내는 감정' })
    expect(within(legend).getAllByRole('listitem')[0]).toHaveTextContent('기쁨')
  })

  it('says the stages are an estimate from writing', async () => {
    await open(report)
    expect(screen.getByText(/글에서 추정한 표현의 세기예요/)).toBeInTheDocument()
  })

  it('asks before sending anything and shows the letter apart from the numbers', async () => {
    const { fetchMock } = await open(report)
    expect(screen.getByText(/일기 일부와 감정 기록이 편지를 쓰기 위해 AI에 전달돼요/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: '마음 편지 받기' }))
    expect(await screen.findByRole('heading', { name: '조용히 걸은 달' })).toBeInTheDocument()
    expect(screen.getByText('공원을 걸으며 하루를 정리하셨네요.')).toBeInTheDocument()
    expect(screen.getByText('걷는 시간이 쉼이었을 수도 있겠어요.')).toBeInTheDocument()
    expect(screen.getByText('감정 뒤의 마음')).toBeInTheDocument()
    expect(screen.getByText('잠시 멈추고 싶은 마음이 있었을 수도 있어요.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1577-0199' })).toHaveAttribute('href', 'tel:15770199')
    expect(screen.getByText('기록이 적어요.')).toBeInTheDocument()
    expect(screen.getByText('일기 일부를 전달했어요.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('moves the suggestion and question into the next-step section', async () => {
    await open(report)
    expect(screen.getByText(/기록에 맞춘 작은 제안을 여기에서/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '마음 편지 받기' }))
    expect(await screen.findByText('다음 달에도 짧게 걸어 보시면 어떨까요?')).toBeInTheDocument()
    expect(screen.getByText('가장 편안했던 순간은 언제였나요?')).toBeInTheDocument()
  })

  it('jumps to a day the letter refers to', async () => {
    const { view } = await open(report)
    fireEvent.click(screen.getByRole('button', { name: '마음 편지 받기' }))
    fireEvent.click(await screen.findByRole('button', { name: '11월 3일' }))
    expect(view.container.querySelector('.timeline-day.is-selected')).toHaveTextContent('3')
    expect(screen.getByText('공원을 걸었다')).toBeInTheDocument()
  })

  it('leaves out a missing insight on a short period', async () => {
    await open(report, { ...letter, letter: { ...letter.letter, insight: null, reflection_question: null } })
    fireEvent.click(screen.getByRole('button', { name: '마음 편지 받기' }))
    await screen.findByRole('heading', { name: '조용히 걸은 달' })
    expect(screen.queryByText('걷는 시간이 쉼이었을 수도 있겠어요.')).not.toBeInTheDocument()
  })

  it('shows support contacts, not advice, when a diary raises concern', async () => {
    await open(report, {
      ...letter, provider: 'safety', model_name: null,
      letter: { ...letter.letter, title: '먼저 전하고 싶어요', insight: null, suggestion: null, reflection_question: null, evidence_dates: [] },
      safety: { message: '혼자 있지 말아 주세요.', resources: [{ name: '자살예방 상담전화', phone: '109', description: '24시간' }, { name: '정신건강 위기상담', phone: '1577-0199', description: '연결' }] },
    })
    fireEvent.click(screen.getByRole('button', { name: '마음 편지 받기' }))
    expect(await screen.findByRole('link', { name: /자살예방 상담전화 109/ })).toHaveAttribute('href', 'tel:109')
    expect(screen.getByRole('link', { name: /1577-0199/ })).toHaveAttribute('href', 'tel:15770199')
    expect(screen.queryByText(/작은 제안/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 써 보기' })).not.toBeInTheDocument()
    expect(screen.queryByText(/전문 상담도 도움이/)).not.toBeInTheDocument()
  })

  it('reports a failed letter without losing the charts', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/reflection')) return Promise.resolve(response({ detail: 'AI 회고를 생성하지 못했습니다.' }, 503))
      return Promise.resolve(response(url.includes('on-this-day') ? past : report))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><EmotionReportPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: '마음 편지 받기' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('감정 표현 강도 추이')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '마음 편지 받기' })).toBeEnabled()
  })

  it('drops a letter that finishes after the period changed', async () => {
    let finish: (value: Response) => void = () => {}
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/reflection')) return new Promise<Response>((resolve) => { finish = resolve })
      return Promise.resolve(response(url.includes('on-this-day') ? past : report))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><EmotionReportPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: '마음 편지 받기' }))
    fireEvent.click(screen.getByRole('button', { name: '주간' }))
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(3))
    await screen.findByText('감정 표현 강도 추이')
    finish(response(letter))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByRole('heading', { name: '조용히 걸은 달' })).not.toBeInTheDocument()
  })

  it('still shows reports saved before these fields existed', async () => {
    const old: EmotionReport = {
      ...report, previous: undefined,
      emotion_counts: report.emotion_counts.map(({ emotion, count }) => ({ emotion, count })),
      trend: [{ entry_date: '2026-11-03', diary_count: 1, primary_emotion: 'joy', average_intensity: 60 }],
    }
    const { view } = await open(old)
    expect(view.container.querySelectorAll('.count-chart li')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /11월 3일 .* 표현 강도 3단계/ })).toBeInTheDocument()
  })
})

describe('choosing dates', () => {
  const urls = (mock: ReturnType<typeof stub>) => mock.mock.calls.map(([input]) => String(input)).filter((url) => url.includes('/emotions'))
  const changeDate = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })

  it('asks for exactly the dates the user picked', async () => {
    const { fetchMock } = await open(report)
    changeDate('시작일', '2026-10-15')
    await waitFor(() => expect(urls(fetchMock).at(-1)).toContain('start_date=2026-10-15'))
    expect(urls(fetchMock).at(-1)).toContain(`end_date=${(screen.getByLabelText('종료일') as HTMLInputElement).value}`)
    expect(screen.getByRole('button', { name: '주간' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '월간' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('uses the same dates for the letter', async () => {
    const { fetchMock } = await open(report)
    changeDate('시작일', '2026-10-15')
    await waitFor(() => expect(urls(fetchMock).at(-1)).toContain('start_date=2026-10-15'))
    fireEvent.click(await screen.findByRole('button', { name: '마음 편지 받기' }))
    await screen.findByRole('heading', { name: '조용히 걸은 달' })
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/reflection?start_date=2026-10-15')
  })

  it('keeps the week and month buttons as shortcuts that fill in both dates', async () => {
    const { fetchMock } = await open(report)
    fireEvent.click(screen.getByRole('button', { name: '주간' }))
    expect(screen.getByRole('button', { name: '주간' })).toHaveAttribute('aria-pressed', 'true')
    const start = (screen.getByLabelText('시작일') as HTMLInputElement).value
    await waitFor(() => expect(urls(fetchMock).at(-1)).toContain(`period=week&anchor=${start}`))
    expect(presetOf({ start, end: (screen.getByLabelText('종료일') as HTMLInputElement).value })).toBe('week')
  })

  it('waits for a valid range and explains what is wrong', async () => {
    const { fetchMock } = await open(report)
    const before = urls(fetchMock).length
    const end = (screen.getByLabelText('종료일') as HTMLInputElement).value
    changeDate('시작일', '2099-01-01')
    expect(await screen.findByRole('alert')).toHaveTextContent('시작일은 종료일보다 늦을 수 없어요.')
    changeDate('시작일', '2020-01-01')
    expect(screen.getByRole('alert')).toHaveTextContent('최대 1년')
    expect(urls(fetchMock)).toHaveLength(before)
    expect((screen.getByLabelText('종료일') as HTMLInputElement).value).toBe(end)
    expect(screen.getByText('감정 표현 강도 추이')).toBeInTheDocument()
  })

  it('compares a chosen range with the same length before it', async () => {
    await open({ ...report, custom_range: true })
    expect(screen.getByText(/직전 같은 기간보다 기록한 날이 2일 많아요/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /이 기간의 기록을 읽고/ })).toBeInTheDocument()
  })

  it('labels the 1st with its month on a range across months', async () => {
    await open({ ...report, start_date: '2026-10-20', end_date: '2026-11-10', custom_range: true })
    expect(screen.getByRole('img', { name: '11월 1일 기록 없음' })).toHaveTextContent('11.1')
  })
})

describe('report dates', () => {
  it('works out weeks from Monday and whole months', () => {
    expect(weekRange('2026-11-04')).toEqual({ start: '2026-11-02', end: '2026-11-08' })
    expect(weekRange('2026-11-01')).toEqual({ start: '2026-10-26', end: '2026-11-01' })
    expect(monthRange('2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
    expect(presetOf({ start: '2026-11-02', end: '2026-11-08' })).toBe('week')
    expect(presetOf({ start: '2026-11-01', end: '2026-11-30' })).toBe('month')
    expect(presetOf({ start: '2026-11-03', end: '2026-11-08' })).toBeNull()
  })

  it('counts real calendar days across a month end', () => {
    expect(daysBetween('2026-11-30', '2026-12-01')).toBe(1)
    expect(datesInRange('2026-02-27', '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01'])
  })

  it('converts older scores to the same stages as the server', () => {
    expect([1, 25, 26, 50, 51, 75, 76, 100].map((score) => stageOf({ entry_date: '', diary_count: 1, primary_emotion: 'joy', average_intensity: score }))).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
  })
})
