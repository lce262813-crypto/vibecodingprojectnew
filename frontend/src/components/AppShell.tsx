import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/authContextValue'

const navigation = [
  { icon: '🏠', label: '나의 감정 방', shortLabel: '감정 방', to: '/room', end: true },
  { icon: '✏️', label: '일기 쓰기', shortLabel: '일기 쓰기', to: '/diary', end: true },
  { icon: '🗓️', label: '일기 기록', shortLabel: '기록', to: '/diary/records', end: false },
  { icon: '📖', label: '캐릭터 도감', shortLabel: '도감', to: '/characters', end: false },
  { icon: '🛒', label: '가구 상점', shortLabel: '상점', to: '/shop', end: true },
]

function navigationClass({ isActive }: { isActive: boolean }) {
  return `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
}

export function AppShell() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function handleLogout() {
    setError('')
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      setError('로그아웃하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink aria-label="MOZI 감정 방" className="brand" to="/room">MOZI</NavLink>
          <nav aria-label="주요 메뉴" className="app-nav app-nav--desktop">
            {navigation.map((item) => (
              <NavLink className={navigationClass} end={item.end} key={item.to} to={item.to}>
                <span aria-hidden="true" className="app-nav__icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="app-account">
            <NavLink className="app-account__nickname" to="/settings">{user?.nickname}님</NavLink>
            <button className="app-account__logout" onClick={() => void handleLogout()} type="button">로그아웃</button>
          </div>
        </div>
        {error && <p className="app-header__error" role="alert">{error}</p>}
      </header>

      <div className="app-shell__content"><Outlet /></div>

      <nav aria-label="모바일 주요 메뉴" className="app-nav app-nav--mobile">
        {navigation.map((item) => (
          <NavLink aria-label={item.label} className={navigationClass} end={item.end} key={item.to} to={item.to}>
            <span aria-hidden="true" className="app-nav__icon">{item.icon}</span>
            {item.shortLabel}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
