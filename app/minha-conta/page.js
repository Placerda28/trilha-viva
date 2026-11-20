import { temCompra } from '@/lib/sessao'
import { usoDeHoje } from '@/lib/cota'
import { exigirCliente } from '@/lib/conta-pagina'
import Inicio from '@/components/conta/Inicio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Minha conta',
  description: 'Seu pacote, seu Palco e seus dados na Trilha Viva.',
  robots: { index: false, follow: false },
}

export default async function MinhaContaPage() {
  const cliente = await exigirCliente()
  const [comprou, uso] = await Promise.all([temCompra(cliente.id), usoDeHoje(cliente.id)])
  return <Inicio nome={cliente.nome} temPacote={comprou} usados={uso.usados} limite={uso.limite} />
}
