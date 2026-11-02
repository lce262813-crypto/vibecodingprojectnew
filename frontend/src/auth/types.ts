export interface User {
  id: string
  email: string
  nickname: string
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'
