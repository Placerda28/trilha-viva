import { Suspense } from 'react'
import AccessPanel from '@/components/AccessPanel'

export const metadata = {
  title: 'Acesso liberado',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function SucessoPage() {
  return (
    <div className="shell max-w-3xl pb-20 pt-20">
      <Suspense
        fallback={
          <div className="border border-line bg-white p-11">
            <p className="text-[16px] text-ink-muted">Carregando…</p>
          </div>
        }
      >
        <AccessPanel />
      </Suspense>
    </div>
  )
}
