import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '../api/client'
import { useAuth } from '../auth/authContextValue'
import { createTodayDiary, getDiaryByDate, rewriteDemoTodayDiary, saveDiaryDraft, type DiaryStatus } from './diaryApi'
import { PageLoader } from '../components/PageLoader'

const MIN_LENGTH = 10
const MAX_LENGTH = 2000
function seoulDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(new Date(`${value}T00:00:00Z`))
}

export function DiaryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isDemoAccount = user?.is_demo_account === true
  // A diary is written once a day, on that day, so the date is always today (Seoul).
  const [entryDate] = useState(seoulDateKey)
  const [title, setTitle] = useState('')
  const [diaryText, setDiaryText] = useState('')
  const [entryId, setEntryId] = useState<string | null>(null)
  const [entryStatus, setEntryStatus] = useState<DiaryStatus>('not_started')
  const [isChecking, setIsChecking] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')
  const [error, setError] = useState('')
  const trimmedLength = diaryText.trim().length
  const canSubmit = trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH
  const isLocked = !['not_started', 'draft'].includes(entryStatus) && !isDemoAccount
  const isReplacingDemoRecord = isDemoAccount && Boolean(entryId) && !['not_started', 'draft'].includes(entryStatus)

  useEffect(() => {
    let active = true
    getDiaryByDate(entryDate)
      .then((entry) => {
        if (!active) return
        setEntryId(entry.entry_id); setEntryStatus(entry.status)
        setTitle(entry.status === 'draft' ? entry.title ?? '' : '')
        setDiaryText(entry.status === 'draft' ? entry.diary_text ?? '' : '')
        setIsDirty(false)
        if (entry.status === 'draft') setDraftMessage('임시 저장한 글을 복원했어요.')
      })
      .catch(() => { if (active) setError('오늘의 일기 상태를 불러오지 못했습니다.') })
      .finally(() => { if (active) setIsChecking(false) })
    return () => { active = false }
  }, [entryDate])

  useEffect(() => {
    if (!isDirty || isLocked || (isDemoAccount && Boolean(entryId)) || isChecking || (!title.trim() && !diaryText.trim())) return
    const timer = window.setTimeout(() => {
      saveDiaryDraft(entryDate, diaryText, title.trim())
        .then((entry) => {
          setEntryId(entry.entry_id); setEntryStatus('draft'); setIsDirty(false)
          setDraftMessage('임시 저장됐어요.')
        })
        .catch(() => setDraftMessage('임시 저장에 실패했어요. 내용을 복사해 보관해 주세요.'))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [diaryText, entryDate, entryId, isChecking, isDirty, isLocked, isDemoAccount, title])

  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSubmit && !isLocked) setIsConfirming(true)
  }

  async function handleCreate() {
    setError(''); setIsSubmitting(true)
    try {
      const created = isReplacingDemoRecord
        ? await rewriteDemoTodayDiary(diaryText, title.trim())
        : await createTodayDiary(diaryText, title.trim())
      if (created.entry_id) {
        navigate(`/diary/entries/${created.entry_id}`, { replace: true })
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '일기를 저장하지 못했습니다.')
      setIsConfirming(false)
    } finally { setIsSubmitting(false) }
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="eyebrow">나의 일기</p>
        <div className="diary-date-heading mt-3">
          <div><h1 className="text-3xl font-black text-stone-900">{formatDate(entryDate)}</h1><p className="mt-3 leading-7 text-stone-600">오늘의 사건과 마음을 자유롭게 적어 주세요. 일기는 하루에 한 번, 그날에만 쓸 수 있어요.</p></div>
        </div>

        {isChecking ? <PageLoader label="오늘의 마음을 읽어오는 중..." /> : isLocked ? (
          <section className="collection-empty mt-8">
            <h2>{entryStatus === 'deleted' ? '삭제된 기록이 있는 날짜예요' : '이미 저장된 일기가 있어요'}</h2>
            <p>{entryStatus === 'deleted' ? '삭제 후 같은 날짜에는 다시 작성할 수 없어요.' : '상세 화면에서 내용을 확인할 수 있어요.'}</p>
            {entryId && entryStatus !== 'deleted' && <Link className="button button--primary mt-5" to={`/diary/entries/${entryId}`}>저장된 일기 보기</Link>}
          </section>
        ) : (
          <form className="mt-8" onSubmit={handleConfirm}>
            <label className="form-field diary-title-field" htmlFor="diary-title"><span>일기 제목 <small>(선택)</small></span><input id="diary-title" maxLength={100} onChange={(event) => { setTitle(event.target.value); setIsDirty(true); setDraftMessage('임시 저장 대기 중…') }} placeholder="오늘을 한 마디로 적어 보세요" value={title} /></label>
            <label className="sr-only" htmlFor="diary-text">오늘의 일기</label>
            <textarea className="diary-textarea mt-5" id="diary-text" maxLength={MAX_LENGTH} onChange={(event) => { setDiaryText(event.target.value); setIsDirty(true); setDraftMessage('임시 저장 대기 중…') }} placeholder="오늘은 어떤 일이 있었나요?" value={diaryText} />
            <div className="mt-3 flex items-center justify-between gap-4 text-sm"><span className={trimmedLength < MIN_LENGTH ? 'text-stone-500' : 'text-green-700'}>최종 저장은 최소 10자 이상 작성해 주세요.</span><span className="font-bold text-stone-600">{trimmedLength} / {MAX_LENGTH}</span></div>
            {draftMessage && <p className="mt-3 text-sm font-bold text-violet-700" role="status">{draftMessage}</p>}
            {error && <p className="form-error mt-4" role="alert">{error}</p>}
            {isDemoAccount && entryId && !['not_started', 'draft'].includes(entryStatus) && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">데모 계정에서는 오늘 기록을 다시 쓸 수 있어요. 새 기록을 저장하면 기존 오늘 일기와 연결된 캐릭터, 사진이 교체됩니다.</p>}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end"><Link className="button button--secondary" to="/diary/records">일기 기록 보기</Link><button className="button button--primary" disabled={!canSubmit} type="submit">{isDemoAccount && entryId && !['not_started', 'draft'].includes(entryStatus) ? '오늘 데모 기록 바꾸기' : '저장하고 감정 확인하기'}</button></div>
          </form>
        )}
      </section>

      {isConfirming && <div className="dialog-backdrop" role="presentation"><section aria-modal="true" className="dialog-card" role="dialog"><p className="eyebrow">마지막 확인</p><h2 className="mt-3 text-2xl font-black text-stone-900">{entryDate} 기록을 저장할까요?</h2><p className="mt-4 leading-7 text-stone-600">{isDemoAccount && entryId && !['not_started', 'draft'].includes(entryStatus) ? '기존 데모 일기와 연결된 캐릭터, 사진은 새 기록으로 교체됩니다.' : '저장한 일기는 다시 고칠 수 없어요. 마지막으로 한 번 더 읽어 보세요.'}</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><button className="button button--secondary" disabled={isSubmitting} onClick={() => setIsConfirming(false)} type="button">계속 작성하기</button><button className="button button--primary" disabled={isSubmitting} onClick={() => void handleCreate()} type="button">{isSubmitting ? '저장 중…' : '저장하기'}</button></div></section></div>}
    </main>
  )
}
