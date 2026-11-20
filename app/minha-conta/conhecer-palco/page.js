import { temCompra } from '@/lib/sessao'
import { exigirCliente } from '@/lib/conta-pagina'
import PalcoConta from '@/components/conta/PalcoConta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Conhecer o Palco',
  description: 'O programa da Trilha Viva para tocar VS no culto.',
  robots: { index: false, follow: false },
}

export default async function ConhecerPalcoPage() {
  const cliente = await exigirCliente()
  return <PalcoConta pagina="conhecer" temPacote={await temCompra(cliente.id)} />
}
