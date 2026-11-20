import { exigirCliente } from '@/lib/conta-pagina'
import AjudaConta from '@/components/conta/AjudaConta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ajuda',
  description: 'Relate um problema ou fale com a Trilha Viva.',
  robots: { index: false, follow: false },
}

export default async function AjudaPage() {
  const cliente = await exigirCliente()
  return <AjudaConta nome={cliente.nome || ''} email={cliente.email || ''} />
}
