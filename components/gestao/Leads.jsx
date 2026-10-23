'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGestao } from './useGestao'
import { usePeriodo } from './usePeriodo'
import { CabecalhoPagina } from './Casca'
import Kpi, { variacao } from './Kpi'
import { celular } from './whatsappUtil'
import { Aviso, Esqueleto, Vazio, Paginacao, BaixarPlanilha } from './Estados'
import { dataHora, numero, diasEntre, somarDias } from './formato'

// Aba Leads: quem pediu a VS grátis em /vs-gratis, se baixou e se comprou depois.
// Os dados vêm de /api/gestao/leads, que só responde para a equipe.

const sim = (v) => (v ? 'Sim' : 'Não')
const origemTexto = (l) => [l.origem, l.meio, l.campanha].filter(Boolean).join(' / ') || 'Direto'

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

          {dados.itens.length === 0 ? (
            <Vazio titulo="Nenhum lead no período" texto="Quem preencher o formulário de /vs-gratis aparece aqui." />
          ) : (
            <>
              <div className="mt-6 hidden rounded border border-line bg-white xl:block">
                <table className="w-full table-fixed break-words text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
                      <th scope="col" className="px-4 py-3 font-semibold">Nome</th>
                      <th scope="col" className="px-4 py-3 font-semibold">E-mail</th>
                      <th scope="col" className="px-4 py-3 font-semibold">WhatsApp</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Origem</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Página de entrada</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Data</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Baixou?</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Comprou?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dados.itens.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-3 font-semibold text-ink">
                          {l.nome}
                          {l.descadastrado && <span className="block text-[12.5px] font-normal text-ink-muted">descadastrado</span>}
                        </td>
                        <td className="break-all px-4 py-3 text-ink">{l.email}</td>
                        <td className="figs px-4 py-3 text-ink">{celular(l.whatsapp)}</td>
                        <td className="px-4 py-3 text-ink-muted">{origemTexto(l)}</td>
                        <td className="break-all px-4 py-3 text-ink-muted">{l.pagina_entrada || '—'}</td>
                        <td className="figs px-4 py-3 text-ink-muted">{dataHora(l.criado_em)}</td>
                        <td className="px-4 py-3 text-ink">{sim(l.primeiro_download_em)}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{sim(l.comprou)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-6 divide-y divide-line rounded border border-line bg-white xl:hidden">
                {dados.itens.map((l) => <li key={l.id} className="space-y-2 break-words p-4">
                  <p className="font-semibold">{l.nome}</p>
                  <p className="break-all text-[14px]">{l.email}</p>
                  <p className="text-[14px]">{celular(l.whatsapp)}</p>
                  <p className="break-all text-[13px] text-ink-muted">Entrada: {l.pagina_entrada || '—'}</p>
                  <p className="text-[13px] text-ink-muted">{origemTexto(l)} · {dataHora(l.criado_em)}</p>
                  <p className="text-[14px]">Baixou: {sim(l.primeiro_download_em)} · Comprou: {sim(l.comprou)}</p>
                  {l.descadastrado && <p className="text-[13px] text-ink-muted">Descadastrado</p>}
                </li>)}
              </ul>
              <Paginacao pagina={pagina} porPagina={dados.por_pagina} total={dados.total_itens} onIr={setPagina} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
