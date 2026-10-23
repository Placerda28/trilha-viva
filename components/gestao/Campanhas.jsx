'use client'

import { useState } from 'react'
import { CabecalhoPagina } from './Casca'
import { Aviso, Esqueleto, Vazio } from './Estados'
import { moeda, numero } from './formato'
import { useGestao } from './useGestao'
import { usePeriodo } from './usePeriodo'

const COLUNAS = ['Leads', 'Carrinhos', 'Vendas', 'Faturamento', 'Carrinho → venda']
const SEM_REGISTRO = { registrado: false, leads: 0, carrinhos: 0, vendas: 0, centavos: 0, conversao: 0, anuncios: [] }
const nome = (l) => !l.registrado ? 'Sem registro (antes de 12/10)' : l.campanha || 'Sem campanha'
const valores = (l) => [
  l.leads == null ? '—' : numero(l.leads),
  numero(l.carrinhos), numero(l.vendas), moeda(l.centavos),
  l.conversao == null ? '—' : numero(l.conversao) + '%',
]

function Metricas({ linha }) {
  return <dl className="grid grid-cols-2 gap-3 text-sm">
    {valores(linha).map((v, i) => <div key={COLUNAS[i]}>
      <dt className="text-[13px] text-ink-muted">{COLUNAS[i]}</dt>
      <dd className="figs break-words font-semibold">{v}</dd>
    </div>)}
  </dl>
}

function LinhaCampanha({ linha: l }) {
  const [aberta, setAberta] = useState(false)
  return <>
    <tr className="border-t border-line align-top">
      <th scope="row" className="break-all px-4 py-3 text-left font-normal">
        {l.anuncios.length ? <button type="button" aria-expanded={aberta} onClick={() => setAberta(!aberta)} className="min-h-11 text-left font-semibold underline decoration-line underline-offset-4">
          {nome(l)} <span aria-hidden="true">{aberta ? '−' : '+'}</span>
        </button> : <span className="font-semibold">{nome(l)}</span>}
        {l.registrado && <span className="block text-[13px] text-ink-muted">{l.fonte || 'Direto'}</span>}
      </th>
      {valores(l).map((v, i) => <td key={COLUNAS[i]} className="figs px-3 py-4 text-right">{v}</td>)}
    </tr>
    {aberta && l.anuncios.map((a, i) => <tr key={i} className="border-t border-line bg-paper/50 text-[13px]">
      <th scope="row" className="break-all px-4 py-3 text-left font-normal">Anúncio: {a.anuncio || 'Sem anúncio'}</th>
      {valores(a).map((v, j) => <td key={COLUNAS[j]} className="figs px-3 py-3 text-right">{v}</td>)}
    </tr>)}
  </>
}

function CartaoCampanha({ linha: l }) {
  return <li className="space-y-3 p-4">
    <div className="break-all"><h2 className="font-semibold">{nome(l)}</h2>
      {l.registrado && <p className="text-[13px] text-ink-muted">{l.fonte || 'Direto'}</p>}
    </div>
    <Metricas linha={l} />
    {l.anuncios.length > 0 && <details>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Ver anúncios ({numero(l.anuncios.length)})</summary>
      <ul className="space-y-4 border-t border-line pt-3">
        {l.anuncios.map((a, i) => <li key={i} className="space-y-2">
          <h3 className="break-all text-sm font-semibold">{a.anuncio || 'Sem anúncio'}</h3><Metricas linha={a} />
        </li>)}
      </ul>
    </details>}
  </li>
}

export default function Campanhas() {
  const periodo = usePeriodo()
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro, carregando } = useGestao(periodo.valido ? '/api/gestao/campanhas?de=' + periodo.de + '&ate=' + periodo.ate : null, tentativa)
  const linhas = dados ? [...dados.linhas.filter((l) => l.registrado), ...dados.linhas.filter((l) => !l.registrado)] : []
  if (dados && !linhas.some((l) => !l.registrado)) linhas.push(SEM_REGISTRO)
  return <section>
    <CabecalhoPagina titulo="Campanhas" texto="O que cada fonte, campanha e anúncio trouxe no período." comPeriodo />
    {!periodo.valido ? <Aviso erro={periodo.erro} /> : erro ? <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} /> : !dados ? <Esqueleto /> : <div aria-busy={carregando} className={carregando ? 'opacity-60' : ''}>
      {dados.linhas.length === 0 && <Vazio titulo="Nenhuma campanha no período" texto="Leads, carrinhos e vendas aparecem aqui com a origem registrada." />}
      <p className="mb-4 text-[13px] text-ink-muted">Carrinho → venda conta os carrinhos que foram pagos. Leads e conversão por anúncio não estão disponíveis. A lista de campanhas pode ser parcial; o total de vendas e faturamento inclui todo o período.</p>
      <div className="hidden rounded-md border border-line bg-white xl:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-paper/60 text-[12.5px] text-ink-muted"><tr>
            <th scope="col" className="w-[30%] px-4 py-3 text-left font-semibold">Campanha / fonte</th>
            {COLUNAS.map((c) => <th key={c} scope="col" className="px-3 py-3 text-right font-semibold">{c}</th>)}
          </tr></thead>
          <tbody>{linhas.map((l) => <LinhaCampanha key={JSON.stringify([l.registrado, l.fonte, l.campanha])} linha={l} />)}</tbody>
          <tfoot className="border-t border-line bg-paper/60 font-semibold"><tr>
            <th scope="row" className="px-4 py-4 text-left">Total</th>
            {valores(dados.total).map((v, i) => <td key={COLUNAS[i]} className="figs px-3 py-4 text-right">{v}</td>)}
          </tr></tfoot>
        </table>
      </div>
      <ul className="divide-y divide-line rounded-md border border-line bg-white xl:hidden">
        {linhas.map((l) => <CartaoCampanha key={JSON.stringify([l.registrado, l.fonte, l.campanha])} linha={l} />)}
        <li className="space-y-3 bg-paper/60 p-4"><h2 className="font-semibold">Total</h2><Metricas linha={dados.total} /></li>
      </ul>
    </div>}
  </section>
}
