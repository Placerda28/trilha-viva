'use client'

import { useState } from 'react'
import { useGestao } from './useGestao'
import Grafico from './Grafico'
import ClientesTabela from './ClientesTabela'
import { Aviso, Esqueleto, Vazio, Paginacao, BaixarPlanilha } from './Estados'
import { ATALHOS, intervaloDoAtalho, diasEntre, diaPorExtenso, moeda, numero } from './formato'

const POR_PAGINA = 25
const AGRUPAR = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]
const NOME_AGRUPAR = { dia: 'dia', semana: 'semana', mes: 'mês' }

// Botões lado a lado em que um só fica marcado (atalhos de data, dia/semana/mês).
function Segmentos({ opcoes, valor, onEscolher, rotulo }) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const marcado = o.id === valor
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={marcado}
            onClick={() => onEscolher(o.id)}
            className={
              'rounded border px-3.5 py-2 text-[14px] font-semibold transition-colors duration-150 ' +
              (marcado
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white text-ink hover:border-ink')
            }
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}

function Total({ rotulo, valor, detalhe }) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink">{valor}</dd>
      {detalhe && <dd className="figs mt-0.5 text-[13px] text-ink-muted">{detalhe}</dd>}
    </div>
  )
}

// Pix × cartão: os dois números e uma régua fina com a proporção. Em preto e
// cinza — o vermelho é reservado para destaque, e aqui nada está em alerta.
function Formas({ t }) {
  const soma = t.pix.centavos + t.cartao.centavos + t.outro.centavos + t.sem_info.centavos
  const parte = (c) => (soma ? (c / soma) * 100 : 0)
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <dt className="text-[13px] text-ink-muted">Pix × cartão</dt>
      <dd className="figs mt-1.5 space-y-0.5 text-[14px] text-ink">
        <p>
          <span className="font-semibold">Pix</span> {numero(t.pix.compras)} · {moeda(t.pix.centavos)}
        </p>
        <p>
          <span className="font-semibold">Cartão</span> {numero(t.cartao.compras)} · {moeda(t.cartao.centavos)}
        </p>
        {t.outro.compras > 0 && (
          <p className="text-ink-muted">
            Outro {numero(t.outro.compras)} · {moeda(t.outro.centavos)}
          </p>
        )}
        {t.sem_info.compras > 0 && (
          <p className="text-ink-muted">
            {numero(t.sem_info.compras)} ainda sem informação
          </p>
        )}
      </dd>
      {soma > 0 && (
        <dd aria-hidden="true" className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-sm">
          <span className="bg-ink" style={{ width: parte(t.pix.centavos) + '%' }} />
          <span className="bg-ink-faint" style={{ width: parte(t.cartao.centavos) + '%' }} />
          <span className="bg-mist-deep" style={{ width: parte(t.outro.centavos + t.sem_info.centavos) + '%' }} />
        </dd>
      )}
    </div>
  )
}

// Período longo demais para barras diárias vira semana (e depois mês): 300
// barras de 1 px não dizem nada.
function agruparPara(de, ate, atual) {
  const dias = diasEntre(de, ate)
  if (dias > 400 && atual !== 'mes') return 'mes'
  if (dias > 92 && atual === 'dia') return 'semana'
  return atual
}

