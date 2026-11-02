import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

const bodySource = '/assets/character-prototype/bodies/basic.png'

export function BodyPrototypePage() {
  const tintStyle = {
    '--body-preview-mask': `url("${bodySource}")`,
  } as CSSProperties

  return (
    <main className="body-approval-page min-h-screen px-5 py-7 sm:px-8">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link className="brand" to="/">MOZI</Link>
        <span className="prototype-badge">몸통 디자인 승인용</span>
      </header>

      <section className="mx-auto mt-10 max-w-5xl text-center">
        <p className="eyebrow">Fixed jelly body silhouette</p>
        <h1 className="mt-3 text-3xl font-black text-stone-900 sm:text-4xl">공통 기본 젤리 몸통</h1>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-stone-600">
          모든 캐릭터가 공통으로 사용하는 고정 실루엣입니다. 현재는 몸통 형태만
          확인할 수 있도록 얼굴과 장식을 모두 제거했습니다.
        </p>

        <div className="body-approval-stage mt-8">
          <span className="body-only-preview" style={tintStyle}>
            <img alt="얼굴과 장식이 없는 공통 기본 젤리 몸통" draggable="false" src={bodySource} />
            <span aria-hidden="true" className="body-only-preview__tint" />
          </span>
        </div>

        <dl className="body-approval-facts">
          <div><dt>몸통 수</dt><dd>고정 1종</dd></div>
          <div><dt>기준 비율</dt><dd>96 : 64</dd></div>
          <div><dt>상단 최고점</dt><dd>중앙 1 논리 픽셀</dd></div>
          <div><dt>구조 검증</dt><dd>연결 1 · 구멍 0</dd></div>
        </dl>
      </section>
    </main>
  )
}
