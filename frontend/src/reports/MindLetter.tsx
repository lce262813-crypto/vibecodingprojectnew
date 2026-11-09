import { monthDay } from './reportFormat'
import type { ReflectionResult, ReportPeriod } from './reportsApi'

interface MindLetterProps {
  period: ReportPeriod
  custom: boolean
  result: ReflectionResult | null
  isWriting: boolean
  onRequest: () => void
  onSelectDate: (date: string) => void
}

function SafetyNote({ safety }: { safety: NonNullable<ReflectionResult['safety']> }) {
  return (
    <div className="mind-letter__safety">
      <p>{safety.message}</p>
      <ul>
        {safety.resources.map((item) => (
          <li key={item.phone}><a href={`tel:${item.phone.replaceAll('-', '')}`}><b>{item.name}</b> {item.phone}</a><span>{item.description}</span></li>
        ))}
      </ul>
    </div>
  )
}

/** The reflection is written like a short letter, set apart from the statistics around it. */
export function MindLetter({ period, custom, result, isWriting, onRequest, onSelectDate }: MindLetterProps) {
  const span = custom ? '이 기간' : period === 'month' ? '한 달' : '한 주'
  const letter = result?.letter

  return (
    <section aria-labelledby="mind-letter-title" className="mind-letter mt-6">
      <p className="eyebrow">MOZI의 마음 편지</p>
      <h2 className="mind-letter__title" id="mind-letter-title">{letter?.title ?? `${span}의 기록을 읽고 편지를 써 드릴게요`}</h2>
      {!letter && (
        <>
          <p className="mind-letter__intro">진단이나 평가가 아니라, 남겨 주신 기록을 함께 돌아보는 글이에요. 버튼을 누르면 이 기간의 일기 일부와 감정 기록이 편지를 쓰기 위해 AI에 전달돼요.</p>
          <button className="button button--primary" disabled={isWriting} onClick={onRequest} type="button">{isWriting ? '편지를 쓰는 중…' : '마음 편지 받기'}</button>
        </>
      )}
      {letter && (
        <>
          <div className="mind-letter__body">
            <p>{letter.empathy}</p>
            {letter.insight && <p>{letter.insight}</p>}
            {letter.underlying_need && <div className="mind-letter__need"><b>감정 뒤의 마음</b><p>{letter.underlying_need}</p></div>}
            <p>{letter.encouragement}</p>
          </div>
          {result?.safety && <SafetyNote safety={result.safety} />}
          {letter.evidence_dates.length > 0 && (
            <div className="mind-letter__dates">
              <span>참고한 날</span>
              {letter.evidence_dates.map((date) => <button key={date} onClick={() => onSelectDate(date)} type="button">{monthDay(date)}</button>)}
            </div>
          )}
          {letter.limitations.map((item) => <p className="mind-letter__fine" key={item}>{item}</p>)}
          {!result?.safety && <p className="mind-letter__support">마음을 누군가와 더 깊이 나누고 싶을 때는 전문 상담도 도움이 될 수 있어요. 정신건강 상담전화 <a href="tel:15770199">1577-0199</a>로 가까운 센터를 안내받을 수 있어요.</p>}
          <p className="mind-letter__fine">{result?.privacy_note}</p>
          {!result?.safety && <button className="button button--secondary mt-4" disabled={isWriting} onClick={onRequest} type="button">{isWriting ? '편지를 쓰는 중…' : '다시 써 보기'}</button>}
        </>
      )}
    </section>
  )
}
