import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { ApiError } from '../api/client'
import { AuthCard } from './AuthCard'
import { useAuth } from './authContextValue'

interface LoginLocationState {
  message?: string
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const message = (location.state as LoginLocationState | null)?.message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/room', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : '로그인을 처리하지 못했습니다.',
      )
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="다시 만나서 반가워요"
      description="로그인하고 나의 감정 방으로 돌아가세요."
      footer={
        <>
          아직 계정이 없나요?{' '}
          <Link className="font-bold text-violet-700" to="/signup">
            회원가입
          </Link>
        </>
      }
    >
      {message && <p className="form-success" role="status">{message}</p>}
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>이메일</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="form-field">
          <span>비밀번호</span>
          <input
            autoComplete="current-password"
            maxLength={64}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="button button--primary w-full" disabled={isSubmitting}>
          {isSubmitting ? '로그인하는 중…' : '로그인'}
        </button>
      </form>
    </AuthCard>
  )
}
