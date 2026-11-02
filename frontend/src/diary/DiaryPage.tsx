import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '../api/client'
import { createTodayDiary, getTodayDiary } from './diaryApi'

const MIN_LENGTH = 10
const MAX_LENGTH = 2000

function formatToday() {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

export function DiaryPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [diaryText, setDiaryText] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const trimmedLength = diaryText.trim().length
  const canSubmit = trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH

  useEffect(() => {
    let active = true
    getTodayDiary()
      .then((today) => {
        if (!active) return
        if (today.status !== 'not_started') {
          navigate('/diary/generating', { replace: true })
          return
        }
        setIsChecking(false)
      })
      .catch(() => {
        if (!active) return
        setError('오늘의 일기 상태를 불러오지 못했습니다.')
        setIsChecking(false)
      })

    return () => {
      active = false
    }
  }, [navigate])

  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSubmit) setIsConfirming(true)
  }

  async function handleCreate() {
    setError('')
    setIsSubmitting(true)
    try {
      await createTodayDiary(diaryText, title.trim())
      navigate('/diary/generating', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : '오늘의 일기를 확정하지 못했습니다.',
      )
      setIsConfirming(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isChecking) {
    return <p className="p-8 text-center text-stone-600">오늘의 기록을 확인하는 중…</p>
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="eyebrow">오늘의 일기</p>
        <h1 className="mt-3 text-3xl font-black text-stone-900">{formatToday()}</h1>
        <p className="mt-3 leading-7 text-stone-600">
          오늘 있었던 일과 마음을 자유롭게 적어 주세요. 캐릭터를 생성하기
          전까지는 수정할 수 있어요.
        </p>

        <form className="mt-8" onSubmit={handleConfirm}>
          <label className="form-field diary-title-field" htmlFor="diary-title">
            <span>일기 제목 <small>(선택)</small></span>
            <input
              id="diary-title"
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="오늘을 한 마디로 적어 보세요"
              value={title}
            />
          </label>
          <label className="sr-only" htmlFor="diary-text">오늘의 일기</label>
          <textarea
            className="diary-textarea mt-5"
            id="diary-text"
            maxLength={MAX_LENGTH}
            onChange={(event) => setDiaryText(event.target.value)}
            placeholder="오늘은 어떤 일이 있었나요?"
            value={diaryText}
          />
          <div className="mt-3 flex items-center justify-between gap-4 text-sm">
            <span className={trimmedLength < MIN_LENGTH ? 'text-stone-500' : 'text-green-700'}>
              최소 10자 이상 작성해 주세요.
            </span>
            <span className="font-bold text-stone-600">{trimmedLength} / {MAX_LENGTH}</span>
          </div>

          {error && <p className="form-error mt-4" role="alert">{error}</p>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link className="button button--secondary" to="/room">감정 방으로 돌아가기</Link>
            <button
              className="button button--primary"
              disabled={!canSubmit}
              type="submit"
            >
              캐릭터 생성하기
            </button>
          </div>
        </form>
      </section>

      {isConfirming && (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-describedby="confirm-description"
            aria-labelledby="confirm-title"
            aria-modal="true"
            className="dialog-card"
            role="dialog"
          >
            <p className="eyebrow">마지막 확인</p>
            <h2 className="mt-3 text-2xl font-black text-stone-900" id="confirm-title">
              오늘의 기록을 확정할까요?
            </h2>
            <p className="mt-4 leading-7 text-stone-600" id="confirm-description">
              생성 후에는 일기를 수정하거나 캐릭터를 다시 뽑을 수 없습니다.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                className="button button--secondary"
                disabled={isSubmitting}
                onClick={() => setIsConfirming(false)}
                type="button"
              >
                계속 작성하기
              </button>
              <button
                className="button button--primary"
                disabled={isSubmitting}
                onClick={handleCreate}
                type="button"
              >
                {isSubmitting ? '확정하는 중…' : '확정하고 생성하기'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
