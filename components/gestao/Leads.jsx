'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGestao } from './useGestao'
import { usePeriodo } from './usePeriodo'
import { CabecalhoPagina } from './Casca'
import Kpi, { variacao } from './Kpi'
import FunilLeads from './FunilLeads'
import LeadsLista from './LeadsLista'
import { Aviso, Esqueleto, Vazio, Paginacao, BaixarPlanilha } from './Estados'
import { numero, diasEntre, somarDias } from './formato'

// Aba Leads: quem pediu a VS grátis em /vs-gratis, se baixou e se comprou depois.
// Os dados vêm de /api/gestao/leads, que só responde para a equipe.

export default function Leads() {
  return <Suspense fallback={<Esqueleto linhas={5} />}><LeadsComBusca /></Suspense>
}

function LeadsComBusca() {
  const params = useSearchParams()
  const q = params.get('q') || ''
  const periodo = usePeriodo()
  return <ListaLeads key={q + periodo.de + periodo.ate} q={q} periodo={periodo} />
}

function ListaLeads({ q, periodo }) {
  const { de, ate, valido } = periodo
  const router = useRouter()
  const params = useSearchParams()
  const [termo, setTermo] = useState(q)
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)

  const busca = 'de=' + de + '&ate=' + ate + '&q=' + encodeURIComponent(q)
  const { dados, erro, carregando } = useGestao(valido ? '/api/gestao/leads?' + busca + '&pagina=' + pagina : null, tentativa)
  const anteriorDe = valido ? somarDias(de, -diasEntre(de, ate)) : ''
  const anteriorAte = valido ? somarDias(de, -1) : ''
  const anterior = useGestao(valido ? '/api/gestao/leads?de=' + anteriorDe + '&ate=' + anteriorAte : null, tentativa)

  function pesquisar(e) {
    e.preventDefault()
    const proximo = new URLSearchParams(params.toString())
    if (termo.trim()) proximo.set('q', termo.trim())
    else proximo.delete('q')
    router.replace('?' + proximo.toString(), { scroll: false })
  }

  const t = dados?.totais
  const campo =
    'w-full rounded border border-line bg-white px-3 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none'

  return (
    <section aria-label="Leads da VS grátis">
      <CabecalhoPagina titulo="Leads da VS grátis" texto="Quem pediu a VS grátis no site, no horário de Brasília. O link do Instagram (Drive) não passa por aqui." comPeriodo />

      <form onSubmit={pesquisar} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 basis-60">
          <span className="text-[13px] text-ink-muted">Nome, e-mail ou WhatsApp</span>
          <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} maxLength={254}
            placeholder="Busque com pelo menos 2 caracteres" className={campo + ' mt-1 min-h-[44px]'} />
        </label>
        <button type="submit" className="btn-quiet min-h-[44px]">Buscar</button>
        {valido && <BaixarPlanilha href={'/api/gestao/leads/csv?' + busca} />}
      </form>
      {q && <p className="mt-3 break-all text-[14px] text-ink-muted">Busca: {q}. Os cartões e a planilha incluem todos os leads do período.</p>}
      {!valido && <p role="alert" className="mt-3 text-[14px] text-signal-deep">{periodo.erro}</p>}

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        valido && <Esqueleto linhas={5} />
      ) : (
        <div className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi rotulo="Cadastros" valor={numero(t.cadastros)} variacao={anterior.dados ? variacao(t.cadastros, anterior.dados.totais.cadastros) : null} />
            <Kpi rotulo="Baixaram" valor={numero(t.baixaram)} variacao={anterior.dados ? variacao(t.baixaram, anterior.dados.totais.baixaram) : null} />
            <Kpi rotulo="Compraram" valor={numero(t.compraram)} variacao={anterior.dados ? variacao(t.compraram, anterior.dados.totais.compraram) : null} />
            <Kpi rotulo="Lead → compra" valor={String(t.taxa_conversao).replace('.', ',') + '%'} variacao={anterior.dados ? variacao(t.taxa_conversao, anterior.dados.totais.taxa_conversao) : null} />
          </div>

          <FunilLeads de={de} ate={ate} tentativa={tentativa} />

          {dados.itens.length === 0 ? (
            <Vazio titulo="Nenhum lead no período" texto="Quem preencher o formulário de /vs-gratis aparece aqui." />
          ) : (
            <>
              <LeadsLista itens={dados.itens} onMudou={() => setTentativa((n) => n + 1)} />
              <Paginacao pagina={pagina} porPagina={dados.por_pagina} total={dados.total_itens} onIr={setPagina} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
