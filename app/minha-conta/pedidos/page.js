import { getDB } from '@/lib/d1'
import { exigirCliente } from '@/lib/conta-pagina'
import { pedidosDoCliente } from '@/lib/conta-pedidos'
import PedidosConta from '@/components/conta/PedidosConta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pedidos',
  description: 'Suas compras na Trilha Viva.',
  robots: { index: false, follow: false },
}

export default async function PedidosPage() {
  const cliente = await exigirCliente()
  let itens = []
  let erro = false
  try {
    const db = getDB()
    if (!db) throw new Error('Banco indisponível')
    itens = await pedidosDoCliente(db, cliente.id)
  } catch {
    erro = true
  }
  return <PedidosConta itens={itens} erro={erro} />
}