export default function Periodo() {
  const inicial = intervaloDoAtalho('30d')
  const [atalho, setAtalho] = useState('30d')
  const [de, setDe] = useState(inicial.de)
  const [ate, setAte] = useState(inicial.ate)
  const [agrupar, setAgrupar] = useState('dia')
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)

  const valido = /^\d{4}-\d{2}-\d{2}$/.test(de) && /^\d{4}-\d{2}-\d{2}$/.test(ate) && de <= ate
  const longoDemais = valido && diasEntre(de, ate) > 731

  const url =
    valido && !longoDemais
      ? '/api/gestao/periodo?de=' + de + '&ate=' + ate + '&agrupar=' + agrupar + '&pagina=' + pagina
      : null
  const { dados, erro, carregando } = useGestao(url, tentativa)

  function aplicar(novoDe, novoAte) {
    setDe(novoDe)
    setAte(novoAte)
    setPagina(1)
    if (novoDe && novoAte && novoDe <= novoAte) setAgrupar((a) => agruparPara(novoDe, novoAte, a))
  }

  function escolherAtalho(id) {
    const r = intervaloDoAtalho(id)
    setAtalho(id)
    aplicar(r.de, r.ate)
  }

  const t = dados?.totais
  const campo =
    'w-full rounded border border-line bg-white px-3 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none'

  return (
    <section aria-labelledby="titulo-periodo" className="mt-8">
      <h2 id="titulo-periodo" className="sr-only">
        Clientes por período
      </h2>

      <div className="space-y-4">
        <Segmentos opcoes={ATALHOS} valor={atalho} onEscolher={escolherAtalho} rotulo="Atalhos de período" />

        <div className="flex flex-wrap items-end gap-3">
          <label className="block w-[calc(50%-6px)] sm:w-44">
            <span className="text-[13px] text-ink-muted">De</span>
            <input
              type="date"
              value={de}
              max={ate || undefined}
              onChange={(e) => {
                setAtalho('')
                aplicar(e.target.value, ate)
              }}
              className={campo + ' mt-1'}
            />
          </label>
          <label className="block w-[calc(50%-6px)] sm:w-44">
            <span className="text-[13px] text-ink-muted">Até</span>
            <input
              type="date"
              value={ate}
              min={de || undefined}
              onChange={(e) => {
                setAtalho('')
                aplicar(de, e.target.value)
              }}
              className={campo + ' mt-1'}
            />
          </label>
          <div className="sm:ml-auto">
            {url && <BaixarPlanilha href={'/api/gestao/periodo/csv?de=' + de + '&ate=' + ate} />}
          </div>
        </div>

        {!valido && (
          <p role="alert" className="text-[14px] text-signal-deep">
            A data inicial precisa ser igual ou anterior à final.
          </p>
        )}
        {longoDemais && (
          <p role="alert" className="text-[14px] text-signal-deep">
            O período pode ter no máximo dois anos. Encurte as datas.
          </p>
        )}
      </div>

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        url ? <Esqueleto linhas={4} /> : null
      ) : (
        <div className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <p className="figs mt-6 text-[13.5px] text-ink-muted">
            {dados.de === dados.ate
              ? diaPorExtenso(dados.de)
              : diaPorExtenso(dados.de) + ' a ' + diaPorExtenso(dados.ate)}{' '}
            · horário de Brasília · só compras pagas
          </p>

          {/* Fios de 1 px entre as células: o fundo do grid é a cor do fio e
              cada célula é branca, com 1 px de vão. Funciona em 2 e em 4
              colunas sem regra especial para cada borda. */}
          <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line lg:grid-cols-4">
            <Total
              rotulo="Clientes"
              valor={numero(t.clientes)}
              detalhe={numero(t.compras) + (t.compras === 1 ? ' compra' : ' compras')}
            />
            <Total rotulo="Faturamento bruto" valor={moeda(t.bruto_centavos)} />
            <Total rotulo="Ticket médio" valor={t.compras ? moeda(t.ticket_medio_centavos) : '—'} />
            <Formas t={t} />
          </dl>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-ink-muted">Agrupar por</p>
            <Segmentos
              opcoes={AGRUPAR}
              valor={agrupar}
              onEscolher={(id) => {
                setAgrupar(id)
                setPagina(1)
              }}
              rotulo="Agrupar o gráfico por"
            />
          </div>

          {t.compras > 0 ? (
            <Grafico serie={dados.serie} titulo={'Faturamento por ' + NOME_AGRUPAR[dados.agrupar]} />
          ) : null}

          <h3 className="mt-10 text-[17px] font-bold text-ink">
            Compras no período{' '}
            <span className="figs font-normal text-ink-muted">({numero(dados.total_itens)})</span>
          </h3>
          {dados.itens.length === 0 ? (
            <Vazio
              titulo="Nenhuma compra neste período"
              texto="Escolha outro atalho ou aumente as datas. Só entram compras com pagamento confirmado."
            />
          ) : (
            <>
              <ClientesTabela itens={dados.itens} />
              <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={dados.total_itens} onIr={setPagina} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
