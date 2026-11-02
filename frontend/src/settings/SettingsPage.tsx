import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '../api/client'
import { useAuth } from '../auth/authContextValue'

export function SettingsPage() {
  const { user, updateNickname } = useAuth()
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      await updateNickname(nickname)
      setMessage('닉네임을 변경했습니다.')
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : '닉네임을 변경하지 못했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="panel max-w-lg">
        <p className="eyebrow">계정 설정</p>
        <h1 className="mt-3 text-3xl font-black text-stone-900">내 정보</h1>
        <p className="mt-2 text-stone-600">{user?.email}</p>

        <form className="form-stack mt-7" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>닉네임</span>
            <input
              maxLength={20}
              minLength={1}
              onChange={(event) => setNickname(event.target.value)}
              pattern="[가-힣A-Za-z0-9_]+"
              required
              value={nickname}
            />
          </label>
          {message && <p className="form-success" role="status">{message}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? '변경하는 중…' : '닉네임 변경'}
          </button>
        </form>

        <Link className="button button--secondary mt-6 w-full" to="/room">
          감정 방으로 돌아가기
        </Link>
      </section>
    </main>
  )
}
