import { notFound } from 'next/navigation'
import Casca from '@/components/gestao/Casca'
import Painel from '@/components/gestao/Painel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Prévia da gestão', robots: { index: false, follow: false } }

const compras = Array(30).fill(2)
for (const i of [3, 10, 18]) compras[i] = 0
compras[24] = 6
for (const i of [0, 4, 8, 12, 16, 20, 28]) compras[i] += 2

const serie = compras.map((quantidade, i) => {
  const dia = new Date(Date.UTC(2026, 9, 15 + i)).toISOString().slice(0, 10)
  return { chave: dia, rotulo: dia.slice(8) + '/' + dia.slice(5, 7),
    compras: quantidade, centavos: quantidade * 8990 - (i === 29 ? 1000 : 0) }
})

const resumo = (faturamento_centavos, vendas, clientes, clientes_novos, ticket_centavos,
  carrinhos, carrinhos_pagos, recuperados, conversao) => ({
  faturamento_centavos, vendas, clientes, clientes_novos, ticket_centavos,
  carrinhos, carrinhos_pagos, recuperados, conversao,
})
const ZEROS = resumo(0, 0, 0, 0, 0, 0, 0, 0, 0)
const nomes = ['Ana Lima', 'Bruno Costa', 'Carla Souza', 'Daniel Alves', 'Elisa Rocha', 'Felipe Melo']
const ultimas_vendas = nomes.map((nome, i) => ({
  id: i + 1, em: `2026-11-${String(13 - i).padStart(2, '0')}T14:20:00.000Z`,
  valor_centavos: 8990, forma: 'pix', fonte: i % 2 ? 'Direto' : 'Instagram/Meta',
  campanha: null, cliente: { id: i + 1, nome, email: `cliente${i + 1}@exemplo.com` },
}))
const atividade = Array.from({ length: 10 }, (_, i) => ({
  tipo: i % 3 === 0 ? 'lead' : 'compra',
  em: `2026-11-${String(13 - i).padStart(2, '0')}T15:00:00.000Z`,
  nome: nomes[i % nomes.length], email: `cliente${i + 1}@exemplo.com`,
  valor_centavos: i % 3 === 0 ? null : 8990,
  cliente_id: i + 1, acao: null, quem: null, alvo: null,
}))

const dados = {
  ok: true, de: '2026-10-15', ate: '2026-11-13', agrupar: 'dia',
  anterior_de: '2026-09-15', anterior_ate: '2026-10-14',
  atual: resumo(646280, 72, 72, 71, 8976, 92, 72, 10, 78.26),
  anterior: resumo(305660, 34, 34, 33, 8990, 41, 29, 4, 70.73),
  serie,
  fontes: [
    { fonte: 'Instagram/Meta', vendas: 41, centavos: 368590 },
    { fonte: 'Direto', vendas: 18, centavos: 161820 },
    { fonte: 'Google', vendas: 8, centavos: 71920 },
    { fonte: 'VS grátis', vendas: 5, centavos: 43950 },
  ],
  ultimas_vendas, atividade,
  agora: {
    hoje: { vendas: 3, centavos: 26970 },
    ontem: { vendas: 2, centavos: 17980 },
    mes: { vendas: 31, centavos: 278690 },
  },
}
const avisos = {
  whatsapp_esperando: 2, instagram_esperando: 0,
  robo: { estado: 'ativo', modelo_status: 'APPROVED' },
  sem_senha_48h: 0, sem_download: 2, meta_falhou_30d: 0,
  cupons_vencendo: [], cupons_esgotando: [], robo_limite_7d: null,
  afiliados_saques_pendentes: 0, afiliados_alertas: 0, membros_sem_trocar: 0,
}

// Endereço isolado para conferir o visual sem sessão; em produção responde 404.
export default async function PreviaGestao({ searchParams }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const vazio = (await searchParams)?.vazio === '1'
  const painel = vazio ? {
    ...dados, atual: ZEROS, anterior: ZEROS,
    serie: serie.map((s) => ({ ...s, compras: 0, centavos: 0 })),
    fontes: [], ultimas_vendas: [], atividade: [],
    agora: { hoje: { vendas: 0, centavos: 0 }, ontem: { vendas: 0, centavos: 0 }, mes: { vendas: 0, centavos: 0 } },
  } : dados
  return <>
    <style>{'[data-cta-compra],[data-site-chrome]{display:none!important}'}</style>
    <Casca papel="master" email="previa@exemplo.com" avisos={vazio ? { ...avisos, whatsapp_esperando: 0, sem_download: 0 } : avisos} ativo="/gestao">
      <Painel painel={painel} avisos={vazio ? { ...avisos, whatsapp_esperando: 0, sem_download: 0 } : avisos}
        agora="2026-11-13T15:00:00.000Z" agrupar="dia" />
    </Casca>
  </>
}
