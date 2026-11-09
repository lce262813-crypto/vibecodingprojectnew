import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { loadHeaderStatus, noticesFor, type HeaderStatus as Status } from './diaryStreak'

const READ_KEY = 'mozi-read-notices'

function readIds(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function BellIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

/** Diary streak, notifications and the settings shortcut shown at the top of every app page. */
export function HeaderStatus() {
  const { pathname } = useLocation()
  const [status, setStatus] = useState<Status | null>(null)
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<string[]>(readIds)

  // Reload on every page change so writing a diary updates the streak and notices.
  useEffect(() => {
    let active = true
    loadHeaderStatus()
      .then((result) => { if (active) setStatus(result) })
      .catch(() => { /* The header still works without the status. */ })
    return () => { active = false }
  }, [pathname])

  const notices = status ? noticesFor(status) : []
  const hasUnread = notices.some((notice) => !read.includes(notice.id))

  function toggle() {
    if (!open && notices.length) {
      const next = [...new Set([...read, ...notices.map((notice) => notice.id)])].slice(-50)
      localStorage.setItem(READ_KEY, JSON.stringify(next))
      setRead(next)
    }
    setOpen((current) => !current)
  }

  return (
    <div className="header-status">
      {status && (
        <Link aria-label={`${status.streak}일 연속 기록`} className="streak-chip" to="/diary/records">
          <span aria-hidden="true">🔥</span>
          <strong>{status.streak}</strong>일째
        </Link>
      )}
      <div className="notice">
        <button
          aria-expanded={open}
          aria-label={hasUnread ? '알림 (새 알림 있음)' : '알림'}
          className="header-icon-button"
          onClick={toggle}
          type="button"
        >
          <BellIcon />
          {hasUnread && <span aria-hidden="true" className="notice__dot" />}
        </button>
        {open && (
          <>
            <button aria-label="알림 닫기" className="notice__backdrop" onClick={() => setOpen(false)} type="button" />
            <div className="notice__panel" role="dialog" aria-label="알림">
              <p className="notice__title">알림</p>
              {notices.length ? (
                <ul>
                  {notices.map((notice) => (
                    <li key={notice.id}><Link onClick={() => setOpen(false)} to={notice.to}>{notice.text}</Link></li>
                  ))}
                </ul>
              ) : (
                <p className="notice__empty">새 알림이 없어요.</p>
              )}
            </div>
          </>
        )}
      </div>
      <NavLink aria-label="설정" className="header-icon-button" to="/settings"><GearIcon /></NavLink>
    </div>
  )
}
