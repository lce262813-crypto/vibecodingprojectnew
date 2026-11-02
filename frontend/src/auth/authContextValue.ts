import { createContext, useContext } from 'react'

import type { LoginInput } from './authApi'
import type { AuthStatus, User } from './types'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
  updateNickname: (nickname: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
