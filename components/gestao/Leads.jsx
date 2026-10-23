'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGestao } from './useGestao'
import Segmentos from './Segmentos'
import { Aviso, Esqueleto, Vazio, Paginacao, BaixarPlanilha } from './Estados'
import { ATALHOS, intervaloDoAtalho, dataHora, numero } from './formato'

// Aba Leads: quem pediu a VS grátis em /vs-gratis, se baixou e se comprou depois.
// Os dados vêm de /api/gestao/leads, que só responde para a equipe.

function Total({ rotulo, valor, detalhe }) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink">{valor}</dd>
      {detalhe && <dd className="figs mt-0.5 text-[13px] text-ink-muted">{detalhe}</dd>}
    </div>
  )
}

const sim = (v) => (v ? 'Sim' : 'Não')
const origemTexto = (l) => [l.origem, l.meio, l.campanha].filter(Boolean).join(' / ') || 'Direto'

export default function Leads() {
  return <Suspense fallback={<Esqueleto linhas={5} />}><LeadsComBusca /></Suspense>
}

function LeadsComBusca() {
  const params = useSearchParams()
  const q = params.get('q') || ''
  return <ListaLeads key={q} q={q} />
}

function ListaLeads({ q }) {
  const inicial = intervaloDoAtalho('30d')
  const [atalho, setAtalho] = useState('30d')
  const [de, setDe] = useState(inicial.de)
  const [ate, setAte] = useState(inicial.ate)
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)

  const valido = /^\d{4}-\d{2}-\d{2}$/.test(de) && /^\d{4}-\d{2}-\d{2}$/.test(ate) && de <= ate
  const busca = 'de=' + de + '&ate=' + ate + '&q=' + encodeURIComponent(q)
  const { dados, erro, carregando } = useGestao(valido ? '/api/gestao/leads?' + busca + '&pagina=' + pagina : null, tentativa)

  function aplicar(novoDe, novoAte) {
    setDe(novoDe)
    setAte(novoAte)
    setPagina(1)
  }

  const t = dados?.totais
  const campo =
    'w-full rounded border border-line bg-white px-3 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none'

  return (
    <section aria-labelledby="titulo-leads" className="mt-8">
      <h2 id="titulo-leads" className="text-[17px] font-bold text-ink">
        Leads da VS grátis
      </h2>
      <p className="mt-1 text-[14px] text-ink-muted">
        Quem pediu a VS grátis no site, no horário de Brasília. O link do Instagram (Drive) não passa por aqui.
      </p>

      {q && <p className="mt-3 break-all text-[14px] text-ink-muted">Busca: {q}. A planilha inclui todos os leads do período.</p>}
      <div className="mt-5 space-y-4">
        <Segmentos
          opcoes={ATALHOS}
          valor={atalho}
          onEscolher={(id) => {
            const r = intervaloDoAtalho(id)
            setAtalho(id)
            aplicar(r.de, r.ate)
          }}
          rotulo="Atalhos de período"
        />
        <div className="flex flex-wrap items-end gap-3">
          <label className="block w-[calc(50%-6px)] sm:w-44">
            <span className="text-[13px] text-ink-muted">De</span>
            <input type="date" value={de} max={ate || undefined} className={campo + ' mt-1'}
              onChange={(e) => { setAtalho(''); aplicar(e.target.value, ate) }} />
          </label>
          <label className="block w-[calc(50%-6px)] sm:w-44">
            <span className="text-[13px] text-ink-muted">Até</span>
            <input type="date" value={ate} min={de || undefined} className={campo + ' mt-1'}
              onChange={(e) => { setAtalho(''); aplicar(de, e.target.value) }} />
          </label>
          <div className="sm:ml-auto">{valido && <BaixarPlanilha href={'/api/gestao/leads/csv?' + busca} />}</div>
        </div>
        {!valido && (
          <p role="alert" className="text-[14px] text-signal-deep">
            A data inicial precisa ser igual ou anterior à final.
          </p>
        )}
      </div>

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        valido && <Esqueleto linhas={5} />
      ) : (
        <div className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-4">
            <Total rotulo="Cadastros" valor={numero(t.cadastros)} />
            <Total rotulo="Baixaram" valor={numero(t.baixaram)} />
            <Total rotulo="Compraram" valor={numero(t.compraram)} />
            <Total rotulo="Lead → compra" valor={String(t.taxa_conversao).replace('.', ',') + '%'} />
          </dl>

          {dados.itens.length === 0 ? (
            <Vazio titulo="Nenhum lead no período" texto="Quem preencher o formulário de /vs-gratis aparece aqui." />
          ) : (
            <>
              <div className="mt-6 hidden rounded border border-line bg-white xl:block">
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
                      <th scope="col" className="px-4 py-3 font-semibold">Nome</th>
                      <th scope="col" className="px-4 py-3 font-semibold">E-mail</th>
                      <th scope="col" className="px-4 py-3 font-semibold">WhatsApp</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Origem</th>
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
                        <td className="figs px-4 py-3 text-ink">{l.whatsapp}</td>
                        <td className="px-4 py-3 text-ink-muted">{origemTexto(l)}</td>
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
                  <p className="text-[14px]">{l.whatsapp}</p>
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
