import {
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { ApiError } from '../api/client'
import {
  completeTutorial as completeTutorialRequest,
  deleteAccount as deleteAccountRequest,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  updateNickname as updateNicknameRequest,
  updatePreferences as updatePreferencesRequest,
} from './authApi'
import { AuthContext, type AuthContextValue } from './authContextValue'
import type { AuthStatus, User } from './types'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((currentUser) => {
        if (!active) return
        setUser(currentUser)
        setStatus('authenticated')
      })
      .catch((caught) => {
        if (!active) return
        setUser(null)
        // 4xx means "not signed in"; a network failure or 5xx means we could not tell.
        setStatus(caught instanceof ApiError && caught.status < 500 ? 'anonymous' : 'error')
      })

    return () => {
      active = false
    }
  }, [attempt])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (input) => {
        const currentUser = await loginRequest(input)
        setUser(currentUser)
        setStatus('authenticated')
      },
      logout: async () => {
        await logoutRequest()
        setUser(null)
        setStatus('anonymous')
      },
      updateNickname: async (nickname) => {
        const currentUser = await updateNicknameRequest(nickname)
        setUser(currentUser)
      },
      updatePreferences: async (input) => {
        const currentUser = await updatePreferencesRequest(input)
        setUser(currentUser)
      },
      refreshUser: async () => {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      },
      deleteAccount: async (password) => {
        await deleteAccountRequest(password)
        setUser(null)
        setStatus('anonymous')
      },
      completeTutorial: async () => {
        setUser(await completeTutorialRequest())
      },
      retryAuth: () => {
        setStatus('loading')
        setAttempt((current) => current + 1)
      },
    }),
    [status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
