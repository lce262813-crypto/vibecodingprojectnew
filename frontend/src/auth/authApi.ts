import { apiRequest } from '../api/client'
import type { User } from './types'

export interface SignupInput {
  email: string
  password: string
  nickname: string
}

export interface LoginInput {
  email: string
  password: string
}

export function signup(input: SignupInput) {
  return apiRequest<{ message: string }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function login(input: LoginInput) {
  return apiRequest<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getCurrentUser() {
  return apiRequest<User>('/api/auth/me')
}

export function logout() {
  return apiRequest<void>('/api/auth/logout', { method: 'POST' })
}

export function updateNickname(nickname: string) {
  return apiRequest<User>('/api/account/nickname', {
    method: 'PATCH',
    body: JSON.stringify({ nickname }),
  })
}
