import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '../api/client'
import { CharacterSprite } from '../characters/CharacterSprite'
import {
  continueEntryWithDemoAnalysis,
  deleteDiaryEntry,
  getDiaryEntry,
  retryEntryAnalysis,
  type TodayDiary,
} from './diaryApi'
import { EmotionAnalysisPanel } from './EmotionAnalysisPanel'
import { PageLoader } from '../components/PageLoader'

export function DiaryEntryDetailPage() {
  const { entryId = '' } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<TodayDiary | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    getDiaryEntry(entryId)
      .then((result) => {
        if (!active) return
        setEntry(result)
        if (result.status === 'analyzing' || result.status === 'ai_failed' || result.status === 'awaiting_confirmation') {
          return retryEntryAnalysis(entryId).then((updated) => {
            if (active) setEntry(updated)
          })
        }
      })
      .catch(() => { if (active) setError('일기를 불러오지 못했습니다.') })
    return () => { active = false }
  }, [entryId])

  useEffect(() => {
    if (entry?.status !== 'analyzing') return
    const timer = window.setTimeout(() => {
      retryEntryAnalysis(entryId)
        .then(setEntry)
        .catch(() => getDiaryEntry(entryId).then(setEntry).catch(() => setError('분석 상태를 불러오지 못했어요.')))
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [entry, entryId])

  async function recover(mode: 'retry' | 'demo') {
    setIsSaving(true); setError(''); setMessage('')
    try {
      const updated = mode === 'retry' ? await retryEntryAnalysis(entryId) : await continueEntryWithDemoAnalysis(entryId)
      setEntry(updated)
      if (updated.status === 'uncertain') setMessage('감정 단서가 부족해 캐릭터를 만들지 않았어요.')
      else if (updated.status === 'completed') setMessage('저장된 캐릭터를 불러왔어요.')
      else setError(updated.analysis_error || '실제 AI 분석을 완료하지 못했습니다. API 설정을 확인하거나 데모 분석을 사용할 수 있어요.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '감정 분석을 진행하지 못했습니다.')
    } finally { setIsSaving(false) }
  }

  async function handleDelete() {
    setIsDeleting(true); setError('')
    try {
      await deleteDiaryEntry(entryId)
      navigate('/diary/records', { replace: true })
    } catch { setError('일기를 삭제하지 못했습니다.'); setIsDeleting(false) }
  }


  if (!entry && !error) return <PageLoader label="일기를 불러오는 중…" />

  return (
    <main className="min-h-screen px-5 py-8">
      <section className="panel mx-auto max-w-2xl">
        <Link className="text-sm font-bold text-violet-700" to="/diary/records">← 감정 달력으로</Link>
        {error && <p className="form-error mt-5" role="alert">{error}</p>}
        {message && <p className="form-success mt-5" role="status">{message}</p>}
        {entry && <>
          <p className="eyebrow mt-7">{entry.entry_date}의 기록</p>
          {entry.character && <section className="encounter-character mt-5" aria-label="이 일기에서 태어난 캐릭터"><CharacterSprite accessoryPart={entry.character.accessory_part} character={entry.character} effectParts={entry.character.effect_parts} size="large" /><h1>{entry.character.name}</h1><p>{entry.character.feature_description}</p></section>}
          {/* Show the user's own words before the AI's interpretation. */}
          <section className="encounter-diary mt-7"><p className="eyebrow">오늘의 일기</p><h2>{entry.title || '제목 없는 일기'}</h2><p className="diary-preview">{entry.diary_text}</p><time dateTime={entry.entry_date}>{entry.entry_date}</time></section>
          {entry.status === 'analyzing' && <p className="mt-6 rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-800" role="status" aria-live="polite">MOZI가 일기를 다시 살펴보고 있어요. 잠시만 기다려 주세요.</p>}
          {entry.status === 'ai_failed' && <section className="analysis-recovery mt-6"><h1 className="text-2xl font-black">일기는 저장됐지만 분석하지 못했어요</h1><p className="mt-3 text-stone-600">실제 AI를 다시 시도하거나 데모 분석으로 기록을 완성할 수 있어요.</p>{entry.analysis_error && <p className="form-error mt-3" role="status">{entry.analysis_error}</p>}<div className="mt-5 flex flex-wrap gap-3"><button className="button button--primary" disabled={isSaving} onClick={() => void recover('retry')} type="button">실제 AI 다시 시도</button><button className="button button--secondary" disabled={isSaving} onClick={() => void recover('demo')} type="button">데모 분석 사용</button></div></section>}
          {entry.analysis && <EmotionAnalysisPanel analysis={entry.analysis} diaryText={entry.diary_text} />}

          {!confirmingDelete ? <button className="danger-link mt-9" onClick={() => setConfirmingDelete(true)} type="button">이 일기 삭제</button> : <section className="delete-confirm mt-7" role="alertdialog" aria-label="일기 삭제 확인"><strong>삭제한 원문·감정 분석·만남 기록은 복구할 수 없어요.</strong><p>캐릭터의 마지막 만남이면 도감에서도 사라지며, 같은 날짜에는 다시 작성할 수 없습니다.</p><div><button className="button button--secondary" onClick={() => setConfirmingDelete(false)} type="button">취소</button><button className="button button--danger" disabled={isDeleting} onClick={() => void handleDelete()} type="button">{isDeleting ? '삭제 중…' : '삭제하기'}</button></div></section>}
        </>}
      </section>
    </main>
  )
}
