import { Suspense } from 'react'
import Recuperacao from '@/components/gestao/Recuperacao'

// A permissão é conferida no middleware e no layout. Os dados chegam de
// /api/gestao/recuperacao, que confere mais uma vez. O Suspense é de quem lê
// ?q= no navegador (a busca do topo leva até aqui).
export default function RecuperacaoPage() {
  return (
    <Suspense>
      <Recuperacao />
    </Suspense>
  )
}
