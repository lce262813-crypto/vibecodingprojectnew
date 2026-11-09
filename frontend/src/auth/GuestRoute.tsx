import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from './authContextValue'
import { AppLoadingScreen } from '../brand/AppLoadingScreen'

export function GuestRoute({ children }: PropsWithChildren) {
  const { status } = useAuth()

  if (status === 'loading') {
    return <AppLoadingScreen />
  }

  if (status === 'authenticated') {
    return <Navigate to="/room" replace />
  }

  // Signed out, or the session check failed: the login and signup forms still work.
  return children
}
