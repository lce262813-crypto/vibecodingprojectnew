import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '../api/client'
import { getBadges, removeAvatar, uploadAvatar, exportAccountData, type BadgeStatus } from '../auth/authApi'
import { useAuth } from '../auth/authContextValue'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function SettingsPage() {
  const { deleteAccount, logout, refreshUser, updateNickname, updatePreferences, user } = useAuth()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [badges, setBadges] = useState<BadgeStatus[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notifications_enabled ?? false)
  const [notificationTime, setNotificationTime] = useState(user?.notification_time ?? '21:00')
  const [notificationPermission, setNotificationPermission] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported')
  const [avatarVersion, setAvatarVersion] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    getBadges()
      .then((badgeResult) => setBadges(badgeResult.badges))
      .catch(() => setError('배지 정보를 불러오지 못했어요.'))
  }, [])

  function fail(caught: unknown, fallback: string) { setError(caught instanceof ApiError ? caught.message : fallback) }

  async function handleNickname(event: FormEvent) {
    event.preventDefault(); setBusy('nickname'); setError(''); setMessage('')
    try { await updateNickname(nickname); setMessage('닉네임을 변경했어요.') }
    catch (caught) { fail(caught, '닉네임을 변경하지 못했어요.') }
    finally { setBusy('') }
  }

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_AVATAR_BYTES) { setError('프로필 이미지는 2MB 이하 PNG, JPEG, WebP만 사용할 수 있어요.'); return }
    setBusy('avatar'); setError(''); setMessage('')
    try { await uploadAvatar(file); await refreshUser(); setAvatarVersion(Date.now()); setMessage('프로필 이미지를 저장했어요.') }
    catch (caught) { fail(caught, '프로필 이미지를 저장하지 못했어요.') }
    finally { setBusy(''); event.target.value = '' }
  }

  async function handleRemoveAvatar() {
    setBusy('avatar'); setError('')
    try { await removeAvatar(); await refreshUser(); setMessage('프로필 이미지를 삭제했어요.') }
    catch (caught) { fail(caught, '프로필 이미지를 삭제하지 못했어요.') }
    finally { setBusy('') }
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) return
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    if (permission !== 'granted') setNotificationsEnabled(false)
  }

  async function handlePreferences(event: FormEvent) {
    event.preventDefault(); setBusy('preferences'); setError(''); setMessage('')
    try {
      if (notificationsEnabled && notificationPermission !== 'granted') {
        await requestNotificationPermission()
        if (Notification.permission !== 'granted') throw new Error('알림 권한이 필요해요.')
      }
      // Representative character and themes are not offered yet; keep whatever is stored.
      await updatePreferences({
        representative_character_id: user?.representative_character_id ?? null,
        theme: user?.theme ?? 'cream',
        notifications_enabled: notificationsEnabled,
        notification_time: notificationTime,
        room_background: user?.room_background ?? 'cream',
      })
      setMessage('알림 설정을 저장했어요.')
    } catch (caught) { fail(caught, caught instanceof Error ? caught.message : '설정을 저장하지 못했어요.') }
    finally { setBusy('') }
  }

  async function handleExport() {
    setBusy('export'); setError('')
    try { const data = await exportAccountData(); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `mozi-data-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); setMessage('개인 데이터 JSON 파일을 내려받았어요.') }
    catch { setError('개인 데이터를 내보내지 못했어요.') }
    finally { setBusy('') }
  }

  async function handleDeleteAccount(event: FormEvent) {
    event.preventDefault(); setBusy('delete'); setError('')
    try { await deleteAccount(deletePassword); navigate('/', { replace: true }) }
    catch (caught) { fail(caught, '계정을 삭제하지 못했어요.'); setBusy('') }
  }

  return <main className="settings-page min-h-screen px-4 py-8"><section className="mx-auto max-w-4xl">
    <p className="eyebrow">계정 설정</p><h1 className="mt-3 text-3xl font-black">나만의 MOZI</h1><p className="mt-2 text-stone-600">{user?.email}</p>
    {message && <p className="form-success mt-5" role="status">{message}</p>}{error && <p className="form-error mt-5" role="alert">{error}</p>}
    <div className="settings-grid mt-6">
      <section className="settings-card"><h2>프로필</h2><div className="profile-image-row"><div className="profile-image">{user?.avatar_url ? <img alt={`${user.nickname} 프로필`} src={`${user.avatar_url}?v=${avatarVersion}`} /> : <span>{user?.nickname.slice(0, 1)}</span>}</div><div><label className="button button--secondary profile-upload">사진 선택<input accept={IMAGE_TYPES.join(',')} disabled={busy === 'avatar'} onChange={handleAvatar} type="file" /></label>{user?.avatar_url && <button className="text-button" disabled={busy === 'avatar'} onClick={() => void handleRemoveAvatar()} type="button">사진 삭제</button>}<small>PNG·JPEG·WebP, 최대 2MB</small></div></div><form className="form-stack mt-5" onSubmit={handleNickname}><label className="form-field"><span>닉네임</span><input maxLength={20} minLength={1} onChange={(event) => setNickname(event.target.value)} required value={nickname} /></label><button className="button button--primary" disabled={busy === 'nickname'}>닉네임 저장</button></form></section>
      <section className="settings-card"><h2>일기 작성 알림</h2><form className="form-stack mt-4" onSubmit={handlePreferences}><div className="notification-setting"><label><input checked={notificationsEnabled} disabled={notificationPermission === 'unsupported'} onChange={(event) => setNotificationsEnabled(event.target.checked)} type="checkbox" /> 일기 작성 알림</label><input aria-label="알림 시간" disabled={!notificationsEnabled} onChange={(event) => setNotificationTime(event.target.value)} type="time" value={notificationTime} /></div><p className="setting-help">{notificationPermission === 'unsupported' ? '이 브라우저는 알림을 지원하지 않아요.' : notificationPermission === 'denied' ? '브라우저 설정에서 알림 권한을 허용해 주세요.' : '현재는 MOZI가 브라우저에서 열려 있을 때 알림을 보내요. 브라우저가 닫힌 상태의 푸시는 별도 서버 인프라가 필요해요.'}</p><button className="button button--primary" disabled={busy === 'preferences'}>알림 설정 저장</button></form></section>
    </div>
    <section className="settings-card mt-6"><h2>나의 기록 배지</h2><p className="setting-help mt-2">어떤 감정이든 솔직하게 기록한 과정 자체를 응원해요.</p><div className="badge-grid mt-4">{badges.map((badge) => <article className={badge.earned ? 'badge-card badge-card--earned' : 'badge-card'} key={badge.badge_id}><span aria-hidden="true">{badge.earned ? '◆' : '◇'}</span><div><strong>{badge.name}</strong><p>{badge.description}</p><small>{badge.progress} / {badge.target}</small></div></article>)}</div></section>
    <section className="settings-card mt-6"><h2>개인 데이터와 계정</h2><p className="setting-help mt-2">일기 원문, 감정 분석, 캐릭터와 개인화 설정을 JSON으로 받을 수 있어요.</p><div className="settings-actions mt-4"><button className="button button--secondary" disabled={busy === 'export'} onClick={() => void handleExport()} type="button">데이터 JSON 받기</button><button className="button button--secondary" onClick={() => void logout().then(() => navigate('/', { replace: true }))} type="button">로그아웃</button></div><div className="privacy-notice mt-5"><strong>사진과 AI 처리 안내</strong><p>프로필·일기 사진은 공개 폴더가 아닌 인증된 저장소에서 제공돼요. 실제 AI 분석을 선택하면 일기 원문이 OpenAI API로 전송될 수 있어요.</p></div></section>
    <section className="settings-card mt-6"><h2>MOZI 튜토리얼</h2><p className="setting-help mt-2">일기, 코인, 공유 규칙을 다시 살펴볼 수 있어요. 다시 봐도 보상은 달라지지 않아요.</p><Link className="button button--secondary mt-4" to="/welcome?replay=1">튜토리얼 다시 보기</Link></section>
    <section className="settings-card settings-danger mt-6"><h2>계정 삭제</h2><p className="setting-help mt-2">계정과 연결된 일기, 사진, 캐릭터, 설정이 모두 삭제되며 복구할 수 없어요.</p>{!confirmingDelete ? <button className="button button--danger mt-4" onClick={() => setConfirmingDelete(true)} type="button">계정 삭제 시작</button> : <form className="form-stack mt-4" onSubmit={handleDeleteAccount}><label className="form-field"><span>비밀번호 확인</span><input onChange={(event) => setDeletePassword(event.target.value)} required type="password" value={deletePassword} /></label><div className="settings-actions"><button className="button button--secondary" onClick={() => setConfirmingDelete(false)} type="button">취소</button><button className="button button--danger" disabled={busy === 'delete'}>영구 삭제</button></div></form>}</section>
    <Link className="button button--secondary mt-6" to="/room">감정 방으로 돌아가기</Link>
  </section></main>
}
