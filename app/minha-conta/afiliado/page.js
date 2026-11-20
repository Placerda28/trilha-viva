import { getDB } from '@/lib/d1'
import { site } from '@/lib/site'
import { linkDoAfiliado } from '@/lib/afiliados-campos'
import { mesDe } from '@/lib/afiliados/datas'
import { afiliadoDoCliente } from '@/lib/afiliados/conta'
import { dadosDoPainel } from '@/lib/afiliados/painel'
import { configuracao, niveisDoMes } from '@/lib/afiliados/niveis'
import { clienteDaConta } from '@/lib/conta-pagina'
import AfiliadoTela from '@/components/afiliados/AfiliadoTela'
import AfiliadoConta from '@/components/conta/afiliado/AfiliadoConta'
import AfiliadoNovo from '@/components/conta/afiliado/AfiliadoNovo'

export const runtime = 'nodejs'
// Lê o cookie da sessão, então é montada a cada visita. Por isso a página só
// busca o que mostra (poucas linhas) e não lê searchParams.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Programa de afiliados',
  description: 'Indique a Trilha Viva e ganhe por cada venda feita pelo seu link.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/minha-conta/afiliado' },
}

export default async function AfiliadoPage() {
  const db = getDB()
  const cliente = await clienteDaConta()
  const afiliado = cliente && db ? await afiliadoDoCliente(db, cliente.id) : null
  const [config, niveis] = db
    ? await Promise.all([configuracao(db), niveisDoMes(db, mesDe(new Date()))])
    : [null, []]
  // Sem a linha de configuração (banco indisponível) trata como fechado, não aberto.
  const aberto = config ? Number(config.programa_aberto) === 1 : false

  // Quem não entrou vê a apresentação do programa (com o cadastro que cria a
  // conta). O layout não põe o menu da conta em volta nesse caso.
  if (!cliente) return <AfiliadoTela estado="visitante" niveis={niveis} aberto={aberto} />

  if (afiliado) {
    // Pendente ainda não tem venda: não monta o painel (e não gasta consulta).
    const dados = afiliado.status === 'pendente' ? null : await dadosDoPainel(db, afiliado.id)
    const pref = await db.prepare('SELECT avisar_cada_venda AS v FROM afiliados WHERE id = ?').bind(afiliado.id).first()
    return (
      <AfiliadoConta
        afiliado={{
          codigo: afiliado.codigo,
          status: afiliado.status,
          link: linkDoAfiliado(site.url, afiliado.codigo),
        }}
        painel={{
          dados,
          avisarCadaVenda: Number(pref?.v) === 1,
          config: config && { diaFechamento: config.dia_fechamento },
        }}
        emailSuporte={site.email}
      />
    )
  }
  return <AfiliadoNovo nome={cliente.nome || ''} niveis={niveis} aberto={aberto} />
}
