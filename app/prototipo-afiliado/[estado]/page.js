import { notFound } from 'next/navigation'
import AfiliadoTela from '@/components/afiliados/AfiliadoTela'
import CadastroConcluido from '@/components/afiliados/CadastroConcluido'

// PROTÓTIPO TEMPORÁRIO (Fase 3 de afiliados): mostra os estados da tela com
// dados falsos, sem banco nem login, para tirar print antes de o backend
// existir. Em produção responde 404. Apagar esta pasta quando a Fase 3 for aprovada.
export const metadata = { title: 'Protótipo afiliado', robots: { index: false, follow: false } }
export const dynamicParams = false

const NIVEIS = [
  { nome: 'Bronze', vendas_minimas: 1, valor_por_venda_centavos: 1500, cor: '#cd7f32' },
  { nome: 'Prata', vendas_minimas: 20, valor_por_venda_centavos: 2000, cor: '#c0c0c0' },
  { nome: 'Ouro', vendas_minimas: 50, valor_por_venda_centavos: 3000, cor: '#ffd700' },
]
const LINK = 'https://trilhaviva.org/?ref=JOAO27'
const ESTADOS = ['visitante', 'visitante-fechado', 'cadastro', 'cadastro-fechado', 'sucesso', 'sucesso-pendente', 'afiliado', 'afiliado-pendente', 'afiliado-suspenso']

export function generateStaticParams() {
  return ESTADOS.map((estado) => ({ estado }))
}

export default async function Prototipo({ params }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { estado } = await params
  const aberto = !estado.endsWith('-fechado')
  const base = estado.split('-')[0]
  const afiliado = (status) => ({ codigo: 'JOAO27', link: LINK, status })

  if (base === 'sucesso') {
    return (
      <div className="shell max-w-5xl pb-24 pt-14">
        <CadastroConcluido codigo="JOAO27" link={LINK} status={estado === 'sucesso-pendente' ? 'pendente' : 'ativo'} niveis={NIVEIS} />
      </div>
    )
  }
  if (base === 'afiliado') {
    const status = estado === 'afiliado-pendente' ? 'pendente' : estado === 'afiliado-suspenso' ? 'suspenso' : 'ativo'
    return <AfiliadoTela estado="afiliado" nome="João da Silva" afiliado={afiliado(status)} emailSuporte="contato@trilhaviva.org" />
  }
  return <AfiliadoTela estado={base} nome={base === 'cadastro' ? 'João da Silva' : ''} niveis={NIVEIS} aberto={aberto} />
}
