import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from './authContextValue'

export function GuestRoute({ children }: PropsWithChildren) {
  const { status } = useAuth()

  if (status === 'loading') {
    return <p className="p-6 text-center text-stone-600">로그인 확인 중…</p>
  }

  if (status === 'authenticated') {
    return <Navigate to="/room" replace />
  }

  return children
}
