import { exigirCliente } from '@/lib/conta-pagina'
import PalcoConta from '@/components/conta/PalcoConta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Assinatura',
  description: 'O plano do Palco, as cobranças e o cartão.',
  robots: { index: false, follow: false },
}

export default async function AssinaturaPage() {
  await exigirCliente()
  return <PalcoConta pagina="assinatura" />
}
