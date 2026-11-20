import { temCompra } from '@/lib/sessao'
import { usoDeHoje, quandoVolta } from '@/lib/cota'
import { b2Configurado } from '@/lib/b2'
import { acervoPronto } from '@/lib/arquivos'
import { adminAtual } from '@/lib/gestao/permissao'
import { exigirCliente } from '@/lib/conta-pagina'
import AcervoConta from '@/components/conta/AcervoConta'
import AcervoSemAcesso from '@/components/conta/AcervoSemAcesso'

export const runtime = 'nodejs'
// Lê o cookie da sessão, então é montada a cada visita. Por isso a página só
// decide o estado: a lista das músicas, a busca e os filtros nascem no navegador.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Minhas VS',
  description: 'Sua área de downloads do acervo Trilha Viva.',
  robots: { index: false, follow: false },
}

export default async function MinhasVSPage() {
  const cliente = await exigirCliente()
  const [comprou, uso, admin] = await Promise.all([temCompra(cliente.id), usoDeHoje(cliente.id), adminAtual()])
  if (!comprou) return <AcervoSemAcesso motivo={admin ? 'gestao' : 'sem-pacote'} />
  // A lista só aparece quando o mapa existe no balde: antes disso seria uma
  // parede de botões que não entregam nada.
  const pronto = b2Configurado() ? await acervoPronto() : false
  if (!pronto) return <AcervoSemAcesso motivo="preparando" />
  return <AcervoConta restam={uso.restam} limite={uso.limite} volta={quandoVolta()} admin={Boolean(admin)} />
}
