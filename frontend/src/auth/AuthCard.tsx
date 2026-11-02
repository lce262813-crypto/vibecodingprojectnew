import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthCardProps extends PropsWithChildren {
  title: string
  description: string
  footer: ReactNode
}

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="panel max-w-md">
        <Link className="brand" to="/" aria-label="MOZI 홈">
          MOZI
        </Link>
        <h1 className="mt-7 text-3xl font-black text-stone-900">{title}</h1>
        <p className="mt-2 leading-7 text-stone-600">{description}</p>
        <div className="mt-7">{children}</div>
        <div className="mt-6 text-center text-sm text-stone-600">{footer}</div>
      </section>
    </main>
  )
}
