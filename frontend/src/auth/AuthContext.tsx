import {
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  updateNickname as updateNicknameRequest,
} from './authApi'
import { AuthContext, type AuthContextValue } from './authContextValue'
import type { AuthStatus, User } from './types'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((currentUser) => {
        if (!active) return
        setUser(currentUser)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setStatus('anonymous')
      })

    return () => {
      active = false
    }
  }, [])

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
    }),
    [status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
