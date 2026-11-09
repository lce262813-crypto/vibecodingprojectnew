import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '../api/client'
import { AuthCard } from './AuthCard'
import { signup } from './authApi'
import { useAuth } from './authContextValue'

export function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const result = await signup({ email, password, nickname })
      try {
        // New members go straight on to the tutorial, which ProtectedRoute opens.
        await login({ email, password })
        navigate('/room', { replace: true })
      } catch {
        navigate('/login', { replace: true, state: { message: result.message } })
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : '회원가입을 처리하지 못했습니다.',
      )
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="감정 방 만들기"
      description="이메일 인증 없이 가입 후 바로 로그인할 수 있어요."
      footer={
        <>
          이미 계정이 있나요?{' '}
          <Link className="font-bold text-violet-700" to="/login">
            로그인
          </Link>
        </>
      }
    >
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
          <span>닉네임</span>
          <input
            autoComplete="nickname"
            maxLength={20}
            minLength={1}
            onChange={(event) => setNickname(event.target.value)}
            pattern="[가-힣A-Za-z0-9_]+"
            required
            value={nickname}
          />
          <small>1~20자, 한글·영문·숫자·밑줄만 사용할 수 있어요.</small>
        </label>
        <label className="form-field">
          <span>비밀번호</span>
          <input
            autoComplete="new-password"
            maxLength={64}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <small>8~64자로 입력해 주세요.</small>
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="button button--primary w-full" disabled={isSubmitting}>
          {isSubmitting ? '가입하는 중…' : '회원가입'}
        </button>
      </form>
    </AuthCard>
  )
}
