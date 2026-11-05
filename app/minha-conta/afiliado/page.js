import { clienteAtual } from '@/lib/sessao'
import { getDB } from '@/lib/d1'
import { site } from '@/lib/site'
import { linkDoAfiliado } from '@/lib/afiliados-campos'
import { mesDe } from '@/lib/afiliados/datas'
import { afiliadoDoCliente } from '@/lib/afiliados/conta'
import { dadosDoPainel } from '@/lib/afiliados/painel'
import { configuracao, niveisDoMes } from '@/lib/afiliados/niveis'
import AfiliadoTela from '@/components/afiliados/AfiliadoTela'

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
  const cliente = await clienteAtual()
  const afiliado = cliente && db ? await afiliadoDoCliente(db, cliente.id) : null
  const [config, niveis] = db
    ? await Promise.all([configuracao(db), niveisDoMes(db, mesDe(new Date()))])
    : [null, []]
  // Sem a linha de configuração (banco indisponível) trata como fechado, não aberto.
  const aberto = config ? Number(config.programa_aberto) === 1 : false

  if (afiliado) {
    // Pendente ainda não tem venda: não monta o painel (e não gasta consulta).
    const painel = afiliado.status === 'pendente' ? null : await dadosDoPainel(db, afiliado.id)
    const pref = await db.prepare('SELECT avisar_cada_venda AS v FROM afiliados WHERE id = ?').bind(afiliado.id).first()
    return (
      <AfiliadoTela
        estado="afiliado"
        painel={{
          dados: painel,
          niveis,
          avisarCadaVenda: Number(pref?.v) === 1,
          config: config && { diaFechamento: config.dia_fechamento },
        }}
        nome={afiliado.nome || cliente.nome}
        afiliado={{
          codigo: afiliado.codigo,
          status: afiliado.status,
          link: linkDoAfiliado(site.url, afiliado.codigo),
        }}
        emailSuporte={site.email}
      />
    )
  }
  return (
    <AfiliadoTela
      estado={cliente ? 'cadastro' : 'visitante'}
      nome={cliente?.nome || ''}
      niveis={niveis}
      aberto={aberto}
    />
  )
}
