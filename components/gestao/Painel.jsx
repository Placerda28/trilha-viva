'use client'

import Link from 'next/link'
import Atividade from './Atividade'
import Avisos, { avisosDaApi } from './Avisos'
import BarrasHorizontais from './BarrasHorizontais'
import { CabecalhoPagina } from './Casca'
import Grafico from './Grafico'
import Kpi, { variacao } from './Kpi'
import Segmentos from './Segmentos'
import { dataHora, moeda, numero } from './formato'

// O Painel (plano 3.1, linhas 1 a 4). Recebe tudo por props, no formato do
// plano 4.1 e 4.2; quem busca os dados (Fase 3) só liga a resposta de
// /api/gestao/painel e /api/gestao/avisos aqui.
//
//   painel: { atual, anterior, serie[], fontes[], ultimas_vendas[], atividade[] }
//   avisos: o JSON de /api/gestao/avisos
//   hoje:   'AAAA-MM-DD' de Brasília; agora: ISO do instante da leitura

const AGRUPAR = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]
const NOME_AGRUPAR = { dia: 'dia', semana: 'semana', mes: 'mês' }
const FORMAS = { pix: 'Pix', cartao: 'Cartão', outro: 'Outro' }

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

function UltimasVendas({ vendas }) {
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
      <ul className="-mx-4 mt-3 sm:-mx-5">
        {vendas.map((v) => (
          <li key={v.id} className="border-t border-line">
            {/* Na Fase 3 a linha abre o Detalhe do cliente. */}
            <button
              type="button"
              className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink sm:px-5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold text-ink">{v.nome}</span>
                <span className="figs block truncate text-[13px] text-ink-muted">
                  {dataHora(v.em).replace(/\/\d{4}/, '')}, {FORMAS[v.forma] || v.forma}, {v.origem}
                </span>
              </span>
              <span className="figs shrink-0 text-[14.5px] font-semibold text-ink">{moeda(v.centavos)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}

export default function Painel({ painel, avisos, hoje, agora, agrupar = 'dia', onAgrupar, intervalo }) {
  const { atual, anterior, serie, fontes, ultimas_vendas: vendas, atividade } = painel
  const porDia = serie.map((s) => s.centavos)
  const porDiaCompras = serie.map((s) => s.compras)

  return (
    <>
      <CabecalhoPagina
        titulo="Painel"
        texto="O que vendeu, de onde veio e o que precisa de você. As setas comparam com o período anterior."
        comPeriodo
        intervalo={intervalo}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi
          rotulo="Faturamento"
          valor={reais(atual.faturamento)}
          variacao={variacao(atual.faturamento, anterior.faturamento)}
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
          valor={moeda(atual.ticket)}
          variacao={variacao(atual.ticket, anterior.ticket)}
        />
        <Kpi
          rotulo="Carrinho para compra"
          valor={PCT.format(atual.conversao)}
          variacao={variacao(atual.conversao, anterior.conversao)}
          detalhe={numero(atual.carrinhos) + ' carrinhos, ' + numero(atual.recuperados) + ' recuperados'}
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
            <BarrasHorizontais
              rotuloLista="Vendas por fonte"
              itens={fontes.map((f) => ({
                id: f.fonte,
                rotulo: f.fonte,
                valor: f.centavos,
                texto: numero(f.vendas) + (f.vendas === 1 ? ' venda, ' : ' vendas, ') + reais(f.centavos),
              }))}
            />
          </div>
        </Cartao>
      </div>

      <div className="mt-4">
        <Avisos avisos={avisosDaApi(avisos, hoje)} />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <UltimasVendas vendas={vendas} />
        <Atividade itens={atividade} agora={agora} />
      </div>
    </>
  )
}
