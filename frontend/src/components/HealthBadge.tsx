import { useEffect, useState } from 'react'

import { getHealth } from '../api/health'

type HealthStatus = 'checking' | 'connected' | 'unavailable'

export function HealthBadge() {
  const [status, setStatus] = useState<HealthStatus>('checking')

  useEffect(() => {
    let active = true

    getHealth()
      .then(() => {
        if (active) setStatus('connected')
      })
      .catch(() => {
        if (active) setStatus('unavailable')
      })

    return () => {
      active = false
    }
  }, [])

  const labels: Record<HealthStatus, string> = {
    checking: '백엔드 확인 중',
    connected: '백엔드 연결됨',
    unavailable: '백엔드 연결 필요',
  }

  return (
    <span className={`health-badge health-badge--${status}`} aria-live="polite">
      <span aria-hidden="true" className="health-badge__dot" />
      {labels[status]}
    </span>
  )
}
