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

export function saveTutorialStep(step: number) {
  return apiRequest<User>('/api/auth/tutorial/step', { method: 'PUT', body: JSON.stringify({ step }) })
}

export function completeTutorial() {
  return apiRequest<User>('/api/auth/tutorial/complete', { method: 'POST' })
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

export interface PreferencesInput {
  representative_character_id: string | null
  theme: User['theme']
  notifications_enabled: boolean
  notification_time: string
  room_background: User['room_background']
}

export function updatePreferences(input: PreferencesInput) {
  return apiRequest<User>('/api/account/preferences', { method: 'PATCH', body: JSON.stringify(input) })
}

export function uploadAvatar(file: File) {
  return apiRequest<User>('/api/account/avatar', { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
}

export function removeAvatar() { return apiRequest<User>('/api/account/avatar', { method: 'DELETE' }) }

export interface BadgeStatus { badge_id: string; name: string; description: string; earned: boolean; progress: number; target: number }
export function getBadges() { return apiRequest<{ badges: BadgeStatus[] }>('/api/account/badges') }

export interface AccountExport {
  format_version: number
  exported_at: string
  profile: { id: string; email: string; nickname: string; created_at: string }
  diaries: unknown[]
  characters: unknown[]
  privacy_note: string
}

export function exportAccountData() {
  return apiRequest<AccountExport>('/api/account/export')
}

export function deleteAccount(password: string) {
  return apiRequest<void>('/api/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
}
