import { useState } from 'react'

import { ApiError } from '../api/client'
import { createShareLink, revokeShareLink, shareUrlFor } from './sharingApi'

interface ShareControlsProps {
  characterId: string
  characterName: string
}

export function ShareControls({ characterId, characterName }: ShareControlsProps) {
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  // Opens the phone's own share sheet. Browsers without it keep the link panel below.
  async function showShareSheet(link: string) {
    if (typeof navigator.share !== 'function') return
    try {
      await navigator.share({ title: `MOZI · ${characterName}`, text: `내 감정 몬스터 ${characterName}를 구경해 봐!`, url: link })
    } catch (caught) {
      // Closing the sheet is a normal choice. Anything else is usually iOS refusing because the
      // tap has expired while the link was loading, and a fresh tap on 공유하기 will work.
      if ((caught as { name?: string } | null)?.name !== 'AbortError') setMessage('아래 공유하기를 한 번 더 눌러 주세요.')
    }
  }

  async function openShare() {
    setIsBusy(true); setError(''); setMessage('')
    let link = ''
    try {
      link = shareUrlFor(await createShareLink(characterId))
      setUrl(link)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '자랑하기 링크를 만들지 못했어요. 서버 연결을 확인하고 다시 시도해 주세요.')
    } finally {
      setIsBusy(false)
    }
    if (link) await showShareSheet(link)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('링크를 복사했어요. 친구에게 보내 보세요!')
    } catch {
      setMessage('복사하지 못했어요. 위 링크를 직접 선택해 복사해 주세요.')
    }
  }

  async function stopSharing() {
    setIsBusy(true); setError('')
    try {
      await revokeShareLink(characterId)
      setUrl('')
      setMessage('공유를 멈췄어요. 이전 링크로는 더 이상 볼 수 없어요.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '공유를 멈추지 못했어요. 서버 연결을 확인해 주세요.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="share-controls" aria-label="친구에게 자랑하기">
      {!url ? (
        <button className="button button--primary w-full" disabled={isBusy} onClick={() => void openShare()} type="button">
          {isBusy ? '링크 만드는 중…' : '친구에게 자랑하기'}
        </button>
      ) : (
        <>
          <p className="share-controls__title">{characterName} 자랑 링크가 준비됐어요</p>
          <input aria-label="자랑하기 링크" className="share-controls__url" readOnly value={url} onFocus={(event) => event.target.select()} />
          <div className="share-controls__actions">
            <button className="button button--primary" onClick={() => void copyLink()} type="button">링크 복사</button>
            {typeof navigator.share === 'function' && (
              <button className="button button--secondary" onClick={() => { setMessage(''); void showShareSheet(url) }} type="button">공유하기</button>
            )}
            <button className="button button--secondary" disabled={isBusy} onClick={() => void stopSharing()} type="button">공유 멈추기</button>
          </div>
        </>
      )}
      <p className="share-controls__notice">일기 내용은 공유되지 않아요. 캐릭터와 닉네임, 감정, 소품이 보여요.</p>
      {message && <p className="form-success mt-3" role="status">{message}</p>}
      {error && <p className="form-error mt-3" role="alert">{error}</p>}
    </section>
  )
}
