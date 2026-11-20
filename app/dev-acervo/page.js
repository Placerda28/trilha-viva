import { notFound } from 'next/navigation'
import { songs } from '@/lib/catalog'
import AcervoConta from '@/components/conta/AcervoConta'
import AcervoSemAcesso from '@/components/conta/AcervoSemAcesso'
import AjudaConta from '@/components/conta/AjudaConta'
import ContaChrome from '@/components/conta/ContaChrome'
import DadosConta from '@/components/conta/DadosConta'
import Inicio from '@/components/conta/Inicio'
import MenuContaAuto from '@/components/conta/MenuContaAuto'
import PalcoConta from '@/components/conta/PalcoConta'
import PedidosConta from '@/components/conta/PedidosConta'
import PreviaAfiliado from './PreviaAfiliado'

export const metadata = { title: 'Prévia da conta', robots: { index: false, follow: false } }

// Prévia local da área do cliente (/minha-conta/*), sem login nem banco. Só em
// desenvolvimento; em produção responde 404.
//   /dev-acervo?pagina=inicio|acervo|pedidos|dados|afiliado|ajuda|conhecer|palco|assinatura
//   &estado=…   acervo: limite | vazio | sem-pacote | gestao | preparando | erro
//               afiliado: novo | pendente | suspenso | sem-pix
//               pedidos: vazio | erro   inicio, conhecer, palco: sem-pacote
const ATIVO = { inicio: 'inicio', acervo: 'acervo', pedidos: 'pedidos', dados: 'dados', afiliado: 'afiliado', ajuda: 'ajuda', conhecer: 'conhecer', palco: 'baixar', assinatura: 'assinatura' }

const PEDIDOS = [
  { id: 48213, criadoEm: '2026-09-12 15:00:00', valorCentavos: 8990, forma: 'pix', status: 'pago' },
  { id: 40111, criadoEm: '2026-03-02 15:00:00', valorCentavos: 8990, forma: 'cartao', status: 'reembolsado' },
]

function Pagina({ pagina, estado }) {
  const tem = estado !== 'sem-pacote'
  switch (pagina) {
    case 'acervo': {
      if (['sem-pacote', 'gestao', 'preparando'].includes(estado)) return <AcervoSemAcesso motivo={estado} />
      const varias = songs.find((s) => s.variantes.length > 1)
      const musicas = [varias, ...songs.filter((s) => s.slug !== varias?.slug)].slice(0, 12)
      const baixados = estado === 'vazio' ? [] : musicas.slice(0, 5).map((s, i) => ({ slug: s.slug, vezes: (i % 3) + 1, ultimo: new Date(Date.now() - i * 86400000).toISOString().slice(0, 19).replace('T', ' ') }))
      return (
        <AcervoConta
          restam={estado === 'limite' ? 0 : 18}
          limite={30}
          volta="em 6 horas"
          admin
          baixadosIniciais={estado === 'erro' ? undefined : baixados}
        />
      )
    }
    case 'pedidos':
      return <PedidosConta itens={estado === 'vazio' || estado === 'erro' ? [] : PEDIDOS} erro={estado === 'erro'} />
    case 'dados':
      return <DadosConta nome="Ana Souza" email="ana.souza@gmail.com" />
    case 'afiliado':
      return <PreviaAfiliado estado={estado} />
    case 'ajuda':
      return <AjudaConta nome="Ana Souza" email="ana.souza@gmail.com" />
    case 'conhecer':
    case 'palco':
    case 'assinatura':
      return <PalcoConta pagina={pagina} temPacote={tem} />
    default:
      return <Inicio nome="Ana Souza" temPacote={tem} usados={12} limite={30} />
  }
}

export default async function DevConta({ searchParams }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const params = (await searchParams) || {}
  const pagina = ATIVO[params.pagina] ? params.pagina : params.pagina ? 'inicio' : 'acervo'
  return (
    <ContaChrome menu={<MenuContaAuto ativo={ATIVO[pagina]} palco="em-breve" plano="nenhum" nome="Ana Souza" email="ana.souza@gmail.com" />}>
      <Pagina pagina={pagina} estado={String(params.estado || '')} />
    </ContaChrome>
  )
}
