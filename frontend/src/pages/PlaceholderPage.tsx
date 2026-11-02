import { Link } from 'react-router-dom'

interface PlaceholderPageProps {
  eyebrow: string
  title: string
}

export function PlaceholderPage({ eyebrow, title }: PlaceholderPageProps) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="panel max-w-lg text-center">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-black text-stone-900">{title}</h1>
        <p className="mt-4 leading-7 text-stone-600">
          지금은 실행 기반만 준비했습니다. 다음 개발 단계에서 실제 데이터와
          연결합니다.
        </p>
        <Link className="button button--secondary mt-7" to="/">
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  )
}
