import { useState } from 'react'

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

  async function openShare() {
    setIsBusy(true); setError(''); setMessage('')
    try {
      setUrl(shareUrlFor(await createShareLink(characterId)))
    } catch {
      setError('자랑하기 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('링크를 복사했어요. 친구에게 보내 보세요!')
    } catch {
      setMessage('복사하지 못했어요. 위 링크를 직접 선택해 복사해 주세요.')
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: `MOZI · ${characterName}`, text: `내 감정 몬스터 ${characterName}를 구경해 봐!`, url })
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  }

  async function stopSharing() {
    setIsBusy(true); setError('')
    try {
      await revokeShareLink(characterId)
      setUrl('')
      setMessage('공유를 멈췄어요. 이전 링크로는 더 이상 볼 수 없어요.')
    } catch {
      setError('공유를 멈추지 못했어요.')
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
              <button className="button button--secondary" onClick={() => void nativeShare()} type="button">공유하기</button>
            )}
            <button className="button button--secondary" disabled={isBusy} onClick={() => void stopSharing()} type="button">공유 멈추기</button>
          </div>
        </>
      )}
      <p className="share-controls__notice">일기와 감정 기록은 공유되지 않고, 캐릭터와 닉네임만 보여요.</p>
      {message && <p className="form-success mt-3" role="status">{message}</p>}
      {error && <p className="form-error mt-3" role="alert">{error}</p>}
    </section>
  )
}
