import { exigirCliente } from '@/lib/conta-pagina'
import DadosConta from '@/components/conta/DadosConta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Meus dados',
  description: 'Nome, e-mail e senha da sua conta Trilha Viva.',
  robots: { index: false, follow: false },
}

export default async function DadosPage() {
  const cliente = await exigirCliente()
  return <DadosConta nome={cliente.nome} email={cliente.email} />
}
