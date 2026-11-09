import { createContext, useContext } from 'react'

import type { LoginInput, PreferencesInput } from './authApi'
import type { AuthStatus, User } from './types'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
  updateNickname: (nickname: string) => Promise<void>
  updatePreferences: (input: PreferencesInput) => Promise<void>
  refreshUser: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  /** Save the finished tutorial on the account; rejects if the server did not store it. */
  completeTutorial: () => Promise<void>
  /** Check the session again after a failed start-up check. */
  retryAuth: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
