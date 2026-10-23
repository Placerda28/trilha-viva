import { Suspense } from 'react'
import Downloads from '@/components/gestao/Downloads'
import { Esqueleto } from '@/components/gestao/Estados'

// O layout e a API conferem a permissão; o período vem da URL.
export default function DownloadsPage() {
  return <Suspense fallback={<Esqueleto />}><Downloads /></Suspense>
}
