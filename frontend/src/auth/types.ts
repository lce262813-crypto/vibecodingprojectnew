export interface User {
  id: string
  email: string
  nickname: string
  avatar_url: string | null
  representative_character_id: string | null
  theme: 'cream' | 'lavender' | 'night'
  notifications_enabled: boolean
  notification_time: string
  room_background: 'cream' | 'lavender' | 'night'
  tutorial_completed: boolean
  tutorial_step: number
  is_demo_account?: boolean
}

// 'error': the session check itself failed (server unreachable), not a signed-out user.
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'
