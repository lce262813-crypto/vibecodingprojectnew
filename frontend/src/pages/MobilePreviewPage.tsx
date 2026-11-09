import { useEffect, useState } from 'react'

function clockText() {
  const now = new Date()
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
}

function StatusIcons() {
  return (
    <span aria-hidden="true" className="mobile-device__icons">
      {/* Signal bars */}
      <svg height="11" viewBox="0 0 18 11" width="17">
        <rect height="4" rx="1" width="3" x="0" y="7" />
        <rect height="6" rx="1" width="3" x="5" y="5" />
        <rect height="8" rx="1" width="3" x="10" y="3" />
        <rect height="11" rx="1" width="3" x="15" y="0" />
      </svg>
      {/* Wi-Fi */}
      <svg fill="none" height="11" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 16 11" width="15">
        <path d="M1.5 4a9.5 9.5 0 0 1 13 0" />
        <path d="M4.5 6.8a5.2 5.2 0 0 1 7 0" />
        <circle cx="8" cy="9.4" fill="currentColor" r="1" stroke="none" />
      </svg>
      {/* Battery */}
      <svg height="12" viewBox="0 0 27 12" width="25">
        <rect fill="none" height="11" rx="3" stroke="currentColor" strokeOpacity="0.4" width="23" x="0.5" y="0.5" />
        <rect height="8" rx="1.6" width="17" x="2" y="2" />
        <rect height="4" opacity="0.4" rx="1" width="2" x="24.5" y="4" />
      </svg>
    </span>
  )
}

export function MobilePreviewPage() {
  const [time, setTime] = useState(clockText)

  useEffect(() => {
    const timer = window.setInterval(() => setTime(clockText()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main className="mobile-preview-page">
      <div className="mobile-preview-copy" aria-hidden="true">
        <strong>MOZI</strong>
        <span>모바일 미리보기</span>
      </div>
      <div className="mobile-device" aria-label="MOZI 모바일 화면 프레임">
        <span className="mobile-device__volume mobile-device__volume--up" />
        <span className="mobile-device__volume mobile-device__volume--down" />
        <span className="mobile-device__power" />
        <div className="mobile-device__screen">
          {/* Like a real phone, the app starts below the status bar instead of under the camera. */}
          <div aria-hidden="true" className="mobile-device__status">
            <span className="mobile-device__time">{time}</span>
            <StatusIcons />
          </div>
          <iframe title="MOZI 모바일 앱" src="/" />
          <div className="mobile-device__island"><i /></div>
          <div className="mobile-device__home" />
        </div>
      </div>
    </main>
  )
}
