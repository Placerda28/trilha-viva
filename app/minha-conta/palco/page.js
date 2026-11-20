import { temCompra } from '@/lib/sessao'
import { exigirCliente } from '@/lib/conta-pagina'
import PalcoConta from '@/components/conta/PalcoConta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Baixar o Palco',
  description: 'O programa Palco, o seu plano e os computadores onde ele está ativado.',
  robots: { index: false, follow: false },
}

export default async function PalcoPage() {
  const cliente = await exigirCliente()
  return <PalcoConta pagina="palco" temPacote={await temCompra(cliente.id)} />
}
