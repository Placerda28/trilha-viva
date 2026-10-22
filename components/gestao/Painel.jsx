'use client'

import Link from 'next/link'
import Atividade, { itensDaAtividade } from './Atividade'
import Avisos, { avisosDaApi } from './Avisos'
import BarrasHorizontais from './BarrasHorizontais'
import { CabecalhoPagina } from './Casca'
import { useDetalhe } from './DetalheCliente'
import Grafico from './Grafico'
import Kpi, { variacao } from './Kpi'
import Segmentos from './Segmentos'
import { FORMAS, dataHora, diaPorExtenso, moeda, numero } from './formato'

// O Painel (plano 3.1, linhas 1 a 4). Recebe tudo por props, no formato das
// rotas /api/gestao/painel e /api/gestao/avisos (PainelTela busca e entrega):
//
//   painel: o JSON de /api/gestao/painel
//   avisos: o JSON de /api/gestao/avisos (undefined enquanto carrega, null se falhou)
//   agora:  ISO do instante da leitura (hora relativa e dias que faltam)

const AGRUPAR = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]
const NOME_AGRUPAR = { dia: 'dia', semana: 'semana', mes: 'mês' }
// Valor cheio, sem centavos: cabe no cartão de 176 px da tela de 1024 px.
const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const reais = (centavos) => REAIS.format((Number(centavos) || 0) / 100)
const PCT = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Cartao({ id, titulo, acao, children }) {
  return (
    <section aria-labelledby={id} className="rounded-md border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-[16px] font-bold tracking-[-0.01em] text-ink">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

function UltimasVendas({ vendas, aoMudar }) {
  const detalhe = useDetalhe()
  return (
    <Cartao
      id="ultimas-vendas"
      titulo="Últimas vendas"
      acao={
        <Link href="/gestao/vendas" prefetch={false} className="link-signal min-h-11 !text-[14px] md:min-h-0">
          Ver todas
        </Link>
      }
    >
      {vendas.length === 0 && <p className="mt-3 text-[14.5px] text-ink-muted">Ainda não há vendas pagas.</p>}
      <ul className="-mx-4 mt-3 sm:-mx-5">
        {vendas.map((v) => (
          <li key={v.id} className="border-t border-line">
            <button
              type="button"
              onClick={() => detalhe.abrir(v.cliente.id, aoMudar)}
              className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink sm:px-5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold text-ink">
                  {v.cliente.nome || v.cliente.email}
                </span>
                <span className="figs block truncate text-[13px] text-ink-muted">
                  {dataHora(v.em).replace(/\/\d{4}/, '')}, {FORMAS[v.forma] || 'sem forma'}, {v.fonte}
                </span>
              </span>
              <span className="figs shrink-0 text-[14.5px] font-semibold text-ink">{moeda(v.valor_centavos)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}

export default function Painel({ painel, avisos, agora, agrupar = 'dia', onAgrupar, aoMudar }) {
  const { atual, anterior, serie, fontes, ultimas_vendas: vendas, atividade } = painel
  const porDia = serie.map((s) => s.centavos)
  const porDiaCompras = serie.map((s) => s.compras)

  return (
    <>
      <CabecalhoPagina
        titulo="Painel"
        texto={
          'O que vendeu, de onde veio e o que precisa de você. As setas comparam com o período anterior (' +
          diaPorExtenso(painel.anterior_de) +
          (painel.anterior_de === painel.anterior_ate ? '' : ' a ' + diaPorExtenso(painel.anterior_ate)) +
          ').'
        }
        comPeriodo
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi
          rotulo="Faturamento"
          valor={reais(atual.faturamento_centavos)}
          variacao={variacao(atual.faturamento_centavos, anterior.faturamento_centavos)}
          serie={porDia}
          rotuloSerie="Faturamento por dia"
        />
        <Kpi
          rotulo="Vendas"
          valor={numero(atual.vendas)}
          variacao={variacao(atual.vendas, anterior.vendas)}
          detalhe={numero(atual.clientes_novos) + ' clientes novos'}
          serie={porDiaCompras}
          rotuloSerie="Vendas por dia"
        />
        <Kpi
          rotulo="Ticket médio"
          valor={moeda(atual.ticket_centavos)}
          variacao={variacao(atual.ticket_centavos, anterior.ticket_centavos)}
        />
        <Kpi
          rotulo="Carrinho para compra"
          valor={PCT.format(atual.conversao / 100)}
          variacao={variacao(atual.conversao, anterior.conversao)}
          detalhe={
            numero(atual.carrinhos) + (atual.carrinhos === 1 ? ' carrinho, ' : ' carrinhos, ') +
            numero(atual.recuperados) + (atual.recuperados === 1 ? ' recuperado' : ' recuperados')
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Grafico
            className="h-full"
            titulo={'Faturamento por ' + NOME_AGRUPAR[agrupar]}
            serie={serie}
            acoes={
              <Segmentos
                opcoes={AGRUPAR}
                valor={agrupar}
                onEscolher={onAgrupar}
                rotulo="Agrupar por"
                tamanho="compacto"
              />
            }
          />
        </div>
        <Cartao
          id="de-onde-vieram"
          titulo="De onde vieram as vendas"
          acao={
            <Link href="/gestao/campanhas" prefetch={false} className="link-signal min-h-11 !text-[14px] md:min-h-0">
              Ver campanhas
            </Link>
          }
        >
          <div className="mt-4">
            {fontes.length === 0 ? (
              <p className="text-[14.5px] text-ink-muted">Nenhuma venda paga neste período.</p>
            ) : (
              <BarrasHorizontais
                rotuloLista="Vendas por fonte"
                itens={fontes.map((f) => ({
                  id: f.fonte,
                  rotulo: f.fonte,
                  valor: f.centavos,
                  texto: numero(f.vendas) + (f.vendas === 1 ? ' venda, ' : ' vendas, ') + reais(f.centavos),
                }))}
              />
            )}
          </div>
        </Cartao>
      </div>

      <div className="mt-4">
        <Avisos
          avisos={avisosDaApi(avisos, agora)}
          estado={avisos === undefined ? 'carregando' : avisos === null ? 'erro' : 'ok'}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <UltimasVendas vendas={vendas} aoMudar={aoMudar} />
        <Atividade itens={itensDaAtividade(atividade)} agora={agora} />
      </div>
    </>
  )
}
