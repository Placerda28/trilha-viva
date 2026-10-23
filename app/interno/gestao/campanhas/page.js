import { Suspense } from 'react'
import Campanhas from '@/components/gestao/Campanhas'
import { Esqueleto } from '@/components/gestao/Estados'

export default function CampanhasPage() {
  return <Suspense fallback={<Esqueleto />}><Campanhas /></Suspense>
}
