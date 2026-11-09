import { type PropsWithChildren, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from './authContextValue'
import { AppLoadingScreen } from '../brand/AppLoadingScreen'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { retryAuth, status, user } = useAuth()
  const { pathname } = useLocation()
  // Someone who was signed in here just logged out: send them to the landing page, not the login form.
  const [wasAuthenticated, setWasAuthenticated] = useState(false)
  if (status === 'authenticated' && !wasAuthenticated) setWasAuthenticated(true)

  if (status === 'loading') {
    return <AppLoadingScreen />
  }

  if (status === 'error') {
    return <AppLoadingScreen error="MOZI 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요." onRetry={retryAuth} />
  }

  if (status === 'anonymous') {
    return <Navigate to={wasAuthenticated ? '/' : '/login'} replace />
  }

  // A new member finishes the tutorial before reaching the app, on any device.
  if (user?.tutorial_completed === false && pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />
  }

  return children
}
